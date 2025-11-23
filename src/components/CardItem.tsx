import { useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import BarcodeModal from './BarcodeModal';

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

interface CardItemProps {
  card: Card;
  onCardDeleted: (cardId: string) => void;
  onCardUpdated?: () => void;
}

const CardItem = ({ card, onCardDeleted, onCardUpdated }: CardItemProps) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);



  const handleDelete = async () => {
    setLoading(true);
    try {
      // Supprimer l'image du Storage seulement si elle existe et c'est une URL Firebase
      if (card.imageUrl && card.imageUrl.includes('firebase')) {
        try {
          const imageRef = ref(storage, card.imageUrl);
          await deleteObject(imageRef);
        } catch (storageError) {
          console.log('Image déjà supprimée ou introuvable:', storageError);
        }
      }

      // Supprimer le document de Firestore
      await deleteDoc(doc(db, 'cards', card.id));

      onCardDeleted(card.id);
      setShowConfirm(false);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      // L'erreur sera affichée dans la console, pas d'alert
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  return (
    <>
      {/* Carte qui ressemble à une vraie carte de fidélité */}
      <div
        className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer relative"
        onClick={() => setShowBarcodeModal(true)}
      >
        {/* Header de la carte avec logo */}
        <div className={`bg-gradient-to-r ${getCardColor(card.type)} p-4 text-white relative`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">
                {card.logoUrl ? (
                  <img
                    src={card.logoUrl}
                    alt={card.name}
                    className="w-8 h-8 object-contain"
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
                <h3 className="font-bold text-lg">{card.name}</h3>
                <p className="text-blue-100 text-sm capitalize">{card.type}</p>
              </div>
            </div>
            {/* Menu points pour supprimer */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(true);
              }}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Corps de la carte */}
        <div className="p-4 bg-gradient-to-br from-gray-50 to-white">
          {/* Photo visible si disponible */}
          {card.imageUrl && (
            <div className="mb-3">
              <img
                src={card.imageUrl}
                alt={card.name}
                className="w-full h-32 object-cover rounded-lg border border-gray-200"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBarcodeModal(true);
                }}
              />
            </div>
          )}
          {/* Simulation d'un code-barre */}
          <div className="mb-3">
            <div className="flex justify-center space-x-px mb-2">
              {Array.from({ length: 30 }, (_, i) => {
                // Génération déterministe basée sur l'ID de la carte
                const seed = card.id.charCodeAt(i % card.id.length);
                const width = (seed % 3) + 1; // 1-3px
                return (
                  <div
                    key={i}
                    className="bg-gray-800"
                    style={{
                      width: `${width}px`,
                      height: '30px'
                    }}
                  />
                );
              })}
            </div>
            <p className="text-center text-xs text-gray-600 font-mono">
              **** **** **** {card.id.slice(-4).toUpperCase()}
            </p>
          </div>



          {/* Informations carte */}
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Membre depuis {formatDate(card.createdAt)}</span>
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              Actif
            </span>
          </div>
        </div>


      </div>

      {/* Modal de confirmation de suppression */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Supprimer la carte</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer la carte {card.name} ? Cette action est irréversible.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {loading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal du code-barre */}
      {showBarcodeModal && (
        <BarcodeModal
          card={card}
          onClose={() => {
            setShowBarcodeModal(false);
          }}
          onCardUpdated={onCardUpdated}
        />
      )}
    </>
  );
};

export default CardItem; 