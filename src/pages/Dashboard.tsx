import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { cardService } from '../services/cardService';
import CardForm from '../components/CardForm';
import CardItem from '../components/CardItem';

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

const Dashboard = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Silencieux - l'utilisateur sera redirigé de toute façon
    }
  };

  const handleCardAdded = (newCard: Card) => {
    setCards(prev => [newCard, ...prev]);
    setShowForm(false);
  };

  const handleCardDeleted = (cardId: string) => {
    setCards(prev => prev.filter(card => card.id !== cardId));
  };

  const handleCardUpdated = () => {
    // Recharger les cartes depuis Firebase après modification
    loadCards();
  };

  const loadCards = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userCards = await cardService.getUserCards(user.uid);
        setCards(userCards);
      }
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header avec logo */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <img
                src="/logo192.png"
                alt="CardBox Logo"
                className="h-10 w-10 rounded-lg shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling!.textContent = '📦';
                }}
              />
              <span className="text-2xl hidden">📦</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CardBox</h1>
                <p className="text-sm text-gray-500">Gestion des cartes de fidélité</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {auth.currentUser?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500">
                  {cards.length} carte{cards.length > 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Titre simple */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Portefeuille
          </h2>
          <p className="text-gray-600">
            Vos cartes de fidélité
          </p>
        </div>

        {/* Card Form Modal */}
        {showForm && (
          <CardForm
            onCardAdded={handleCardAdded}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Cards List avec carte "+" */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white shadow-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-3"></div>
              <span className="text-gray-600">Chargement de vos cartes...</span>
            </div>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune carte de fidélité
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Commencez par ajouter votre première carte de fidélité.
              Prenez une photo pour une analyse automatique des codes-barres et numéros !
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter ma première carte
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {/* Cartes existantes d'abord */}
            {cards.map((card) => (
              <div key={card.id}>
                <CardItem
                  card={card}
                  onCardDeleted={handleCardDeleted}
                  onCardUpdated={handleCardUpdated}
                />
              </div>
            ))}

            {/* Carte "+" à la fin */}
            <button
              onClick={() => setShowForm(true)}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer p-8 flex flex-col items-center justify-center min-h-[200px] border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
            >
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Ajouter une carte</h3>
              <p className="text-sm text-gray-500 text-center">Cliquez pour choisir une marque</p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;