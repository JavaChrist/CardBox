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

// Données de démonstration
const DEMO_CARDS: Card[] = [
  {
    id: 'demo-1',
    name: 'Carrefour',
    type: 'supermarche',
    imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=250&fit=crop',
    createdAt: new Date('2024-01-15'),
    userId: 'demo'
  },
  {
    id: 'demo-2',
    name: 'Pharmacie du Centre',
    type: 'pharmacie',
    imageUrl: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=400&h=250&fit=crop',
    createdAt: new Date('2024-01-10'),
    userId: 'demo'
  },
  {
    id: 'demo-3',
    name: 'Restaurant La Bonne Table',
    type: 'restaurant',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop',
    createdAt: new Date('2024-01-08'),
    userId: 'demo'
  },
  {
    id: 'demo-4',
    name: 'Decathlon',
    type: 'sport',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=250&fit=crop',
    createdAt: new Date('2024-01-05'),
    userId: 'demo'
  },
  {
    id: 'demo-5',
    name: 'Sephora',
    type: 'beaute',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=250&fit=crop',
    createdAt: new Date('2024-01-02'),
    userId: 'demo'
  }
];

const Dashboard = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);


  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
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
    if (!isDemo) {
      loadCards();
    }
  };

  const loadCards = async (forceFirebase = false) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userCards = await cardService.getUserCards(user.uid);
        setCards(userCards);
        setIsDemo(false);
        console.log(`✅ ${userCards.length} cartes chargées depuis Firebase`);
      }
    } catch (error: unknown) {
      console.error('Erreur lors du chargement des cartes:', error);
      // Si c'est un problème de permissions
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'permission-denied') {
        console.log('💡 Veuillez configurer les règles Firebase Firestore et Storage');

        if (forceFirebase) {
          // Si on force le Firebase, on vide les cartes et on reste en mode Firebase
          setCards([]);
          setIsDemo(false);
        } else if (!isDemo && cards.length === 0) {
          // Sinon, mode démo automatique
          setCards(DEMO_CARDS);
          setIsDemo(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const enableDemo = () => {
    setCards(DEMO_CARDS);
    setIsDemo(true);
    setLoading(false);
  };

  const tryLoadFirebase = async () => {
    setLoading(true);
    setCards([]); // Vider les cartes démo d'abord
    setIsDemo(false); // Sortir du mode démo
    await loadCards(true); // Forcer le chargement Firebase
  };

  useEffect(() => {
    // Essayer de charger les cartes Firebase au démarrage
    const initLoad = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (user) {
          const userCards = await cardService.getUserCards(user.uid);
          if (userCards.length > 0) {
            setCards(userCards);
            setIsDemo(false);
            console.log(`✅ ${userCards.length} cartes chargées depuis Firebase`);
          } else {
            // Si pas de cartes, mode démo automatique
            console.log('Aucune carte trouvée, activation du mode démo');
            setCards(DEMO_CARDS);
            setIsDemo(true);
          }
        }
      } catch (error: unknown) {
        console.error('Erreur au chargement initial:', error);
        // En cas d'erreur, mode démo par défaut
        setCards(DEMO_CARDS);
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    };

    initLoad();
  }, []);



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header avec logo */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <img
                src="/logob192.png"
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
                <p className="text-sm text-gray-500">
                  Gestion des cartes de fidélité {isDemo && '(Mode Démo)'}
                </p>
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

      {/* Bannière d'information pour Firebase */}
      {isDemo && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-amber-600">⚠️</div>
                <div>
                  <p className="text-sm font-medium text-amber-800">Mode démonstration activé</p>
                  <p className="text-xs text-amber-700">
                    Vos vraies cartes sont dans Firebase. Configurez les règles ou essayez de les charger.
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={tryLoadFirebase}
                  disabled={loading}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : '🔄 Mes vraies cartes'}
                </button>
                <button
                  onClick={() => window.open('https://console.firebase.google.com', '_blank')}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-md font-medium transition-colors"
                >
                  ⚙️ Configurer Firebase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bannière pour mode Firebase avec erreurs */}
      {!isDemo && cards.length === 0 && !loading && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-red-600">🔒</div>
                <div>
                  <p className="text-sm font-medium text-red-800">Impossible de charger vos cartes Firebase</p>
                  <p className="text-xs text-red-700">
                    Vos cartes existent dans Firebase mais les règles de sécurité bloquent l'accès.
                    Configurez les règles pour les voir.
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={enableDemo}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-md font-medium transition-colors"
                >
                  🎮 Revenir au mode démo
                </button>
                <button
                  onClick={() => window.open('https://console.firebase.google.com', '_blank')}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md font-medium transition-colors"
                >
                  ⚙️ Configurer Firebase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer p-8 flex flex-col items-center justify-center min-h-[200px] border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
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