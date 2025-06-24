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
      console.log('🔍 Début de l\'analyse de l\'image...');

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

      // Traiter les résultats OCR
      if (ocrResult.status === 'fulfilled') {
        result.text = ocrResult.value.text;
        result.numbers = ocrResult.value.numbers;
        console.log('✅ OCR terminé - TEXTE BRUT:');
        console.log('   📄 Texte détecté:', result.text);
        console.log('   🔢 Numéros extraits:', result.numbers);
        console.log('   📏 Longueur texte:', result.text.length);
      } else {
        console.warn('⚠️ Erreur OCR:', ocrResult.reason);
      }

      // Traiter les résultats codes-barres
      if (barcodeResult.status === 'fulfilled') {
        result.barcodes = barcodeResult.value;
        console.log('✅ Scan codes-barres terminé:', result.barcodes);
      } else {
        console.warn('⚠️ Erreur scan codes-barres:', barcodeResult.reason);
      }

      // Nettoyer l'URL
      URL.revokeObjectURL(imageUrl);

      // Déterminer le succès
      result.success = result.barcodes.length > 0 || result.numbers.length > 0 || result.text.length > 10;

      console.log('🎯 Analyse terminée:', result);
      return result;

    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse:', error);
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
      console.log('📖 Début OCR...');

      // Configuration OCR optimisée pour les codes-barres et numéros
      const { data: { text } } = await Tesseract.recognize(
        imageUrl,
        'eng', // Anglais pour les chiffres (plus performant que français)
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
          tessedit_char_whitelist: '0123456789 ', // Seulement chiffres et espaces
          tessedit_pageseg_mode: '6' // Bloc de texte uniforme
        }
      );

      console.log('🔍 OCR ANALYSE DETAILLEE:');
      console.log('   📄 Texte brut:', JSON.stringify(text));
      console.log('   📏 Longueur:', text.length);

      // Extraire les numéros de carte potentiels
      const numbers = this.extractCardNumbers(text);
      console.log('   🎯 Numéros finaux extraits:', numbers);

      return { text, numbers };

    } catch (error) {
      console.error('❌ Erreur OCR:', error);
      throw error;
    }
  }

  // Scanner les codes-barres avec QuaggaJS
  private static async scanBarcodes(imageUrl: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      try {
        console.log('📊 Début scan codes-barres...');

        const img = new Image();
        img.onload = () => {
          // Créer un canvas pour QuaggaJS
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // Configuration QuaggaJS
          Quagga.decodeSingle({
            src: canvas,
            numOfWorkers: 0,
            inputStream: {
              size: 800
            },
            locator: {
              patchSize: "medium",
              halfSample: true
            },
            decoder: {
              readers: [
                "code_128_reader",
                "ean_reader",
                "ean_8_reader",
                "code_39_reader",
                "code_39_vin_reader",
                "codabar_reader",
                "upc_reader",
                "upc_e_reader",
                "i2of5_reader"
              ]
            }
          }, (result) => {
            if (result && result.codeResult) {
              console.log('✅ Code-barre détecté:', result.codeResult.code);
              resolve([result.codeResult.code]);
            } else {
              console.log('ℹ️ Aucun code-barre détecté');
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
        console.error('❌ Erreur scan codes-barres:', error);
        reject(error);
      }
    });
  }

  // Extraire les numéros de carte du texte OCR
  private static extractCardNumbers(text: string): string[] {
    const numbers: string[] = [];
    console.log('🔍 EXTRACTION DÉTAILLÉE:');
    console.log('   📄 Texte d\'entrée:', JSON.stringify(text));

    // Patterns pour différents types de numéros de carte (plus agressifs)
    const patterns = [
      { name: 'Longs (13-19 chiffres)', pattern: /\b\d{13,19}\b/g },
      { name: 'Moyens (8-12 chiffres)', pattern: /\b\d{8,12}\b/g },
      { name: 'Format 4-4-4-4', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g },
      { name: 'Format Amex', pattern: /\b\d{4}[\s-]?\d{6}[\s-]?\d{5}\b/g },
      { name: 'Tous chiffres consécutifs', pattern: /\d{8,}/g }, // Plus agressif
    ];

    patterns.forEach(({ name, pattern }) => {
      const matches = text.match(pattern);
      console.log(`   🎯 Pattern "${name}":`, matches);
      if (matches) {
        matches.forEach(match => {
          const cleanNumber = match.replace(/[\s-]/g, '');
          if (cleanNumber.length >= 8 && !numbers.includes(cleanNumber)) {
            numbers.push(cleanNumber);
            console.log(`   ✅ Numéro ajouté: ${cleanNumber} (longueur: ${cleanNumber.length})`);
          }
        });
      }
    });

    // Chercher aussi les numéros après des mots-clés
    const keywords = ['carte', 'card', 'number', 'numéro', 'n°', 'num', 'client', 'member', 'code'];
    console.log('   🔍 Recherche par mots-clés...');
    keywords.forEach(keyword => {
      const regex = new RegExp(`${keyword}[^\\d]*([\\d\\s-]{8,20})`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        console.log(`   🎯 Mot-clé "${keyword}":`, matches);
        matches.forEach(match => {
          const numberPart = match.replace(/[^\d\s-]/g, '').replace(/[\s-]/g, '');
          if (numberPart.length >= 8 && !numbers.includes(numberPart)) {
            numbers.push(numberPart);
            console.log(`   ✅ Numéro ajouté (mot-clé): ${numberPart}`);
          }
        });
      }
    });

    // Extraction brute de TOUS les chiffres (dernière chance)
    const allDigits = text.replace(/\D/g, ''); // Enlever tout sauf chiffres
    console.log('   🔥 Tous les chiffres bruts:', allDigits);
    if (allDigits.length >= 8) {
      // Essayer de découper en segments significatifs
      for (let start = 0; start <= allDigits.length - 8; start++) {
        for (let len = 19; len >= 8; len--) {
          if (start + len <= allDigits.length) {
            const segment = allDigits.substring(start, start + len);
            if (!numbers.includes(segment)) {
              numbers.push(segment);
              console.log(`   ✅ Segment brut ajouté: ${segment}`);
              break; // Prendre le plus long segment à chaque position
            }
          }
        }
      }
    }

    console.log('   🎯 RÉSULTAT FINAL:', numbers);
    return numbers;
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