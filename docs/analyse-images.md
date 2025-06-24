# 📸 Analyse Automatique d'Images - CardBox

## Vue d'ensemble

CardBox dispose maintenant d'une fonctionnalité d'**analyse automatique d'images** qui permet d'identifier et d'extraire automatiquement :

- 📊 **Codes-barres** (EAN, Code 128, Code 39, UPC, etc.)
- 🔢 **Numéros de carte** (détection OCR intelligente)
- 📄 **Texte** de la carte de fidélité

## Comment ça marche

### 1. Prise de photo

Quand vous prenez une photo d'une carte de fidélité dans l'application :

1. L'image est automatiquement analysée en arrière-plan
2. L'analyse utilise deux technologies :
   - **Tesseract.js** pour la reconnaissance de texte (OCR)
   - **QuaggaJS** pour la lecture de codes-barres

### 2. Affichage des résultats

Les résultats sont présentés dans une interface intuitive :

- ✅ **Zone verte** : Informations détectées avec succès
- ⚠️ **Zone jaune** : Aucune information détectée
- 🔄 **Zone bleue** : Analyse en cours

### 3. Utilisation des résultats

- Boutons **"Utiliser"** pour pré-remplir automatiquement les champs
- Les codes-barres sont prioritaires sur les numéros OCR
- Possibilité de masquer/afficher les résultats

## Technologies utilisées

### Tesseract.js (OCR)

- **Langue** : Français (`fra`)
- **Fonctionnalité** : Reconnaissance de texte dans les images
- **Extraction** : Numéros de carte via patterns regex avancés

### QuaggaJS (Codes-barres)

- **Formats supportés** :
  - Code 128
  - EAN (8 et 13)
  - Code 39
  - UPC (A et E)
  - Codabar
  - Interleaved 2 of 5

## Patterns de détection

### Numéros de carte

L'OCR recherche automatiquement :

- Numéros de 8 à 19 chiffres
- Formats avec espaces ou tirets (1234-5678-9012-3456)
- Numéros après des mots-clés ("carte", "numéro", "client", etc.)

### Optimisations

- **Analyse parallèle** : OCR et codes-barres en simultané
- **Timeout** : 10 secondes maximum par analyse
- **Nettoyage mémoire** : URLs temporaires libérées automatiquement

## Interface utilisateur

### États visuels

1. **En cours d'analyse** 🔄

   ```
   🔍 Analyse en cours...
   Détection des codes-barres et texte
   ```

2. **Succès** ✅

   ```
   ✅ Informations détectées
   📊 Code-barre : 1234567890123 [Utiliser]
   🔢 Numéro : 9876543210 [Utiliser]
   ```

3. **Aucune détection** ⚠️
   ```
   ⚠️ Aucune information détectée
   Vous pouvez saisir manuellement les informations
   ```

## Performance

- **Temps moyen** : 3-8 secondes selon la complexité de l'image
- **Formats d'image** : JPG, PNG, WebP
- **Taille recommandée** : 800px de largeur maximum pour les performances
- **Qualité** : Images nettes et bien éclairées donnent de meilleurs résultats

## Conseils pour de meilleurs résultats

### Pour les codes-barres

- 📸 Centrer le code-barre dans l'image
- 💡 Bon éclairage, éviter les reflets
- 📐 Tenir le téléphone bien droit
- 🔍 Image nette, éviter le flou de bougé

### Pour l'OCR

- 🔤 Texte lisible et contrasté
- 📏 Éviter les distorsions (perspective)
- 🎯 Cadrer au plus près du texte important
- ✨ Surface propre, sans salissures

## Dépannage

### Aucun résultat détecté

- Vérifier la qualité de l'image
- Reprendre la photo avec un meilleur éclairage
- S'assurer que le code-barre/texte est visible
- Essayer de tenir le téléphone plus stable

### Résultats incorrects

- Les numéros détectés peuvent inclure des dates ou autres chiffres
- Utiliser le bouton "Utiliser" pour le bon numéro
- Possibilité de saisir manuellement si nécessaire

### Performance lente

- Les images très grandes peuvent ralentir l'analyse
- Fermer d'autres applications pour libérer de la mémoire
- Vérifier la connexion internet (téléchargement des modèles OCR)

## Code source

Les principaux fichiers :

- `src/services/imageAnalysisService.ts` - Service d'analyse
- `src/components/CardForm.tsx` - Interface utilisateur
- `src/types/quagga.d.ts` - Types TypeScript
