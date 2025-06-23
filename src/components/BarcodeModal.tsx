import React, { useEffect, useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../services/firebase';

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

  // États pour l'édition
  const [editCardNumber, setEditCardNumber] = useState(card.cardNumber || '');
  const [editNote, setEditNote] = useState(card.note || '');
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  // Fonctions d'édition
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditImage(file);

      const reader = new FileReader();
      reader.onload = () => {
        setEditPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateCard = async () => {
    setLoading(true);
    try {
      const updates: any = {
        cardNumber: editCardNumber.trim(),
        note: editNote.trim()
      };

      // Upload nouvelle image si sélectionnée
      if (editImage) {
        const imageRef = ref(storage, `cards/${card.userId}/${Date.now()}_${editImage.name}`);
        const uploadResult = await uploadBytes(imageRef, editImage);
        const newImageUrl = await getDownloadURL(uploadResult.ref);
        updates.imageUrl = newImageUrl;

        // Supprimer ancienne image si elle existe
        if (card.imageUrl && card.imageUrl.includes('firebase')) {
          try {
            const oldImageRef = ref(storage, card.imageUrl);
            await deleteObject(oldImageRef);
          } catch (error) {
            console.log('Ancienne image déjà supprimée:', error);
          }
        }
      }

      // Mettre à jour le document
      await updateDoc(doc(db, 'cards', card.id), updates);

      // Fermer modals et actualiser
      setShowEditCard(false);
      setShowPhoto(false);
      setShowNote(false);
      setShowManageMenu(false);
      onClose(); // Fermer et forcer refresh

    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour de la carte');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async () => {
    setLoading(true);
    try {
      // Supprimer l'image du Storage si elle existe
      if (card.imageUrl && card.imageUrl.includes('firebase')) {
        try {
          const imageRef = ref(storage, card.imageUrl);
          await deleteObject(imageRef);
        } catch (error) {
          console.log('Image déjà supprimée:', error);
        }
      }

      // Supprimer le document
      await deleteDoc(doc(db, 'cards', card.id));

      // Fermer modal et actualiser
      onClose();

    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de la carte');
    } finally {
      setLoading(false);
    }
  };

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

      {/* Modal Modifier la carte */}
      {showEditCard && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Modifier la carte</h3>
              <button onClick={() => setShowEditCard(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Numéro de carte */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de carte
                </label>
                <input
                  type="text"
                  value={editCardNumber}
                  onChange={(e) => setEditCardNumber(e.target.value)}
                  placeholder="Ex: 1234567890123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>

              {/* Boutons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowEditCard(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdateCard}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Photos */}
      {showPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Photo de la carte</h3>
              <button onClick={() => setShowPhoto(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Photo actuelle */}
              {card.imageUrl && !editPreview && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Photo actuelle :</p>
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                </div>
              )}

              {/* Prévisualisation nouvelle photo */}
              {editPreview && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Nouvelle photo :</p>
                  <img
                    src={editPreview}
                    alt="Prévisualisation"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                </div>
              )}

              {/* Input file */}
              <div>
                <input
                  id="edit-photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  onClick={() => document.getElementById('edit-photo')?.click()}
                  className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>📸 Changer la photo</span>
                </button>
              </div>

              {/* Boutons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowPhoto(false);
                    setEditImage(null);
                    setEditPreview(null);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
                  disabled={loading}
                >
                  Annuler
                </button>
                {editImage && (
                  <button
                    onClick={handleUpdateCard}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Note */}
      {showNote && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Note personnelle</h3>
              <button onClick={() => setShowNote(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Zone de texte pour la note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Votre note
                </label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Ajoutez une note personnelle sur cette carte (ex: points fidélité, avantages...)"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editNote.length}/500 caractères
                </p>
              </div>

              {/* Boutons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowNote(false);
                    setEditNote(card.note || ''); // Reset à la valeur originale
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdateCard}
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-900">Supprimer la carte</h3>
              <button onClick={() => setShowDelete(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Avertissement */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm font-medium text-red-800">Attention !</p>
                </div>
                <p className="text-sm text-red-700 mt-2">
                  Vous êtes sur le point de supprimer définitivement la carte <strong>{card.name}</strong>.
                  Cette action est irréversible et supprimera également toutes les photos associées.
                </p>
              </div>

              {/* Boutons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowDelete(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteCard}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'Suppression...' : '🗑️ Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeModal; 