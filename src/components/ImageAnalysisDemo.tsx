import React, { useState } from 'react';
import { ImageAnalysisService, type AnalysisResult } from '../services/imageAnalysisService';

const ImageAnalysisDemo: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Créer une prévisualisation
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Réinitialiser les résultats précédents
      setResult(null);
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;

    try {
      setAnalyzing(true);
      setResult(null);

      console.log('🔍 Début de l\'analyse...');
      const analysisResult = await ImageAnalysisService.analyzeImage(selectedFile);

      setResult(analysisResult);
      console.log('✅ Analyse terminée:', analysisResult);

    } catch (error) {
      console.error('❌ Erreur:', error);
      setResult({
        barcodes: [],
        text: '',
        numbers: [],
        success: false,
        error: 'Erreur lors de l\'analyse'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalyzing(false);
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        🔍 Test d'Analyse d'Images
      </h2>

      {/* Sélection de fichier */}
      <div className="mb-6">
        <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700 mb-2">
          Sélectionner une image de carte de fidélité
        </label>

        {!previewUrl ? (
          <label
            htmlFor="image-upload"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Cliquer pour télécharger</span> ou glisser-déposer
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, WebP (MAX. 10MB)</p>
            </div>
          </label>
        ) : (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Prévisualisation"
              className="w-full h-64 object-contain rounded-xl border border-gray-200"
            />
            <button
              onClick={reset}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Bouton d'analyse */}
      {selectedFile && !analyzing && !result && (
        <button
          onClick={analyzeImage}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
        >
          🔍 Analyser l'image
        </button>
      )}

      {/* Analyse en cours */}
      {analyzing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="text-blue-700">
              <p className="font-medium">🔍 Analyse en cours...</p>
              <p className="text-sm">Détection des codes-barres et texte (peut prendre quelques secondes)</p>
            </div>
          </div>
        </div>
      )}

      {/* Résultats */}
      {result && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Résultats de l'analyse</h3>

          {result.success ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-green-800 mb-3">✅ Informations détectées</h4>

                  {/* Codes-barres */}
                  {result.barcodes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-green-700 mb-2">📊 Codes-barres détectés :</p>
                      {result.barcodes.map((barcode, index) => (
                        <div key={index} className="bg-white p-3 rounded border mb-2">
                          <span className="font-mono text-lg">{barcode}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Numéros */}
                  {result.numbers.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-green-700 mb-2">🔢 Numéros détectés :</p>
                      {result.numbers.map((number, index) => (
                        <div key={index} className="bg-white p-3 rounded border mb-2">
                          <span className="font-mono text-lg">{number}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Texte complet */}
                  {result.text && (
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-2">📄 Texte extrait :</p>
                      <div className="bg-white p-3 rounded border max-h-32 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap">{result.text}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-yellow-800">⚠️ Aucune information détectée</p>
                  <p className="text-sm text-yellow-700">
                    {result.error || "Essayez avec une image plus nette ou mieux éclairée"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bouton pour recommencer */}
          <button
            onClick={reset}
            className="mt-4 w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
          >
            🔄 Tester une autre image
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl">
        <h4 className="font-medium text-gray-900 mb-2">💡 Conseils pour de meilleurs résultats</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 📸 Image nette et bien éclairée</li>
          <li>• 📏 Code-barre centré et visible</li>
          <li>• 🔤 Texte lisible et contrasté</li>
          <li>• 📱 Éviter les reflets et les ombres</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageAnalysisDemo; 