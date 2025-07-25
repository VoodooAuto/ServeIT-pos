import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/ui/Sidebar';
import { Dashboard } from './components/modules/Dashboard';
import { POS } from './components/modules/POS';
import { Inventory } from './components/modules/Inventory';
import { Invoices } from './components/modules/Billing';
import { Staff } from './components/modules/Staff';
import { InvoiceAI } from './components/modules/InvoiceAI';
import { Tasks } from './components/modules/Tasks';
import { Analytics } from './components/modules/Analytics';
import { Settings } from './components/modules/Settings';
import { Menu } from './components/modules/Menu';
import { EstablishmentTypeProvider } from './utils/establishmentType';
import { SignIn } from './components/ui/SignIn';

import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { db } from './utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';

type CartItem = {
  menuItem: {
    name: string;
    price: number;
  };
  quantity: number;
  price?: number;
};

function App() {
  const [activeModule, setActiveModule] = useState<string>(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    return hash || 'dashboard';
  });

  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const auth = getAuth();

  // Load Auth User
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        setUserRole(userDoc.data()?.role || null);
      } else {
        setUserRole(null);
      }
    });
    return () => unsub();
  }, [auth]);

  // Fetch Restaurant Name
  useEffect(() => {
    async function fetchRestaurantName() {
      const ref = doc(db, 'settings', 'restaurant');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setRestaurantName(snap.data().name || '');
      }
    }
    fetchRestaurantName();
  }, []);

  // React to URL hash change
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      setActiveModule(hash || 'dashboard');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sign out
  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setUserRole(null);
  };

  // ➕ Add item to cart
  const addToCart = useCallback((item: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.menuItem.name === item.menuItem.name);
      if (existing) {
        return prev.map((i) =>
          i.menuItem.name === item.menuItem.name
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      } else {
        return [...prev, item];
      }
    });
  }, []);

  // Show Sign In if not logged in
  if (!user) {
    return <SignIn onSignIn={() => setUser(getAuth().currentUser)} />;
  }

  // Show loading while role is being fetched
  if (user && userRole === null) {
    return (
      <div className="flex items-center justify-center h-screen text-xl font-semibold">
        Loading...
      </div>
    );
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'pos':
        return <POS items={cartItems} addToCart={addToCart} />;
      case 'menu':
        return <Menu />;
      case 'inventory':
        return <Inventory />;
      case 'billing':
        return <Invoices />;
      case 'staff':
        return <Staff userRole={userRole} />;
      case 'invoice-ai':
        return <InvoiceAI />;
      case 'tasks':
        return <Tasks />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings userRole={userRole} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <EstablishmentTypeProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top App Bar */}
          <div
            className="w-full px-6 py-3 flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 shadow text-white z-20"
            style={{ position: 'sticky', top: 0 }}
          >
            <div className="flex-1 text-lg font-semibold text-center">
              {restaurantName}
            </div>

            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white text-blue-700 font-semibold shadow hover:bg-blue-50 transition"
                onClick={() => setActiveModule('settings')}
                title="Settings"
              >
                <SettingsIcon fontSize="small" />
              </button>
              <button
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white text-blue-700 font-semibold shadow hover:bg-blue-50 transition"
                onClick={handleSignOut}
                title="Log Out"
              >
                <LogoutIcon fontSize="small" />
                Log Out
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-auto">
            <div className={activeModule === 'pos' ? 'h-full flex flex-col' : ''}>
              {activeModule === 'pos' ? (
                <div className="flex flex-1 h-full w-full gap-4 p-6 pt-4">
                  <POS items={cartItems} addToCart={addToCart} />
                </div>
              ) : (
                <div className="p-6 pt-4">{renderModule()}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </EstablishmentTypeProvider>
  );
}

export default App;
