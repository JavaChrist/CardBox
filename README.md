# CardBox

CardBox est une application web personnelle pour ranger ses cartes de fidélité. Elle s’adresse à une personne qui veut retrouver, sur son téléphone ou son ordinateur, le numéro, la photo et un code affichable en magasin, sans garder les cartes plastiques sur soi.

L’interface est en français. La liste d’enseignes proposée à l’ajout est surtout composée de magasins courants en France. Chaque compte ne voit que ses propres cartes.

Le dépôt est en version `0.0.0`. Aucune adresse publique de l’application n’est indiquée dans le projet : la mise en ligne reste à confirmer.

## Fonctionnalités

### Opérationnelles

Ces parcours sont reliés à l’interface et enregistrent ou affichent des données.

- **Compte.** Création de compte et connexion avec une adresse e-mail et un mot de passe. La session est conservée : une personne déjà connectée arrive directement sur son portefeuille. La déconnexion est disponible.
- **Portefeuille.** Liste des cartes du compte, de la plus récente à la plus ancienne, avec le nombre de cartes et un état vide lorsqu’il n’y en a pas encore.
- **Ajout d’une carte.** Choix parmi 30 entrées (29 enseignes ou catégories, plus « Autre marque » pour saisir un nom libre). Catégories prévues : supermarché, pharmacie, restaurant, sport, vêtement, beauté, bricolage et autre. Saisie du numéro, d’une note et, si on le souhaite, d’une photo prise ou choisie sur l’appareil. La photo est envoyée vers le stockage, et la fiche est enregistrée.
- **Affichage en magasin.** À partir du numéro saisi, l’application dessine un code-barres ou un QR code. À la création, une case permet de choisir le QR code ; sinon un code-barres est utilisé. En ouvrant une carte, on peut basculer entre automatique, code-barres et QR code. Pour Lidl, l’affichage proposé au départ est le QR code. Un numéro d’au moins 4 caractères est nécessaire pour ce dessin.
- **Consultation.** Toucher une carte ouvre une fenêtre avec le numéro, la note et le code. S’il n’y a pas de numéro exploitable, la photo de la carte est montrée à la place.
- **Modification.** Depuis « Gérer », on peut changer le numéro et la note. Ces deux champs sont bien réenregistrés.
- **Suppression.** Depuis les points de la carte, une fenêtre de confirmation supprime la fiche et tente aussi de retirer la photo du stockage.
- **Application installable.** À la construction du site, un manifeste et un service worker sont générés (nom « CardBox - Portefeuille Digital », affichage plein écran, mise à jour automatique). Les fichiers de l’application et les polices Google sont mis en cache. Les cartes, elles, sont rechargées depuis le compte à chaque ouverture.

### Partielles

- **Changement de photo après création.** Le menu « Gérer » propose « Photos » et un bouton d’enregistrement, mais seule la mise à jour du numéro et de la note est envoyée. La nouvelle photo n’est pas enregistrée.
- **Suppression depuis « Gérer ».** Cette suppression retire la fiche. Elle ne retire pas la photo du stockage, contrairement à la suppression lancée depuis les points de la carte.
- **Message d’accueil.** Quand le portefeuille est vide, le texte invite encore à prendre une photo « pour une analyse automatique ». L’écran d’ajout actuel conserve la photo et n’analyse pas l’image.
- **Logos d’enseignes.** Ils sont chargés depuis des adresses externes (Clearbit, et une image de remplacement pour Pharmacie et Autre marque). Si l’image ne s’affiche pas, un pictogramme de la catégorie prend le relais.
- **Écran de chargement.** Il cherche une image `logob192.png`, absente du dossier public. Le secours affiché est alors le pictogramme du paquet.
- **Erreurs à l’ajout.** Si l’enregistrement échoue, le formulaire se termine sans message visible.

### Présentes dans le code, non reliées à l’écran

Le fichier `src/services/imageAnalysisService.ts` sait lire une photo pour y chercher un QR code, un code-barres et du texte (numéros possibles). Les bibliothèques correspondantes sont installées. Aucune page ni aucun formulaire ne l’appelle : le commentaire du formulaire précise que cette analyse a été retirée du parcours simplifié. Le document `IMPLEMENTATION_SUMMARY.md` décrit un branchement qui n’est plus celui du code actuel.

`CardList.tsx` existe encore, mais le portefeuille affiche les cartes directement, sans passer par ce composant.

Le champ « photo du code » (`codeImageUrl`) peut encore être affiché s’il est déjà présent sur une ancienne fiche. Le formulaire actuel ne le remplit pas.

### Simulées

Sur chaque vignette, un motif de barres est dessiné à partir de l’identifiant de la fiche, avec quatre caractères masqués. Ce dessin ne reprend pas le vrai numéro. Le code utilisable en magasin est celui généré à partir du numéro saisi, dans la vignette et dans la fenêtre de la carte.

Le badge « Actif » et la mention « Membre depuis » reprennent la date d’ajout dans CardBox. Ils ne reflètent pas un statut fourni par l’enseigne.

### Prévues ou absentes

Ces éléments ne sont pas implémentés dans les pages :

- récupération d’un mot de passe oublié ;
- recherche, filtres ou catégories créées par la personne ;
- export ou import des cartes ;
- alertes pour une carte expirée ;
- usage hors connexion des cartes elles-mêmes (seule l’enveloppe de l’application est prévue au cache).

## Stack

- React 19 et TypeScript
- Vite 6
- Tailwind CSS
- Firebase : authentification e-mail, base Firestore (collection `cards`), stockage des photos
- Génération des codes : JsBarcode (format CODE128) et la bibliothèque `qrcode`
- Application web installable : `vite-plugin-pwa` (manifeste et service worker produits au build)
- Bibliothèques d’analyse d’image installées mais non appelées par l’interface : Tesseract.js, Quagga, jsQR

## Installation

Dépôt : `https://github.com/JavaChrist/CardBox.git`

```bash
git clone https://github.com/JavaChrist/CardBox.git
cd CardBox
npm install
npm run dev
```

Le serveur de développement Vite indique l’adresse locale dans le terminal. Le fichier `package.json` ne fixe pas de version de Node.js.

## Configuration

Créer un projet Firebase, activer la connexion e-mail / mot de passe, Firestore et Storage, puis placer les valeurs dans un fichier `.env.local` à la racine. Ce fichier n’est pas versionné.

Variables attendues par `src/services/firebase.ts` :

- `VITE_API_KEY`
- `VITE_AUTH_DOMAIN`
- `VITE_PROJECT_ID`
- `VITE_STORAGE_BUCKET`
- `VITE_MESSAGING_SENDER_ID`
- `VITE_APP_ID`

Aucune règle de sécurité n’est versionnée dans le dépôt. Côté console Firebase, l’accès prévu par l’application est le suivant : une personne connectée lit et modifie uniquement les cartes dont le champ `userId` correspond à son identifiant ; les photos sont rangées sous `cards/{identifiant}/…` et réservées à ce même identifiant.

Exemple de règles Firestore à saisir dans la console :

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

Exemple de règles Storage :

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

Une fiche de carte enregistre : nom, catégorie, identifiant d’enseigne, adresse du logo, numéro, note, adresse de la photo, choix QR ou code-barres, identifiant du compte et date de création.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Lance l’application en développement |
| `npm run build` | Vérifie TypeScript puis construit le site dans `dist` |
| `npm run preview` | Sert le dossier `dist` en local |
| `npm run lint` | Lance ESLint |
| `npm run icons:gen` | Régénère les icônes à partir d’une image source (`public/logo512.png` par défaut) |

## Structure

```
src/
├── App.tsx                         # Session : portefeuille ou page de connexion
├── pages/
│   ├── Login.tsx                   # Inscription et connexion
│   └── Dashboard.tsx               # Portefeuille
├── components/
│   ├── CardForm.tsx                # Ajout : enseigne, photo, numéro, note
│   ├── CardItem.tsx                # Vignette, code généré, suppression
│   ├── BarcodeModal.tsx            # Fenêtre du code et menu Gérer
│   └── CardList.tsx                # Liste non utilisée par le portefeuille
├── services/
│   ├── firebase.ts                 # Auth, Firestore, Storage
│   ├── cardService.ts              # Lecture et suppression
│   └── imageAnalysisService.ts     # Analyse d’image, non appelée par l’interface
└── data/
    └── popularBrands.ts            # Enseignes proposées à l’ajout
```

Le dossier `public/` contient le logo et les icônes utilisées par l’en-tête, l’onglet du navigateur et l’installation sur l’écran d’accueil.

## Déploiement

`vercel.json` prépare un site d’une seule page : toutes les adresses renvoient vers `index.html`. Il ajoute aussi deux en-têtes de sécurité (`X-Frame-Options: DENY` et `X-Content-Type-Options: nosniff`). La commande de construction attendue est `npm run build`, avec le dossier `dist` en résultat.

Pour un hébergement, les six variables `VITE_…` ci-dessus doivent être définies dans l’environnement de construction. Le dépôt ne contient pas d’adresse de site déployé.

## Licence

L’ancien texte du dépôt indiquait une licence MIT. Aucun fichier `LICENSE` n’est présent : la licence reste à confirmer.
