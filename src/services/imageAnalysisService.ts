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
        console.log('✅ OCR terminé:', result.text);
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

      const { data: { text } } = await Tesseract.recognize(
        imageUrl,
        'fra', // Français
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      // Extraire les numéros de carte potentiels
      const numbers = this.extractCardNumbers(text);

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

    // Patterns pour différents types de numéros de carte
    const patterns = [
      /\b\d{13,19}\b/g, // Numéros de carte standards (13-19 chiffres)
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Format 4-4-4-4
      /\b\d{4}[\s-]?\d{6}[\s-]?\d{5}\b/g, // Format Amex
      /\b\d{10,12}\b/g, // Numéros plus courts
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
    const keywords = ['carte', 'card', 'number', 'numéro', 'n°', 'num', 'client', 'member'];
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