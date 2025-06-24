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
      console.log('🔍 DEBUT ANALYSE IMAGE:', imageFile.name, imageFile.size, 'bytes');

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
        console.log('📊 CODES-BARRES QUAGGAJS:', result.barcodes);
      } else {
        console.log('❌ QUAGGAJS ERREUR:', barcodeResult.reason);
      }

      // Traiter les résultats OCR (SECONDAIRE)
      if (ocrResult.status === 'fulfilled') {
        result.text = ocrResult.value.text;
        result.numbers = ocrResult.value.numbers;
        console.log('📝 TEXTE OCR BRUT:', result.text.substring(0, 200));
        console.log('🔢 NUMEROS OCR DETECTES:', result.numbers);
      } else {
        console.log('❌ OCR ERREUR:', ocrResult.reason);
      }

      // Nettoyer l'URL
      URL.revokeObjectURL(imageUrl);

      // Déterminer le succès (prioriser les codes-barres)
      result.success = result.barcodes.length > 0 || result.numbers.length > 0 || result.text.length > 10;

      // Si on a des codes-barres QuaggaJS, on privilégie totalement
      if (result.barcodes.length > 0) {
        console.log('🎯 CODES-BARRES DETECTES - Ignorant OCR');
        // Garder seulement les codes-barres, ignorer les numéros OCR potentiellement faux
        result.numbers = [];
      } else {
        console.log('⚠️ AUCUN CODE-BARRE - Utilisation OCR seulement');
      }

      console.log('✅ RESULTAT FINAL:', result);
      return result;

    } catch (error) {
      console.log('💥 ERREUR ANALYSE GLOBALE:', error);
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
    // Configuration OCR optimisée pour les codes-barres et numéros
    const { data: { text } } = await Tesseract.recognize(
      imageUrl,
      'eng', // Anglais pour les chiffres (plus performant que français)
      {
        // Configuration optimisée pour les numéros
      }
    );

    // Extraire les numéros de carte potentiels
    const numbers = this.extractCardNumbers(text);

    return { text, numbers };
  }

  // Scanner les codes-barres avec QuaggaJS
  private static async scanBarcodes(imageUrl: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      try {
        console.log('📊 DEBUT SCAN QUAGGAJS...');
        const img = new Image();
        img.onload = () => {
          console.log('🖼️ IMAGE CHARGEE:', img.width, 'x', img.height);

          // Créer un canvas amélioré pour QuaggaJS
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          // BEAUCOUP plus de résolution pour améliorer la détection
          const scale = Math.max(2, 1600 / Math.min(img.width, img.height));
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          // Améliorer l'image avec plus de contraste
          ctx.scale(scale, scale);
          ctx.imageSmoothingEnabled = false; // Pas de lissage
          ctx.filter = 'contrast(150%) brightness(110%)'; // Améliorer contraste
          ctx.drawImage(img, 0, 0);

          console.log('🎨 CANVAS AMELIORE:', canvas.width, 'x', canvas.height, 'scale:', scale);

          // NOUVELLES configurations QuaggaJS - beaucoup plus de formats
          const configs = [
            {
              name: 'HighRes-AllFormats',
              config: {
                src: canvas,
                numOfWorkers: 0,
                inputStream: {
                  size: Math.max(canvas.width, canvas.height),
                  singleChannel: false
                },
                locator: {
                  patchSize: "large" as const,
                  halfSample: false
                },
                decoder: {
                  readers: [
                    "ean_reader",           // EAN-13, EAN-8
                    "ean_8_reader",         // EAN-8 spécifique  
                    "upc_reader",           // UPC-A, UPC-E
                    "code_128_reader",      // Code 128
                    "code_39_reader",       // Code 39
                    "code_39_vin_reader",   // Code 39 VIN
                    "codabar_reader",       // Codabar
                    "i2of5_reader",         // Interleaved 2 of 5
                    "2of5_reader",          // Standard 2 of 5
                    "code_93_reader"        // Code 93
                  ]
                }
              }
            },
            {
              name: 'LowRes-EAN',
              config: {
                src: canvas,
                numOfWorkers: 0,
                inputStream: {
                  size: 800,
                  singleChannel: true
                },
                locator: {
                  patchSize: "large" as const,
                  halfSample: true
                },
                decoder: {
                  readers: ["ean_reader", "upc_reader"]
                }
              }
            },
            {
              name: 'HighContrast-Code128',
              config: {
                src: canvas,
                numOfWorkers: 0,
                inputStream: {
                  size: 1200,
                  singleChannel: false
                },
                locator: {
                  patchSize: "large" as const,
                  halfSample: false
                },
                decoder: {
                  readers: ["code_128_reader", "code_39_reader", "i2of5_reader"]
                }
              }
            }
          ];

          let attempts = 0;
          const tryNext = () => {
            if (attempts >= configs.length) {
              console.log('❌ TOUTES LES CONFIGS QUAGGAJS ONT ECHOUE');
              resolve([]);
              return;
            }

            const { name, config } = configs[attempts];
            console.log(`🔄 TENTATIVE ${attempts + 1}: ${name}`);

            Quagga.decodeSingle(config, (result) => {
              console.log(`🔍 QUAGGAJS ${name} RESULTAT:`, result);
              if (result && result.codeResult) {
                console.log(`✅ CODE-BARRE DETECTE (${name}):`, result.codeResult.code);
                console.log('📊 FORMAT:', result.codeResult.format);
                resolve([result.codeResult.code]);
              } else {
                attempts++;
                setTimeout(tryNext, 1000); // Plus de délai entre tentatives
              }
            });
          };

          tryNext();
        };

        img.onerror = () => {
          console.log('❌ ERREUR CHARGEMENT IMAGE');
          reject(new Error('Impossible de charger l\'image'));
        };

        img.src = imageUrl;

        // Timeout encore plus long pour les multiples tentatives
        setTimeout(() => {
          console.log('⏰ TIMEOUT QUAGGAJS (20s)');
          resolve([]);
        }, 20000);

      } catch (error) {
        console.log('💥 ERREUR QUAGGAJS GLOBALE:', error);
        reject(error);
      }
    });
  }

  // Extraire les numéros de carte du texte OCR
  private static extractCardNumbers(text: string): string[] {
    const numbers: string[] = [];

    // Nettoyer d'abord les erreurs OCR courantes
    const cleanedText = this.fixOCRErrors(text);

    // Patterns pour différents types de numéros de carte
    const patterns = [
      /\b\d{13,19}\b/g, // Longs (13-19 chiffres)
      /\b\d{8,12}\b/g, // Moyens (8-12 chiffres)
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Format 4-4-4-4
      /\b\d{4}[\s-]?\d{6}[\s-]?\d{5}\b/g, // Format Amex
      /\d{8,}/g, // Tous chiffres consécutifs
    ];

    patterns.forEach(pattern => {
      const matches = cleanedText.match(pattern);
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
      const matches = cleanedText.match(regex);
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
    const allDigits = cleanedText.replace(/\D/g, '');
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

  // Corriger les erreurs OCR courantes (lettres/chiffres confondus)
  private static fixOCRErrors(text: string): string {
    return text
      // Corrections lettres → chiffres (ordre important)
      .replace(/[O]/g, '0')      // O → 0
      .replace(/[I|l]/g, '1')    // I, l → 1  
      .replace(/[Z]/g, '2')      // Z → 2
      .replace(/[S]/g, '5')      // S → 5
      .replace(/[G]/g, '6')      // G → 6
      .replace(/[T]/g, '7')      // T → 7
      .replace(/[B]/g, '8')      // B → 8
      .replace(/[g]/g, '9')      // g → 9
      // Corrections contextuelles pour cartes
      .replace(/[U]/g, '0')      // U → 0 (erreur courante)
      .replace(/[W]/g, '0')      // W → 0 (erreur courante) 
      .replace(/[A]/g, '4')      // A → 4 (erreur courante)
      // Nettoyer espaces multiples
      .replace(/\s+/g, ' ');
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
      if (len === 13) score += 25; // EAN-13 (très commun cartes fidélité)
      else if (len === 12) score += 22; // UPC
      else if (len === 8) score += 20; // EAN-8
      else if (len === 10 || len === 11) score += 18; // Autres standards courts
      else if (len === 14 || len === 15) score += 15; // Standards moyens
      else if (len >= 16 && len <= 19) score += 12; // Standards longs
      else if (len > 20) score -= 25; // Beaucoup trop long
      else if (len < 6) score -= 20; // Trop court

      // Malus TRÈS FORT pour répétitions excessives (000000...)
      const uniqueDigits = new Set(num).size;
      if (uniqueDigits <= 2) score -= 30; // Très suspect
      else if (uniqueDigits <= 3) score -= 20; // Suspect  
      else if (uniqueDigits <= 4) score -= 12; // Un peu suspect
      else if (uniqueDigits >= 8) score += 8; // Très bonne diversité
      else if (uniqueDigits >= 6) score += 5; // Bonne diversité

      // FORT bonus pour numéros qui ne commencent pas par 0 (sauf EAN valides)
      if (num[0] !== '0') score += 8;
      else if (len === 13 || len === 8) score += 3; // EAN peut commencer par 0

      // FORTE pénalité pour numéros qui se terminent par beaucoup de 0
      const trailingZeros = num.match(/0*$/)?.[0]?.length || 0;
      if (trailingZeros > 6) score -= 25;
      else if (trailingZeros > 4) score -= 15;
      else if (trailingZeros > 2) score -= 8;

      // Bonus pour patterns typiques de codes-barres cartes fidélité
      if (/^[1-9]\d{12}$/.test(num)) score += 15; // EAN-13 commençant par 1-9
      if (/^[1-9]\d{11}$/.test(num)) score += 13; // UPC commençant par 1-9
      if (/^[3-9]\d{7}$/.test(num)) score += 12; // EAN-8 commençant par 3-9

      // Malus pour patterns suspects
      if (/^(\d)\1{7,}$/.test(num)) score -= 35; // Même chiffre répété
      if (/^12345/.test(num) || /56789/.test(num)) score -= 20; // Séquences
      if (/00000/.test(num)) score -= 15; // Trop de zéros consécutifs

      // Bonus pour marques françaises courantes (patterns connus)
      if (/^3[0-9]{12}$/.test(num)) score += 12; // EAN-13 français (3...)
      if (/^20[0-9]{11}$/.test(num)) score += 10; // Format 20... (magasins)
      if (/^[4-6][0-9]{12}$/.test(num)) score += 8; // Autres codes européens

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