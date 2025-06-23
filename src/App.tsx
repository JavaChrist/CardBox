import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from './services/firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img
              src="/logob192.png"
              alt="CardBox Logo"
              className="h-16 w-16 rounded-2xl shadow-lg animate-pulse"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling!.textContent = '📦';
              }}
            />
            <span className="text-5xl hidden animate-pulse">📦</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">CardBox</h1>
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
            <span className="text-gray-600">Chargement de l'application...</span>
          </div>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}

export default App;
