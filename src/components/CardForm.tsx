import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
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

type FormStep = 'brands' | 'method' | 'manual';

const CardForm = ({ onCardAdded, onCancel }: CardFormProps) => {
  const [step, setStep] = useState<FormStep>('brands');
  const [selectedBrand, setSelectedBrand] = useState<PopularBrand | null>(null);
  const [customBrandName, setCustomBrandName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [note, setNote] = useState('');
  const [, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showAnalysisResults, setShowAnalysisResults] = useState(false);

  // DEBUG pour mobile
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addDebugLog = (message: string) => {
    setDebugLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleBrandSelect = (brand: PopularBrand) => {
    setSelectedBrand(brand);
    setStep('method');
  };

  const handleMethodSelect = (method: 'scan' | 'manual') => {
    if (method === 'manual') {
      setStep('manual');
    } else {
      // Ouvrir directement la caméra au lieu d'aller à l'étape scan
      triggerCameraCapture();
      setStep('manual');
    }
  };

  const triggerCameraCapture = () => {
    try {
      // Créer un input temporaire pour ouvrir la caméra
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Caméra arrière sur mobile
      input.style.display = 'none';
      input.style.position = 'absolute';
      input.style.top = '-9999px';

      const handleChange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          const file = target.files[0];
          setImage(file);

          const reader = new FileReader();
          reader.onload = () => {
            setPreviewUrl(reader.result as string);
          };
          reader.readAsDataURL(file);

          // Analyser automatiquement l'image
          await analyzeImage(file);
        }
        // Nettoyer l'input temporaire
        try {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        } catch {
          // Input déjà supprimé
        }
      };

      const handleCancel = () => {
        // Nettoyer si l'utilisateur annule
        try {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        } catch {
          // Input déjà supprimé
        }
      };

      input.addEventListener('change', handleChange);
      input.addEventListener('cancel', handleCancel);

      document.body.appendChild(input);

      // Déclencher l'ouverture de la caméra
      setTimeout(() => {
        input.click();
      }, 100);

    } catch {
      // Erreur silencieuse
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
      setDebugLogs([]);
      setShowDebug(true);

      addDebugLog(`🔍 DEBUT ANALYSE: ${file.name} (${file.size} bytes)`);

      const result = await ImageAnalysisService.analyzeImage(file);

      addDebugLog(`📊 QuaggaJS: ${result.barcodes.length} codes détectés`);
      if (result.barcodes.length > 0) {
        addDebugLog(`✅ CODES: ${result.barcodes.join(', ')}`);
      }

      addDebugLog(`🔢 OCR: ${result.numbers.length} numéros détectés`);
      if (result.numbers.length > 0) {
        addDebugLog(`📝 NUMEROS: ${result.numbers.slice(0, 3).join(', ')}`);
      }

      setAnalysisResult(result);

      if (result.success) {
        setShowAnalysisResults(true);

        // PRIORITÉ 1 : QR codes détectés (LIDL, etc.)
        if (result.qrcodes.length > 0) {
          setCardNumber(result.qrcodes[0]);
          addDebugLog(`🎯 QR CODE UTILISÉ: ${result.qrcodes[0]}`);
        }
        // PRIORITÉ 2 : Codes-barres détectés par QuaggaJS
        else if (result.barcodes.length > 0) {
          setCardNumber(result.barcodes[0]);
          addDebugLog(`📊 CODE-BARRE UTILISÉ: ${result.barcodes[0]}`);
        }
        // PRIORITÉ 3 : Utiliser le MEILLEUR numéro OCR (déjà trié par l'algorithme)
        else if (result.numbers.length > 0) {
          setCardNumber(result.numbers[0]);
          addDebugLog(`⭐ NUMÉRO RECOMMANDÉ AUTO-SÉLECTIONNÉ: ${result.numbers[0]}`);
        }
      } else {
        addDebugLog(`❌ ECHEC ANALYSE: Aucune info détectée`);
      }
    } catch (error) {
      addDebugLog(`💥 ERREUR: ${error}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBrand) {
      return;
    }

    if (selectedBrand.id === 'divers' && !customBrandName.trim()) {
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      return;
    }

    setLoading(true);

    try {
      // Utiliser le nom personnalisé si c'est une marque "divers"
      const finalBrandName = selectedBrand.id === 'divers' ? customBrandName.trim() : selectedBrand.name;

      // Sauvegarde en base (sans photo - juste les données)
      const cardData = {
        name: finalBrandName,
        type: selectedBrand.category,
        brandId: selectedBrand.id,
        logoUrl: selectedBrand.logoUrl,
        cardNumber: cardNumber.trim(),
        note: note.trim(),
        imageUrl: '', // Plus de stockage d'images
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
    } catch {
      // Erreur silencieuse
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
                    <h3 className="font-semibold text-gray-900">Prendre une photo</h3>
                    <p className="text-sm text-gray-600">Analyse automatique des codes-barres et numéros</p>
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

        {/* ÉTAPE 3: Saisie manuelle */}
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
                {/* Indicateur d'auto-sélection */}
                {cardNumber && analysisResult && analysisResult.success && (
                  <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700 flex items-center">
                      <span className="mr-1">⭐</span>
                      Numéro recommandé auto-sélectionné - Vous pouvez le modifier ou en choisir un autre ci-dessous
                    </p>
                  </div>
                )}
                <input
                  id="cardNumber"
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="Ex: 1234567890123"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono ${cardNumber && analysisResult && analysisResult.success
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300'
                    }`}
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

                        {/* QR codes détectés (PRIORITÉ ABSOLUE) */}
                        {analysisResult.qrcodes.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-blue-700 mb-1">📱 QR Codes (ULTRA-FIABLES) :</p>
                            {analysisResult.qrcodes.map((qrcode, index) => (
                              <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-300 shadow-sm mb-2">
                                <div className="flex items-center space-x-3">
                                  <span className="text-lg">🏆</span>
                                  <div>
                                    <span className="text-xs font-bold text-blue-700 bg-blue-200 px-2 py-1 rounded-full mb-1 block">
                                      QR CODE - PRIORITÉ MAX
                                    </span>
                                    <span className="font-mono text-sm font-bold text-blue-800 break-all">
                                      {qrcode.length > 30 ? `${qrcode.substring(0, 30)}...` : qrcode}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCardNumber(qrcode)}
                                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 hover:shadow-sm transition-all"
                                >
                                  Utiliser
                                </button>
                              </div>
                            ))}
                            <p className="text-xs text-blue-600 flex items-center">
                              <span className="mr-1">🏆</span>
                              QR codes détectés - Fiabilité maximale (Lidl, etc.)
                            </p>
                          </div>
                        )}

                        {/* Codes-barres détectés (PRIORITÉ HAUTE) */}
                        {analysisResult.barcodes.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-green-700 mb-1">📊 Codes-barres (FIABLES) :</p>
                            {analysisResult.barcodes.map((barcode, index) => (
                              <div key={index} className="flex items-center justify-between bg-green-50 p-2 rounded border border-green-200">
                                <span className="font-mono text-sm font-bold">{barcode}</span>
                                <button
                                  type="button"
                                  onClick={() => setCardNumber(barcode)}
                                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                >
                                  Utiliser
                                </button>
                              </div>
                            ))}
                            <p className="text-xs text-green-600 mt-1">✅ Codes-barres détectés automatiquement</p>
                          </div>
                        )}

                        {/* Numéros OCR avec recommandation intelligente */}
                        {analysisResult.numbers.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-orange-700 mb-1">🔢 Numéros détectés (OCR) :</p>
                            {analysisResult.numbers.slice(0, 3).map((number, index) => (
                              <div key={index} className={`flex items-center justify-between p-3 rounded-lg border mb-2 ${index === 0
                                ? 'bg-green-50 border-green-300 shadow-sm'
                                : 'bg-orange-50 border-orange-200'
                                }`}>
                                <div className="flex items-center space-x-3">
                                  {index === 0 && (
                                    <div className="flex items-center space-x-1">
                                      <span className="text-lg">⭐</span>
                                      <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded-full">
                                        RECOMMANDÉ
                                      </span>
                                    </div>
                                  )}
                                  <span className={`font-mono text-sm ${index === 0 ? 'font-bold text-green-800' : 'text-orange-800'}`}>
                                    {number}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCardNumber(number)}
                                  className={`text-xs text-white px-3 py-1.5 rounded-md hover:shadow-sm transition-all ${index === 0
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-orange-600 hover:bg-orange-700'
                                    }`}
                                >
                                  Utiliser
                                </button>
                              </div>
                            ))}
                            <div className="text-xs space-y-1">
                              <p className="text-green-600 flex items-center">
                                <span className="mr-1">⭐</span>
                                Le numéro recommandé a le meilleur score de fiabilité
                              </p>
                              <p className="text-orange-600 flex items-center">
                                <span className="mr-1">⚠️</span>
                                Vérifiez que le numéro choisi correspond à votre carte physique
                              </p>
                            </div>
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

                {/* DEBUG pour mobile */}
                {showDebug && debugLogs.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-900 text-green-400 rounded-xl text-xs font-mono">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-bold">🔍 DEBUG ANALYSE</span>
                      <button
                        type="button"
                        onClick={() => setShowDebug(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {debugLogs.map((log, index) => (
                        <div key={index} className="text-xs">{log}</div>
                      ))}
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