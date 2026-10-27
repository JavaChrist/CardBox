import Tesseract from 'tesseract.js';
import Quagga from 'quagga';
import jsQR from 'jsqr';

export interface AnalysisResult {
  barcodes: string[];
  qrcodes: string[];
  text: string;
  numbers: string[];
  success: boolean;
  error?: string;
}

export class ImageAnalysisService {

  // Analyser une image pour extraire codes-barres, QR codes et texte
  static async analyzeImage(imageFile: File): Promise<AnalysisResult> {
    try {
      console.log('🔍 DEBUT ANALYSE COMPLETE:', imageFile.name, imageFile.size, 'bytes');

      const result: AnalysisResult = {
        barcodes: [],
        qrcodes: [],
        text: '',
        numbers: [],
        success: false
      };

      // Créer une URL pour l'image
      const imageUrl = URL.createObjectURL(imageFile);

      // ÉTAPE 1 : Scanner QR codes EN PREMIER (priorité absolue)
      console.log('🏆 ETAPE 1/3 : SCAN QR CODES...');
      try {
        result.qrcodes = await this.scanQRCodes(imageFile);
        console.log('📱 QR CODES DETECTES:', result.qrcodes);
      } catch (error) {
        console.log('❌ QR CODES ERREUR:', error);
        result.qrcodes = [];
      }

      // ÉTAPE 2 : Scanner codes-barres
      console.log('✅ ETAPE 2/3 : SCAN CODES-BARRES...');
      try {
        result.barcodes = await this.scanBarcodes(imageUrl);
        console.log('📊 CODES-BARRES DETECTES:', result.barcodes);
      } catch (error) {
        console.log('❌ CODES-BARRES ERREUR:', error);
        result.barcodes = [];
      }

      // ÉTAPE 3 : OCR (seulement si pas de QR/codes-barres)
      console.log('⚠️ ETAPE 3/3 : SCAN OCR...');
      try {
        const ocrResult = await this.performOCR(imageUrl);
        result.text = ocrResult.text;
        result.numbers = ocrResult.numbers;
        console.log('📝 TEXTE OCR BRUT:', result.text.substring(0, 200));
        console.log('🔢 NUMEROS OCR DETECTES:', result.numbers);
      } catch (error) {
        console.log('❌ OCR ERREUR:', error);
        result.text = '';
        result.numbers = [];
      }

      // Nettoyer l'URL
      URL.revokeObjectURL(imageUrl);

      // Déterminer le succès
      result.success = result.qrcodes.length > 0 || result.barcodes.length > 0 || result.numbers.length > 0 || result.text.length > 10;

      // PRIORITÉ ABSOLUE : QR codes > Codes-barres > OCR
      if (result.qrcodes.length > 0) {
        console.log('🏆 QR CODES DETECTES - Priorité absolue activée');
        // Garder OCR comme alternatives mais QR codes en priorité
        console.log('🏆 Mode QR : QR codes prioritaires, OCR comme alternatives');
      } else if (result.barcodes.length > 0) {
        console.log('✅ CODES-BARRES DETECTES - Priorité haute activée');
        // Réduire les alternatives OCR si codes-barres détectés
        result.numbers = result.numbers.slice(0, 2); // Max 2 alternatives OCR
        console.log('✅ Mode Codes-barres : QR codes + codes-barres prioritaires, OCR limité');
      } else {
        console.log('⚠️ AUCUN QR/CODE-BARRE - Mode OCR pur');
      }

      // Debug final pour vérification
      console.log('🎯 ETAT FINAL PRIORITES:');
      console.log('  📱 QR Codes:', result.qrcodes.length);
      console.log('  📊 Codes-barres:', result.barcodes.length);
      console.log('  🔢 Numéros OCR:', result.numbers.length);

      console.log('✅ ANALYSE TERMINEE - RESULTAT:', result);
      return result;

    } catch (error) {
      console.log('💥 ERREUR ANALYSE GLOBALE:', error);
      return {
        barcodes: [],
        qrcodes: [],
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

  // Scanner les QR codes avec jsQR - VERSION ULTRA-SIMPLE ET ROBUSTE
  private static async scanQRCodes(imageFile: File): Promise<string[]> {
    console.log('📱 DEBUT SCAN QR CODES ULTRA-SIMPLE...');
    console.log('  📁 Fichier:', imageFile.name, imageFile.size, 'bytes');

    try {
      // Créer une image à partir du fichier
      const imageUrl = URL.createObjectURL(imageFile);
      console.log('  🔗 URL créée:', imageUrl.substring(0, 50) + '...');

      const img = new Image();

      // Promesse pour attendre le chargement de l'image
      const imageLoadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => {
          console.log('  ✅ Image chargée:', img.width, 'x', img.height);
          resolve(img);
        };

        img.onerror = (error) => {
          console.log('  ❌ Erreur chargement image:', error);
          reject(new Error('Impossible de charger l\'image'));
        };

        console.log('  🔄 Chargement image...');
        img.src = imageUrl;
      });

      // Attendre le chargement avec timeout
      const loadedImg = await Promise.race([
        imageLoadPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout chargement image')), 10000)
        )
      ]);

      console.log('  🎯 Image prête pour scan QR');

      // Créer le canvas pour jsQR
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Impossible de créer le contexte canvas');
      }

      // Configuration canvas
      canvas.width = loadedImg.width;
      canvas.height = loadedImg.height;

      console.log('  🎨 Canvas créé:', canvas.width, 'x', canvas.height);

      // Dessiner l'image
      ctx.drawImage(loadedImg, 0, 0);
      console.log('  ✏️ Image dessinée sur canvas');

      // Obtenir les données de l'image
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      console.log('  📊 ImageData récupérée:', imageData.width, 'x', imageData.height);

      // Scanner avec jsQR - VERSION SIMPLE
      console.log('  🔍 Scan jsQR en cours...');
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

      // Nettoyer l'URL
      URL.revokeObjectURL(imageUrl);

      if (qrCode) {
        console.log('  🎉 QR CODE DÉTECTÉ:', qrCode.data);
        return [qrCode.data];
      } else {
        console.log('  ❌ Aucun QR code détecté');
        return [];
      }

    } catch (error) {
      console.log('💥 ERREUR SCAN QR CODES:', error);
      return [];
    }
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

    console.log('🎯 DEBUT SELECTION INTELLIGENTE parmi:', numbers);

    // Scores pour chaque numéro
    const scored = numbers.map(num => {
      let score = 0;
      const len = num.length;

      console.log(`📊 SCORING ${num} (longueur: ${len})`);

      // 🚫 ÉLIMINATION IMMÉDIATE des numéros suspects
      if (this.isSuspiciousNumber(num)) {
        score = -1000;
        console.log(`  ❌ NUMÉRO SUSPECT ÉLIMINÉ = ${score}`);
        return { number: num, score };
      }

      // ✅ LONGUEURS OPTIMALES (basées sur vraies cartes de fidélité)
      if (len === 13) {
        score += 30; // Augmenté de 25 à 30 - EAN-13 standard
        console.log(`  +30 (EAN-13 standard) = ${score}`);
      } else if (len === 8) {
        score += 25; // Augmenté de 20 à 25 - EAN-8 court
        console.log(`  +25 (EAN-8 court) = ${score}`);
      } else if (len === 12) {
        score += 22; // Augmenté de 18 à 22 - UPC-A
        console.log(`  +22 (UPC-A) = ${score}`);
      } else if (len === 10 || len === 11) {
        score += 20; // Augmenté de 15 à 20 - Cartes locales
        console.log(`  +20 (carte locale) = ${score}`);
      } else if (len === 9) {
        score += 18; // Nouveau bonus pour 9 chiffres
        console.log(`  +18 (9 chiffres) = ${score}`);
      } else if (len === 14 || len === 15) {
        score += 10; // Réduit pour favoriser les courts
        console.log(`  +10 (longueur acceptable 14-15) = ${score}`);
      } else if (len === 16) {
        score += 5; // Réduit pour favoriser les courts
        console.log(`  +5 (longueur limite 16) = ${score}`);
      } else if (len === 17) {
        score -= 10; // Nouveau - pénalité pour 17
        console.log(`  -10 (17 chiffres - suspect) = ${score}`);
      } else if (len === 18) {
        score -= 30; // Nouveau - forte pénalité pour 18
        console.log(`  -30 (18 chiffres - très suspect) = ${score}`);
      } else if (len >= 19) {
        score -= 100; // Augmenté de -50 à -100 - ÉLIMINATION quasi-certaine
        console.log(`  -100 (≥19 chiffres - ÉLIMINÉ) = ${score}`);
      } else if (len < 8) {
        score -= 40; // Augmenté de -30 à -40 - Trop court
        console.log(`  -40 (trop court) = ${score}`);
      }

      // 🎯 BONUS PATTERNS SPÉCIFIQUES FRANÇAIS
      if (/^913\d{16}$/.test(num)) {
        score += 40; // Castorama
        console.log(`  +40 (Castorama 913...) = ${score}`);
      } else if (/^20\d{11,13}$/.test(num)) {
        score += 35; // Super U / Intermarché
        console.log(`  +35 (Super U/Intermarché 20...) = ${score}`);
      } else if (/^893\d{10,13}$/.test(num)) {
        score += 35; // Pattern Super U alternatif
        console.log(`  +35 (Super U 893...) = ${score}`);
      } else if (/^345\d{10,13}$/.test(num)) {
        score += 30; // Carrefour
        console.log(`  +30 (Carrefour 345...) = ${score}`);
      } else if (/^184\d{14,16}$/.test(num)) {
        score += 30; // McDonald's réel
        console.log(`  +30 (McDonald's 184...) = ${score}`);
      } else if (/^555\d{10,13}$/.test(num)) {
        score += 25; // Certains formats
        console.log(`  +25 (Format 555...) = ${score}`);
      }

      // ✅ BONUS STRUCTURE NUMÉRIQUE
      if (num[0] !== '0' && len >= 10) {
        score += 10; // Ne commence pas par 0
        console.log(`  +10 (ne commence pas par 0) = ${score}`);
      }

      // ✅ BONUS DIVERSITÉ DES CHIFFRES
      const uniqueDigits = new Set(num).size;
      if (uniqueDigits >= 6) {
        score += 15; // Bonne diversité
        console.log(`  +15 (${uniqueDigits} chiffres uniques) = ${score}`);
      } else if (uniqueDigits >= 4) {
        score += 8; // Diversité moyenne
        console.log(`  +8 (${uniqueDigits} chiffres uniques) = ${score}`);
      } else {
        score -= 20; // Faible diversité
        console.log(`  -20 (seulement ${uniqueDigits} chiffres uniques) = ${score}`);
      }

      // 🚫 PÉNALITÉ PATTERNS RÉPÉTITIFS
      const repetitionPenalty = this.calculateRepetitionPenalty(num);
      score -= repetitionPenalty;
      if (repetitionPenalty > 0) {
        console.log(`  -${repetitionPenalty} (patterns répétitifs) = ${score}`);
      }

      console.log(`  🏆 SCORE FINAL ${num}: ${score}`);
      return { number: num, score };
    });

    // Éliminer les numéros avec score négatif
    const validNumbers = scored.filter(item => item.score > 0);

    if (validNumbers.length === 0) {
      console.log('❌ AUCUN NUMÉRO VALIDE - Utilisation du moins mauvais');
      scored.sort((a, b) => b.score - a.score);
      return scored[0].number;
    }

    // Trier par score décroissant
    validNumbers.sort((a, b) => b.score - a.score);

    console.log('📋 CLASSEMENT FINAL:');
    validNumbers.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.number} (${item.score} pts)`);
    });

    const winner = validNumbers[0].number;
    console.log(`✅ GAGNANT: ${winner}`);

    return winner;
  }

  // Détecter les numéros suspects (probablement des erreurs OCR)
  private static isSuspiciousNumber(num: string): boolean {
    // Trop long (probablement parasitage OCR)
    if (num.length > 18) { // Abaissé de 20 à 18
      console.log(`  ⚠️ Suspect: trop long (${num.length})`);
      return true;
    }

    // Patterns répétitifs excessifs
    if (/(\d)\1{5,}/.test(num)) { // Abaissé de 6+ à 5+ chiffres identiques
      console.log(`  ⚠️ Suspect: répétitions excessives`);
      return true;
    }

    // Commencer par des patterns d'erreur OCR
    if (/^(111111|000000|555555|999999|123123|734734|260260)/.test(num)) {
      console.log(`  ⚠️ Suspect: commence par pattern d'erreur`);
      return true;
    }

    // Séquences suspectes spécifiques
    if (/734123|260111|111241|412411/.test(num)) {
      console.log(`  ⚠️ Suspect: contient séquence OCR typique`);
      return true;
    }

    // Trop de chiffres identiques
    const digitCounts: Record<string, number> = {};
    for (const digit of num) {
      digitCounts[digit] = (digitCounts[digit] || 0) + 1;
    }

    const maxCount = Math.max(...Object.values(digitCounts) as number[]);
    const dominanceRatio = maxCount / num.length;

    if (dominanceRatio > 0.5) { // Abaissé de 60% à 50%
      console.log(`  ⚠️ Suspect: ${Math.round(dominanceRatio * 100)}% du même chiffre`);
      return true;
    }

    // Pattern de numérotation séquentielle
    if (/123456|234567|345678|456789|987654|876543|765432/.test(num)) {
      console.log(`  ⚠️ Suspect: séquence numérique`);
      return true;
    }

    return false;
  }

  // Calculer la pénalité pour les patterns répétitifs
  private static calculateRepetitionPenalty(num: string): number {
    let penalty = 0;

    // Séquences répétitives
    const repetitions = num.match(/(\d)\1{2,}/g); // 3+ chiffres identiques
    if (repetitions) {
      repetitions.forEach(rep => {
        const length = rep.length;
        penalty += length * 5; // 5 points par chiffre répété
      });
    }

    // Patterns simples (123, 789, 000, etc.)
    if (/123456|234567|345678|456789|987654|876543/.test(num)) {
      penalty += 25;
    }

    // Alternances simples (121212, 545454)
    if (/(\d)(\d)\1\2\1\2/.test(num)) {
      penalty += 15;
    }

    return Math.min(penalty, 100); // Limiter à 100 points max
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