import Tesseract from 'tesseract.js';
import Quagga from 'quagga';

export interface AnalysisResult {
  barcodes: string[];
  text: string;
  numbers: string[];
  success: boolean;
  error?: string;
}

export class ImageAnalysisService {

  // Analyser une image pour extraire codes-barres et texte
  static async analyzeImage(imageFile: File): Promise<AnalysisResult> {
    try {
      const result: AnalysisResult = {
        barcodes: [],
        text: '',
        numbers: [],
        success: false
      };

      // Créer une URL pour l'image
      const imageUrl = URL.createObjectURL(imageFile);

      // Analyser en parallèle : OCR et lecture de codes-barres
      const [ocrResult, barcodeResult] = await Promise.allSettled([
        this.performOCR(imageUrl),
        this.scanBarcodes(imageUrl)
      ]);

      // Traiter les résultats codes-barres (PRIORITÉ)
      if (barcodeResult.status === 'fulfilled') {
        result.barcodes = barcodeResult.value;
      }

      // Traiter les résultats OCR (SECONDAIRE)
      if (ocrResult.status === 'fulfilled') {
        result.text = ocrResult.value.text;
        result.numbers = ocrResult.value.numbers;
      }

      // Nettoyer l'URL
      URL.revokeObjectURL(imageUrl);

      // Déterminer le succès (prioriser les codes-barres)
      result.success = result.barcodes.length > 0 || result.numbers.length > 0 || result.text.length > 10;

      // Si on a des codes-barres QuaggaJS, on privilégie totalement
      if (result.barcodes.length > 0) {
        // Garder seulement les codes-barres, ignorer les numéros OCR potentiellement faux
        result.numbers = [];
      }

      return result;

    } catch (error) {
      return {
        barcodes: [],
        text: '',
        numbers: [],
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // OCR avec Tesseract.js
  private static async performOCR(imageUrl: string): Promise<{ text: string; numbers: string[] }> {
    try {
      // Configuration OCR optimisée pour les codes-barres et numéros
      const { data: { text } } = await Tesseract.recognize(
        imageUrl,
        'eng', // Anglais pour les chiffres (plus performant que français)
        {
          tessedit_char_whitelist: '0123456789 ', // Seulement chiffres et espaces
          tessedit_pageseg_mode: '6' // Bloc de texte uniforme
        }
      );

      // Extraire les numéros de carte potentiels
      const numbers = this.extractCardNumbers(text);

      return { text, numbers };

    } catch (error) {
      throw error;
    }
  }

  // Scanner les codes-barres avec QuaggaJS
  private static async scanBarcodes(imageUrl: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = () => {
          // Créer un canvas pour QuaggaJS
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // Configuration QuaggaJS optimisée
          Quagga.decodeSingle({
            src: canvas,
            numOfWorkers: 0,
            inputStream: {
              size: 1200, // Plus haute résolution
              constraints: {
                width: 1280,
                height: 720
              }
            },
            locator: {
              patchSize: "large", // Meilleure détection
              halfSample: false   // Pas de sous-échantillonnage
            },
            decoder: {
              readers: [
                "ean_reader",      // EAN-13 (priorité)
                "ean_8_reader",    // EAN-8
                "upc_reader",      // UPC
                "code_128_reader", // Code 128
                "upc_e_reader",    // UPC-E
                "code_39_reader",  // Code 39
                "i2of5_reader",    // Interleaved 2 of 5
                "codabar_reader"   // Codabar
              ]
            },
            locate: true,
            multiple: false
          }, (result) => {
            if (result && result.codeResult) {
              resolve([result.codeResult.code]);
            } else {
              resolve([]);
            }
          });
        };

        img.onerror = () => {
          reject(new Error('Impossible de charger l\'image'));
        };

        img.src = imageUrl;

        // Timeout de 10 secondes
        setTimeout(() => {
          resolve([]);
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Extraire les numéros de carte du texte OCR
  private static extractCardNumbers(text: string): string[] {
    const numbers: string[] = [];

    // Patterns pour différents types de numéros de carte
    const patterns = [
      /\b\d{13,19}\b/g, // Longs (13-19 chiffres)
      /\b\d{8,12}\b/g, // Moyens (8-12 chiffres)
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Format 4-4-4-4
      /\b\d{4}[\s-]?\d{6}[\s-]?\d{5}\b/g, // Format Amex
      /\d{8,}/g, // Tous chiffres consécutifs
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleanNumber = match.replace(/[\s-]/g, '');
          if (cleanNumber.length >= 8 && !numbers.includes(cleanNumber)) {
            numbers.push(cleanNumber);
          }
        });
      }
    });

    // Chercher aussi les numéros après des mots-clés
    const keywords = ['carte', 'card', 'number', 'numéro', 'n°', 'num', 'client', 'member', 'code'];
    keywords.forEach(keyword => {
      const regex = new RegExp(`${keyword}[^\\d]*([\\d\\s-]{8,20})`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        matches.forEach(match => {
          const numberPart = match.replace(/[^\d\s-]/g, '').replace(/[\s-]/g, '');
          if (numberPart.length >= 8 && !numbers.includes(numberPart)) {
            numbers.push(numberPart);
          }
        });
      }
    });

    // Extraction brute de TOUS les chiffres (dernière chance)
    const allDigits = text.replace(/\D/g, '');
    if (allDigits.length >= 8) {
      // Essayer de découper en segments significatifs
      for (let start = 0; start <= allDigits.length - 8; start++) {
        for (let len = 19; len >= 8; len--) {
          if (start + len <= allDigits.length) {
            const segment = allDigits.substring(start, start + len);
            if (!numbers.includes(segment)) {
              numbers.push(segment);
              break; // Prendre le plus long segment à chaque position
            }
          }
        }
      }
    }

    // Si on a des codes-barres QuaggaJS, les prioriser absolument
    if (numbers.length > 0) {
      // Choisir le meilleur numéro automatiquement  
      const bestNumber = this.selectBestNumber(numbers);

      // Retourner le meilleur + jusqu'à 2 alternatives pour choix manuel
      const alternatives = numbers.filter(n => n !== bestNumber).slice(0, 2);
      return bestNumber ? [bestNumber, ...alternatives] : numbers.slice(0, 3);
    }

    return numbers;
  }

  // Sélectionner le meilleur numéro parmi ceux détectés
  private static selectBestNumber(numbers: string[]): string | null {
    if (numbers.length === 0) return null;
    if (numbers.length === 1) return numbers[0];

    // Scores pour chaque numéro
    const scored = numbers.map(num => {
      let score = 0;
      const len = num.length;

      // FORTE priorité pour longueurs de codes-barres standards
      if (len === 13) score += 20; // EAN-13 (très commun)
      else if (len === 12) score += 18; // UPC
      else if (len === 8) score += 15; // EAN-8
      else if (len >= 10 && len <= 14) score += 10; // Autres standards
      else if (len > 19) score -= 20; // Beaucoup trop long
      else if (len < 6) score -= 15; // Trop court

      // Malus FORT pour répétitions excessives (000000...)
      const uniqueDigits = new Set(num).size;
      if (uniqueDigits <= 2) score -= 25; // Très suspect
      else if (uniqueDigits <= 3) score -= 15; // Suspect  
      else if (uniqueDigits <= 4) score -= 8; // Un peu suspect
      else score += 5; // Bonne diversité

      // Bonus pour numéros qui ne commencent pas par 0
      if (num[0] !== '0') score += 5;

      // FORTE pénalité pour numéros qui se terminent par beaucoup de 0
      const trailingZeros = num.match(/0*$/)?.[0]?.length || 0;
      if (trailingZeros > 5) score -= 20;
      else if (trailingZeros > 3) score -= 10;

      // Bonus pour patterns typiques de codes-barres
      if (/^[1-9]\d{11,12}$/.test(num)) score += 10; // Pattern EAN/UPC
      if (/^[0-9]{13}$/.test(num) && num[0] !== '0') score += 8; // EAN-13 valide

      return { number: num, score };
    });

    // Trier par score décroissant
    scored.sort((a, b) => b.score - a.score);

    return scored[0].number;
  }

  // Formater les résultats pour l'affichage
  static formatResults(result: AnalysisResult): string {
    const parts: string[] = [];

    if (result.barcodes.length > 0) {
      parts.push(`📊 Code-barre: ${result.barcodes[0]}`);
    }

    if (result.numbers.length > 0) {
      parts.push(`🔢 Numéro: ${result.numbers[0]}`);
    }

    if (parts.length === 0 && result.text) {
      const shortText = result.text.substring(0, 50);
      parts.push(`📄 Texte: ${shortText}...`);
    }

    return parts.join('\n') || 'Aucune information détectée';
  }
} 