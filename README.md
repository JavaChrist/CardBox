# 📦 CardBox – Gestion simple des cartes de magasin

Application web PWA pour stocker ses cartes de fidélité de manière sécurisée.  
L'utilisateur peut ajouter une carte avec photo, nom du magasin, et informations complémentaires.  
Les données sont synchronisées via Firebase.

## 🚀 Stack technique

- **React + Vite**
- **TypeScript**
- **TailwindCSS**
- **Firebase (Auth + Firestore + Storage)**
- **PWA Ready**

## 🛠️ Installation

```bash
# Cloner le projet
git clone <url-du-repo>
cd cardbox

# Installer les dépendances
npm install

# Démarrer en développement
npm run dev
```

## 🔐 Configuration Firebase

1. **Créer un projet Firebase** sur [console.firebase.google.com](https://console.firebase.google.com)

2. **Activer les services suivants :**

   - Authentication → Email/Password
   - Firestore Database (mode test pour dev)
   - Storage

3. **Créer un fichier `.env.local`** à la racine du projet :

```bash
VITE_API_KEY=xxxxxxxxxxxxxxxxxx
VITE_AUTH_DOMAIN=xxxx.firebaseapp.com
VITE_PROJECT_ID=xxxxx
VITE_STORAGE_BUCKET=xxxxx.appspot.com
VITE_MESSAGING_SENDER_ID=xxxxx
VITE_APP_ID=1:xxxx:web:xxxxx
```

4. **Règles Firestore** (à configurer dans la console Firebase) :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cards/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

5. **Règles Storage** :

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /cards/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🚀 Déploiement sur Vercel

### 1. **Prérequis**

- Compte [Vercel](https://vercel.com)
- Projet Firebase configuré
- Repository Git (GitHub, GitLab, Bitbucket)

### 2. **Déploiement automatique**

1. **Pusher le code** sur votre repository Git
2. **Connecter à Vercel** : [vercel.com/new](https://vercel.com/new)
3. **Importer** votre repository CardBox
4. **Framework** : Vite sera détecté automatiquement
5. **Variables d'environnement** : Ajouter dans Settings > Environment Variables :

```bash
VITE_API_KEY=your_firebase_api_key
VITE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_PROJECT_ID=your_project_id
VITE_STORAGE_BUCKET=your_project.appspot.com
VITE_MESSAGING_SENDER_ID=your_sender_id
VITE_APP_ID=1:your_app_id:web:your_app_id
```

6. **Deploy** ! 🚀

### 3. **Configuration automatique**

- ✅ Build Command: `npm run build`
- ✅ Output Directory: `dist`
- ✅ Framework: Vite
- ✅ Node.js Version: 18.x

### 4. **Domaine personnalisé (optionnel)**

Dans Vercel Dashboard > Settings > Domains, ajouter votre domaine personnalisé.

## ✅ Fonctionnalités

### Authentification

- ✅ Connexion / création de compte par email
- ✅ Redirection automatique vers le dashboard si connecté

### Gestion des cartes

- ✅ Sélection parmi 20+ marques populaires françaises
- ✅ Option "Autre marque" pour marques non référencées
- ✅ Upload de photo (vers Firebase Storage)
- ✅ Scanner de code-barres (simulation)
- ✅ Saisie manuelle des informations
- ✅ Affichage avec vrais logos de marques
- ✅ Code-barres généré automatiquement
- ✅ Menu "Gérer" : Modifier, Photos, Note, Supprimer
- ✅ Types de cartes : Supermarché, Pharmacie, Restaurant, etc.

### Interface

- ✅ Design moderne style Klarna avec TailwindCSS
- ✅ Responsive (mobile/desktop)
- ✅ Cartes réalistes avec codes-barres
- ✅ Modal plein écran pour codes-barres
- ✅ État vide avec bouton d'ajout
- ✅ Feedback utilisateur (loading, erreurs)

## 📱 PWA

L'application est configurée comme PWA :

- ✅ Manifest.webmanifest
- ✅ Meta tags appropriés
- 🔄 Service Worker (à implémenter avec vite-plugin-pwa)

## 🏗️ Structure du projet

```
src/
├── components/
│   ├── CardForm.tsx          # Formulaire d'ajout avec sélection marques
│   ├── CardList.tsx          # Liste des cartes
│   ├── CardItem.tsx          # Carte individuelle avec vrais logos
│   └── BarcodeModal.tsx      # Modal code-barre + menu "Gérer"
├── pages/
│   ├── Login.tsx             # Page de connexion
│   └── Dashboard.tsx         # Portefeuille principal
├── services/
│   ├── firebase.ts           # Configuration Firebase
│   └── cardService.ts        # Service de gestion des cartes
├── data/
│   └── popularBrands.ts      # 20+ marques françaises avec logos
├── App.tsx                   # Composant principal avec auth
└── main.tsx                  # Point d'entrée
```

## 🚀 Déploiement

```bash
# Build de production
npm run build

# Aperçu du build
npm run preview
```

## 💡 Améliorations futures

- [ ] OCR avec Tesseract.js pour extraire automatiquement les infos
- [ ] Lecture de code-barres / QR code avec la caméra
- [ ] Catégories personnalisées
- [ ] Mode hors-ligne avec service worker
- [ ] Notifications pour les cartes expirées
- [ ] Export/Import des données
- [ ] Recherche et filtres avancés

## 📝 Licence

MIT
