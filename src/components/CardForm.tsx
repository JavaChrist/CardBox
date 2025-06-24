import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../services/firebase';
import { popularBrands } from '../data/popularBrands';
import { ImageAnalysisService, type AnalysisResult } from '../services/imageAnalysisService';

interface PopularBrand {
  id: string;
  name: string;
  logo: string;
  logoUrl: string;
  color: string;
  category: string;
  description: string;
}

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

interface CardFormProps {
  onCardAdded: (card: Card) => void;
  onCancel: () => void;
}

type FormStep = 'brands' | 'method' | 'manual' | 'scan';

const CardForm = ({ onCardAdded, onCancel }: CardFormProps) => {
  const [step, setStep] = useState<FormStep>('brands');
  const [selectedBrand, setSelectedBrand] = useState<PopularBrand | null>(null);
  const [customBrandName, setCustomBrandName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [note, setNote] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showAnalysisResults, setShowAnalysisResults] = useState(false);

  const handleBrandSelect = (brand: PopularBrand) => {
    setSelectedBrand(brand);
    setStep('method');
  };

  const handleMethodSelect = (method: 'scan' | 'manual') => {
    if (method === 'manual') {
      setStep('manual');
    } else {
      setStep('scan');
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);

      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Analyser automatiquement l'image
      await analyzeImage(file);
    }
  };

  const analyzeImage = async (file: File) => {
    try {
      setAnalyzing(true);
      setAnalysisResult(null);
      setShowAnalysisResults(false);

      console.log('🔍 Analyse de l\'image en cours...');
      const result = await ImageAnalysisService.analyzeImage(file);

      setAnalysisResult(result);

      if (result.success) {
        setShowAnalysisResults(true);

        // Pré-remplir automatiquement le champ numéro de carte
        if (result.barcodes.length > 0) {
          setCardNumber(result.barcodes[0]);
        } else if (result.numbers.length > 0) {
          setCardNumber(result.numbers[0]);
        }

        console.log('✅ Analyse terminée avec succès');
      } else {
        console.log('ℹ️ Aucune information détectée dans l\'image');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBrand) {
      console.error('Aucune marque sélectionnée');
      return;
    }

    if (selectedBrand.id === 'divers' && !customBrandName.trim()) {
      console.error('Nom de marque requis pour les marques personnalisées');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      console.error('Utilisateur non connecté');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = '';

      // Upload de l'image si elle existe
      if (image) {
        const imageRef = ref(storage, `cards/${user.uid}/${Date.now()}_${image.name}`);
        const uploadResult = await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      // Utiliser le nom personnalisé si c'est une marque "divers"
      const finalBrandName = selectedBrand.id === 'divers' ? customBrandName.trim() : selectedBrand.name;

      // Sauvegarde en base
      const cardData = {
        name: finalBrandName,
        type: selectedBrand.category,
        brandId: selectedBrand.id,
        logoUrl: selectedBrand.logoUrl,
        cardNumber: cardNumber.trim(),
        note: note.trim(),
        imageUrl: imageUrl || '',
        userId: user.uid,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'cards'), cardData);

      const newCard: Card = {
        id: docRef.id,
        ...cardData,
      };

      // Reset du formulaire
      setStep('brands');
      setSelectedBrand(null);
      setCustomBrandName('');
      setCardNumber('');
      setNote('');
      setImage(null);
      setPreviewUrl(null);
      setAnalyzing(false);
      setAnalysisResult(null);
      setShowAnalysisResults(false);

      onCardAdded(newCard);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la carte:', error);
      // L'erreur sera affichée dans la console
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">

        {/* ÉTAPE 1: Sélection de marque */}
        {step === 'brands' && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Choisir une marque</h2>
              <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-6 text-center">Sélectionnez la marque de votre carte de fidélité</p>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {popularBrands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => handleBrandSelect(brand)}
                    className="w-full flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-r ${brand.color} rounded-xl flex items-center justify-center text-white text-xl overflow-hidden`}>
                      <img
                        src={brand.logoUrl}
                        alt={brand.name}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          // Fallback vers l'emoji si l'image ne charge pas
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling!.textContent = brand.logo;
                          (target.nextElementSibling as HTMLElement)!.style.display = 'block';
                        }}
                      />
                      <span className="hidden text-xl">{brand.logo}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{brand.name}</h3>
                      <p className="text-sm text-gray-500">{brand.description}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ÉTAPE 2: Méthode d'ajout */}
        {step === 'method' && selectedBrand && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <button onClick={() => setStep('brands')} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-xl font-bold text-gray-900">{selectedBrand.name}</h2>
              </div>
              <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-6 text-center">Comment souhaitez-vous ajouter votre carte ?</p>

              <div className="space-y-4">
                <button
                  onClick={() => handleMethodSelect('scan')}
                  className="w-full flex items-center space-x-4 p-6 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border-2 border-transparent hover:border-blue-200"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl">
                    📱
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">Scanner le code-barres</h3>
                    <p className="text-sm text-gray-600">Utilisez l'appareil photo pour scanner</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>

                <button
                  onClick={() => handleMethodSelect('manual')}
                  className="w-full flex items-center space-x-4 p-6 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border-2 border-transparent hover:border-gray-200"
                >
                  <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center text-white text-xl">
                    ✏️
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">Saisir manuellement</h3>
                    <p className="text-sm text-gray-600">Entrer les informations à la main</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ÉTAPE 3: Scanner (simulation) */}
        {step === 'scan' && selectedBrand && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <button onClick={() => setStep('method')} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-xl font-bold text-gray-900">Scanner</h2>
              </div>
              <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 text-center">
              <div className="w-64 h-48 mx-auto bg-gray-900 rounded-xl flex items-center justify-center mb-6 relative overflow-hidden">
                <div className="text-white text-4xl">📱</div>
                {/* Animation de scan */}
                <div className="absolute inset-0 border-2 border-red-500 rounded-xl">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-pulse"></div>
                </div>
              </div>

              <p className="text-gray-600 mb-6">Placez votre carte devant l'appareil photo</p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    // Simulation d'un scan réussi
                    setCardNumber('1234567890123');
                    setStep('manual');
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl font-medium transition-colors"
                >
                  ✓ Simuler scan réussi
                </button>

                <button
                  onClick={() => setStep('manual')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-medium transition-colors"
                >
                  Saisir manuellement
                </button>
              </div>
            </div>
          </>
        )}

        {/* ÉTAPE 4: Saisie manuelle */}
        {step === 'manual' && selectedBrand && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <button onClick={() => setStep('method')} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-xl font-bold text-gray-900">Informations</h2>
              </div>
              <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Prévisualisation de la marque */}
              <div className={`bg-gradient-to-r ${selectedBrand.color} p-4 rounded-xl text-white text-center`}>
                <div className="mb-2 flex justify-center">
                  <img
                    src={selectedBrand.logoUrl}
                    alt={selectedBrand.name}
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling!.textContent = selectedBrand.logo;
                      (target.nextElementSibling as HTMLElement)!.style.display = 'block';
                    }}
                  />
                  <span className="hidden text-3xl">{selectedBrand.logo}</span>
                </div>
                <h3 className="font-bold text-lg">
                  {selectedBrand.id === 'divers' && customBrandName.trim()
                    ? customBrandName.trim()
                    : selectedBrand.name}
                </h3>
              </div>

              {/* Nom de marque personnalisé si "Autre marque" */}
              {selectedBrand.id === 'divers' && (
                <div>
                  <label htmlFor="customBrandName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la marque *
                  </label>
                  <input
                    id="customBrandName"
                    type="text"
                    value={customBrandName}
                    onChange={(e) => setCustomBrandName(e.target.value)}
                    placeholder="Ex: Magasin du coin, Mon coiffeur..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
              )}

              {/* Numéro de carte */}
              <div>
                <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de carte (optionnel)
                </label>
                <input
                  id="cardNumber"
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="Ex: 1234567890123"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono"
                />
              </div>

              {/* Note */}
              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
                  Note (optionnel)
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ajouter une note personnelle..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                />
              </div>

              {/* Photo optionnelle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo de la carte (optionnel)
                </label>

                {previewUrl ? (
                  <div className="mb-4">
                    <img
                      src={previewUrl}
                      alt="Prévisualisation"
                      className="w-full h-32 object-cover rounded-xl border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        setPreviewUrl(null);
                      }}
                      className="mt-2 text-sm text-red-600 hover:text-red-700"
                    >
                      Supprimer la photo
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="image"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center p-4">
                      <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-sm text-gray-500 text-center">Ajouter une photo</p>
                    </div>
                  </label>
                )}

                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />

                {/* Alternative pour ouvrir la caméra directement */}
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('image') as HTMLInputElement;
                    if (input) {
                      // Forcer l'ouverture de la caméra sur mobile
                      input.setAttribute('capture', 'environment');
                      input.click();
                    }
                  }}
                  className="mt-2 w-full bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>📸 Prendre une photo</span>
                </button>

                {/* Indicateur d'analyse en cours */}
                {analyzing && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <div className="text-blue-700">
                        <p className="font-medium">🔍 Analyse en cours...</p>
                        <p className="text-sm">Détection des codes-barres et texte</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Résultats de l'analyse */}
                {showAnalysisResults && analysisResult && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-green-800 mb-2">✅ Informations détectées</h4>

                        {/* Codes-barres détectés */}
                        {analysisResult.barcodes.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-green-700 mb-1">📊 Codes-barres :</p>
                            {analysisResult.barcodes.map((barcode, index) => (
                              <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                                <span className="font-mono text-sm">{barcode}</span>
                                <button
                                  type="button"
                                  onClick={() => setCardNumber(barcode)}
                                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                >
                                  Utiliser
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Numéros détectés */}
                        {analysisResult.numbers.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-green-700 mb-1">🔢 Numéros détectés :</p>
                            {analysisResult.numbers.slice(0, 3).map((number, index) => (
                              <div key={index} className="flex items-center justify-between bg-white p-2 rounded border mb-1">
                                <span className="font-mono text-sm">{number}</span>
                                <button
                                  type="button"
                                  onClick={() => setCardNumber(number)}
                                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                >
                                  Utiliser
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Bouton pour cacher les résultats */}
                        <button
                          type="button"
                          onClick={() => setShowAnalysisResults(false)}
                          className="text-xs text-green-600 hover:text-green-800 underline"
                        >
                          Masquer les résultats
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message si aucune information détectée */}
                {analysisResult && !analysisResult.success && !analyzing && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-yellow-800">⚠️ Aucune information détectée</p>
                        <p className="text-sm text-yellow-700">Vous pouvez saisir manuellement les informations</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Boutons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep('method')}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                  disabled={loading}
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 px-6 py-3 bg-gradient-to-r ${selectedBrand.color} text-white rounded-xl font-medium transition-colors hover:shadow-lg disabled:opacity-50`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Ajout...
                    </span>
                  ) : (
                    'Ajouter la carte'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default CardForm; 