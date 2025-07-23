import { useState, useEffect } from 'react';
import { CogIcon, UserIcon, BuildingStorefrontIcon, BellIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Badge } from '../ui/Badge';
import { db } from '../../utils/firebase';
import { doc, getDoc, setDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { Modal } from '../ui/Modal';

export function Settings({ userRole }: { userRole: string | null }) {
  const [activeTab, setActiveTab] = useState('restaurant');
  const [userMsg, setUserMsg] = useState<string | null>(null);

  const tabs = [
    { id: 'restaurant', label: 'Restaurant', icon: BuildingStorefrontIcon },
    { id: 'users', label: 'Users', icon: UserIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'integrations', label: 'Integrations', icon: CogIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <Badge variant="success">All Systems Online</Badge>
      </div>

      {userRole === 'admin' && (
        <div className="card mb-6 p-4">
          <h2 className="text-lg font-bold mb-2">Add New User</h2>
          <form onSubmit={async e => {
            e.preventDefault();
            setUserMsg(null);
            const form = e.target as HTMLFormElement;
            let email = form.username.value.trim();
            const password = form.password.value;
            const role = form.role as string;
            if (!email.includes('@')) {
              email = `${email}@khilao.com`;
            }
            try {
              const auth = getAuth();
              const userCred = await createUserWithEmailAndPassword(auth, email, password);
              await setDoc(doc(collection(db, 'users'), userCred.user.uid), {
                name: form.username.value.trim(),
                email,
                role,
              });
              setUserMsg('User created successfully!');
              form.reset();
            } catch (err: any) {
              setUserMsg('Error: ' + (err.message || err.code));
            }
          }} className="flex flex-col gap-3 md:flex-row md:items-end">
            <input name="username" placeholder="Username" className="input" required />
            <input name="password" type="password" placeholder="Password" className="input" required />
            <select name="role" className="input" required>
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
              <option value="kitchen">Kitchen</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">Add User</button>
            {userMsg && <span className="text-sm ml-2">{userMsg}</span>}
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-gray-500 hover:text-blue-600 hover:border-blue-200'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'restaurant' && <RestaurantSettings />}
        {activeTab === 'users' && <UserSettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'security' && <SecuritySettings />}
        {activeTab === 'integrations' && <IntegrationSettings />}
      </div>
    </div>
  );
}

function RestaurantSettings() {
  const [form, setForm] = useState({
    name: '',
    contact: '',
    address: '',
    gst: '',
    fssai: '',
    establishmentType: 'QSR',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      const ref = doc(db, 'settings', 'restaurant');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setForm({
          name: data.name || '',
          contact: data.contact || '',
          address: data.address || '',
          gst: data.gst || '',
          fssai: data.fssai || '',
          establishmentType: data.establishmentType || 'QSR',
        });
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await setDoc(doc(db, 'settings', 'restaurant'), { ...form }, { merge: true });
    alert('Settings saved!');
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="card rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Information</h3>
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restaurant Name
              </label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Number
              </label>
              <input type="tel" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} className="input w-full" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              rows={3}
              className="input w-full"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST Number
              </label>
              <input type="text" value={form.gst} onChange={e => setForm(f => ({ ...f, gst: e.target.value }))} className="input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FSSAI License
              </label>
              <input type="text" value={form.fssai} onChange={e => setForm(f => ({ ...f, fssai: e.target.value }))} className="input w-full" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Establishment Type
            </label>
            <select
              value={form.establishmentType}
              onChange={e => setForm(f => ({ ...f, establishmentType: e.target.value }))}
              className="input w-full"
              required
            >
              <option value="QSR">QSR (Quick Serve Restaurant)</option>
              <option value="FSR">Full-Service Restaurant</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <div className="card rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours</h3>
        <div className="space-y-4">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
            <div key={day} className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{day}</span>
              <div className="flex items-center space-x-2">
                <input type="time" defaultValue="10:00" className="input" />
                <span className="text-gray-500">to</span>
                <input type="time" defaultValue="22:00" className="input" />
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm text-gray-600">Closed</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserSettings() {
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'cashier', status: 'active', password: '' });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          email: data.email || '',
          role: data.role || '',
          status: data.status || 'active',
        };
      }));
    });
    return () => unsub();
  }, []);

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, status: user.status, password: '' });
    setShowModal(true);
    setMsg(null);
  };

  const handleDelete = async (user: any) => {
    if (!window.confirm(`Delete user ${user.name}?`)) return;
    await deleteDoc(doc(db, 'users', user.id));
  };

  const handleAdd = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', role: 'cashier', status: 'active', password: '' });
    setShowModal(true);
    setMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!form.email.includes('@')) {
      setMsg('Email must be valid.');
      return;
    }
    if (!form.name) {
      setMsg('Name is required.');
      return;
    }
    if (!form.role) {
      setMsg('Role is required.');
      return;
    }
    if (editingUser) {
      // Edit user (update Firestore)
      await setDoc(doc(db, 'users', editingUser.id), {
        name: form.name,
        email: form.email,
        role: form.role,
        status: form.status,
      }, { merge: true });
      setShowModal(false);
    } else {
      // Add user (create Auth + Firestore)
      try {
        const auth = getAuth();
        const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await setDoc(doc(collection(db, 'users'), userCred.user.uid), {
          name: form.name,
          email: form.email,
          role: form.role,
          status: form.status,
        });
        setShowModal(false);
      } catch (err: any) {
        setMsg('Error: ' + (err.message || err.code));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="card rounded-xl shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
          <button className="btn btn-primary rounded-lg shadow" onClick={handleAdd}>Add User</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">User</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Role</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Status</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={user.role === 'admin' ? 'primary' : 'gray'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={user.status === 'active' ? 'success' : 'error'}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button className="text-primary-600 hover:text-primary-900 mr-3" onClick={() => handleEdit(user)}>
                      Edit
                    </button>
                    <button className="text-error-600 hover:text-error-900" onClick={() => handleDelete(user)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add/Edit User Modal */}
      {showModal && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingUser ? 'Edit User' : 'Add User'}>
          <form className="space-y-4" onSubmit={handleSave}>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" className="input w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" className="input w-full" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required disabled={!!editingUser} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select className="input w-full" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="kitchen">Kitchen</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select className="input w-full" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} required>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {!editingUser && (
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input type="password" className="input w-full" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
            )}
            {msg && <div className="text-error-600 text-sm">{msg}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary rounded-lg shadow" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary rounded-lg shadow">{editingUser ? 'Save' : 'Add'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div className="card rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Order Notifications</h4>
              <p className="text-sm text-gray-600">Receive email alerts for new orders</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Low Stock Alerts</h4>
              <p className="text-sm text-gray-600">Get notified when inventory is running low</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Daily Reports</h4>
              <p className="text-sm text-gray-600">Receive daily sales and performance reports</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div className="card rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Password Policy</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Minimum password length</span>
            <select className="input w-24">
              <option>8</option>
              <option>12</option>
              <option>16</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Require uppercase letters</span>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Require numbers</span>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Require special characters</span>
            <input type="checkbox" />
          </div>
        </div>
      </div>

      <div className="card rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Session timeout (minutes)</span>
            <input type="number" defaultValue="30" className="input w-24" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Auto-logout on inactivity</span>
            <input type="checkbox" defaultChecked />
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationSettings() {
  const integrations = [
    { 
      name: 'Swiggy', 
      status: 'connected', 
      description: 'Online food delivery platform',
      logo: '🍔'
    },
    { 
      name: 'Zomato', 
      status: 'connected', 
      description: 'Food delivery and restaurant discovery',
      logo: '🍽️'
    },
    { 
      name: 'PayTM', 
      status: 'disconnected', 
      description: 'Digital payment solution',
      logo: '💳'
    },
    { 
      name: 'Tally', 
      status: 'disconnected', 
      description: 'Accounting software integration',
      logo: '📊'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="card rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Third-Party Integrations</h3>
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div key={integration.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{integration.logo}</div>
                <div>
                  <h4 className="font-medium text-gray-900">{integration.name}</h4>
                  <p className="text-sm text-gray-600">{integration.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant={integration.status === 'connected' ? 'success' : 'gray'}>
                  {integration.status}
                </Badge>
                <button className={`btn btn-sm ${
                  integration.status === 'connected' ? 'btn-secondary' : 'btn-primary'
                }`}>
                  {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}