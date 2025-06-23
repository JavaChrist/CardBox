import React, { useEffect, useState } from 'react';

interface Card {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  createdAt: Date;
  userId: string;
  brandId?: string;
  logoUrl?: string;
  cardNumber?: string;
  note?: string;
}

interface BarcodeModalProps {
  card: Card;
  onClose: () => void;
}

const BarcodeModal: React.FC<BarcodeModalProps> = ({ card, onClose }) => {
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [showEditCard, setShowEditCard] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Fermer modal avec Échap
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const getTypeEmoji = (type: string) => {
    const emojis: { [key: string]: string } = {
      supermarche: '🛒',
      pharmacie: '💊',
      restaurant: '🍽️',
      vetement: '👕',
      sport: '⚽',
      bricolage: '🔨',
      beaute: '💄',
      autre: '🏪'
    };
    return emojis[type] || '🏪';
  };

  const getCardColor = (type: string) => {
    const colors: { [key: string]: string } = {
      supermarche: 'from-blue-600 to-blue-700',
      pharmacie: 'from-green-600 to-green-700',
      restaurant: 'from-red-600 to-red-700',
      vetement: 'from-purple-600 to-purple-700',
      sport: 'from-orange-600 to-orange-700',
      bricolage: 'from-gray-600 to-gray-700',
      beaute: 'from-pink-600 to-pink-700',
      autre: 'from-indigo-600 to-indigo-700'
    };
    return colors[type] || 'from-blue-600 to-blue-700';
  };

  // Génération d'un code-barre plus réaliste basé sur l'ID de la carte
  const generateBarcode = (seed: string) => {
    const chars = seed.split('');
    const bars = [];

    for (let i = 0; i < 50; i++) {
      const charCode = chars[i % chars.length].charCodeAt(0);
      const width = (charCode % 3) + 1; // 1-3px
      const gap = charCode % 2; // 0-1px gap

      bars.push({ width, gap, key: i });
    }

    return bars;
  };

  const barcode = generateBarcode(card.id);
  const barcodeNumber = card.id.replace(/[^0-9]/g, '').slice(0, 13).padEnd(13, '0');

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header avec bouton fermer */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{card.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Carte de fidélité plein écran */}
        <div className="p-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header coloré de la carte */}
            <div className={`bg-gradient-to-r ${getCardColor(card.type)} p-6 text-white`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">
                    {card.logoUrl ? (
                      <img
                        src={card.logoUrl}
                        alt={card.name}
                        className="w-12 h-12 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling!.textContent = getTypeEmoji(card.type);
                          (target.nextElementSibling as HTMLElement)!.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <span className={card.logoUrl ? 'hidden' : 'block'}>{getTypeEmoji(card.type)}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{card.name}</h3>
                    <p className="text-white text-opacity-80 capitalize">{card.type}</p>
                  </div>
                </div>
              </div>

              {/* Numéro de carte */}
              <div className="text-right">
                <p className="text-white text-opacity-60 text-sm">N° de carte</p>
                <p className="font-mono text-lg font-bold">
                  **** **** **** {card.id.slice(-4).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Corps de la carte avec code-barre */}
            <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
              {/* Code-barre principal */}
              <div className="mb-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-center items-end space-x-px mb-3">
                    {barcode.map((bar) => (
                      <div key={bar.key} className="flex">
                        <div
                          className="bg-gray-900"
                          style={{
                            width: `${bar.width}px`,
                            height: '60px'
                          }}
                        />
                        {bar.gap > 0 && (
                          <div
                            className="bg-transparent"
                            style={{ width: `${bar.gap}px` }}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Numéro du code-barre */}
                  <div className="text-center">
                    <p className="font-mono text-lg font-bold text-gray-900 tracking-wider">
                      {barcodeNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informations supplémentaires */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Status</span>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                    ✓ Actif
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Membre depuis</span>
                  <span className="text-gray-900 font-medium">
                    {new Intl.DateTimeFormat('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }).format(card.createdAt)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Type de carte</span>
                  <span className="text-gray-900 font-medium capitalize">
                    {card.type}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={() => setShowManageMenu(true)}
              className={`flex-1 bg-gradient-to-r ${getCardColor(card.type)} text-white font-medium py-3 px-4 rounded-xl transition-colors hover:shadow-lg`}
            >
              Gérer
            </button>
          </div>
        </div>
      </div>

      {/* Menu "Gérer" */}
      {showManageMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-end justify-center z-60 p-4">
          <div className="bg-white rounded-t-3xl w-full max-w-md transform transition-all">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Gérer</h3>
              <button
                onClick={() => setShowManageMenu(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Options */}
            <div className="p-6 space-y-1">
              <button
                onClick={() => {
                  setShowManageMenu(false);
                  setShowEditCard(true);
                }}
                className="w-full flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-xl transition-colors text-left"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Modifier la carte</h4>
                  <p className="text-sm text-gray-500">Numéro de carte</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>

              <button
                onClick={() => {
                  setShowManageMenu(false);
                  setShowPhoto(true);
                }}
                className="w-full flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-xl transition-colors text-left"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Photos</h4>
                  <p className="text-sm text-gray-500">Prendre une photo de face</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>

              <button
                onClick={() => {
                  setShowManageMenu(false);
                  setShowNote(true);
                }}
                className="w-full flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-xl transition-colors text-left"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Note</h4>
                  <p className="text-sm text-gray-500">Ajouter une note</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>

              <button
                onClick={() => {
                  setShowManageMenu(false);
                  setShowDelete(true);
                }}
                className="w-full flex items-center space-x-4 p-4 hover:bg-red-50 rounded-xl transition-colors text-left"
              >
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-red-900">Supprimer la carte</h4>
                  <p className="text-sm text-red-500">Action irréversible</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Bouton annuler */}
            <div className="p-6 pt-0">
              <button
                onClick={() => setShowManageMenu(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals de gestion (placeholders pour l'instant) */}
      {showEditCard && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Modifier la carte</h3>
            <p className="text-gray-600 text-center py-8">Fonctionnalité en cours de développement...</p>
            <button
              onClick={() => setShowEditCard(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {showPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Photos</h3>
            <p className="text-gray-600 text-center py-8">Fonctionnalité en cours de développement...</p>
            <button
              onClick={() => setShowPhoto(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {showNote && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Note</h3>
            <p className="text-gray-600 text-center py-8">Fonctionnalité en cours de développement...</p>
            <button
              onClick={() => setShowNote(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-4">Supprimer la carte</h3>
            <p className="text-gray-600 text-center py-4">Êtes-vous sûr de vouloir supprimer cette carte ? Cette action est irréversible.</p>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  // Logique de suppression ici
                  setShowDelete(false);
                  onClose();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeModal; 