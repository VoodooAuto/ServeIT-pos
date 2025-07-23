import React, { useEffect, useState } from 'react';
import { db } from '../../utils/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Modal } from '../ui/Modal';
import { Table } from '../ui/Table';
import { PlusIcon } from '@heroicons/react/24/outline';
import { PencilIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

interface Ingredient {
  name: string;
  quantity: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  recipe?: Ingredient[];
}

export function Menu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [recipe, setRecipe] = useState<Ingredient[]>([{ name: '', quantity: '' }]);
  const [ingredientsList, setIngredientsList] = useState<{ id: string; name: string }[]>([]);

  // Add userRole (replace with real context/prop in production)
  const userRole = 'admin';

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', price: '', category: '', recipe: '' });
  const [editRecipe, setEditRecipe] = useState<Ingredient[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingEditSave, setPendingEditSave] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      price: item.price.toString(),
      category: item.category || '',
      recipe: '', // Always include recipe property
    });
    setEditRecipe(item.recipe ? item.recipe.map(ing => ({ ...ing })) : [{ name: '', quantity: '' }]);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    // If recipe changed, require password
    if (editingItem && JSON.stringify(editingItem.recipe || []) !== JSON.stringify(editRecipe)) {
      setShowPasswordModal(true);
      setPendingEditSave(true);
      return;
    }
    await doEditSave();
  };

  const doEditSave = async () => {
    if (!editingItem) return;
    const ref = collection(db, 'menuItems');
    await updateDoc(doc(ref, editingItem.id), {
      name: editForm.name,
      price: Number(editForm.price),
      category: editForm.category,
      recipe: editRecipe.filter(ing => ing.name && ing.quantity),
    });
    setShowEditModal(false);
    setEditingItem(null);
    setPendingEditSave(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !user.email) {
      setPasswordError('No user session. Please sign in again.');
      return;
    }
    const credential = EmailAuthProvider.credential(user.email, password);
    try {
      await reauthenticateWithCredential(user, credential);
      setShowPasswordModal(false);
      setPassword('');
      await doEditSave();
    } catch (err) {
      setPasswordError('Incorrect password.');
    }
  };

  // Fetch ingredients for dropdown
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      setIngredientsList(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addMenuItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const price = Number(formData.get('price'));
    const category = formData.get('category') as string;
    const recipeData = recipe.filter(ing => ing.name && ing.quantity);
    await addDoc(collection(db, 'menuItems'), {
      name,
      price,
      category,
      recipe: recipeData,
    });
    setShowAddModal(false);
    setRecipe([{ name: '', quantity: '' }]);
  };

  // Add edit column to table
  const columns: (any | null)[] = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price', render: (value: number) => `₹${value}` },
    { key: 'recipe', label: 'Recipe', render: (value: Ingredient[]) => value ? value.map(ing => `${ing.name} (${ing.quantity})`).join(', ') : '—' },
    userRole === 'admin' ? {
      key: 'edit',
      label: '',
      render: (_: any, row: MenuItem) => (
        <button
          className="p-1 rounded hover:bg-blue-100"
          title="Edit"
          onClick={() => openEditModal(row)}
        >
          <PencilIcon className="h-4 w-4 text-blue-600" />
        </button>
      )
    } : null
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Menu Items</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          <PlusIcon className="h-4 w-4" /> Add Item
        </button>
      </div>
      <div className="card">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading menu items...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No menu items found.</div>
        ) : (
          <Table columns={columns.filter((col): col is any => col !== null)} data={items} />
        )}
      </div>
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Menu Item" size="lg">
        <form className="space-y-4" onSubmit={addMenuItem}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input name="name" type="text" className="input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input name="category" type="text" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input name="price" type="number" className="input w-full" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipe (Ingredients)</label>
            {recipe.map((ing, idx) => (
              <div key={idx} className="flex space-x-2 mb-2">
                <div className="w-1/2">
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Search ingredient..."
                    list={`ingredient-options-${idx}`}
                    value={ing.name}
                    onChange={e => setRecipe(recipe.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
                    required
                  />
                  <datalist id={`ingredient-options-${idx}`}>
                    {ingredientsList.map(ingredient => (
                      <option key={ingredient.id} value={ingredient.name} />
                    ))}
                  </datalist>
                </div>
                <input
                  type="text"
                  placeholder="Quantity (e.g. 200g, 2pcs)"
                  className="input w-1/2"
                  value={ing.quantity}
                  onChange={e => setRecipe(recipe.map((r, i) => i === idx ? { ...r, quantity: e.target.value } : r))}
                  required
                />
                {recipe.length > 1 && (
                  <button type="button" className="btn btn-error btn-sm" onClick={() => setRecipe(recipe.filter((_, i) => i !== idx))}>Remove</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={() => setRecipe([...recipe, { name: '', quantity: '' }])}>Add Ingredient</button>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Add Item</button>
          </div>
        </form>
      </Modal>
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)}>
        <DialogTitle>Edit Menu Item</DialogTitle>
        <DialogContent sx={{ minWidth: 320 }}>
          <input
            className="input w-full mb-2"
            value={editForm.name}
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Name"
          />
          <input
            className="input w-full mb-2"
            type="number"
            value={editForm.price}
            onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
            placeholder="Price"
          />
          <input
            className="input w-full mb-2"
            value={editForm.category}
            onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
            placeholder="Category"
          />
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipe (Ingredients)</label>
            {editRecipe.map((ing, idx) => (
              <div key={idx} className="flex space-x-2 mb-2">
                <div className="w-1/2">
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Search ingredient..."
                    list={`edit-ingredient-options-${idx}`}
                    value={ing.name}
                    onChange={e => setEditRecipe(editRecipe.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
                    required
                  />
                  <datalist id={`edit-ingredient-options-${idx}`}>
                    {ingredientsList.map(ingredient => (
                      <option key={ingredient.id} value={ingredient.name} />
                    ))}
                  </datalist>
                </div>
                <input
                  type="text"
                  placeholder="Quantity (e.g. 200g, 2pcs)"
                  className="input w-1/2"
                  value={ing.quantity}
                  onChange={e => setEditRecipe(editRecipe.map((r, i) => i === idx ? { ...r, quantity: e.target.value } : r))}
                  required
                />
                {editRecipe.length > 1 && (
                  <button type="button" className="btn btn-error btn-xs" onClick={() => setEditRecipe(editRecipe.filter((_, i) => i !== idx))}>Remove</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-xs mt-2" onClick={() => setEditRecipe([...editRecipe, { name: '', quantity: '' }])}>Add Ingredient</button>
          </div>
        </DialogContent>
        <DialogActions>
          <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEditSave}>Save</button>
        </DialogActions>
      </Dialog>
      <Dialog open={showPasswordModal} onClose={() => setShowPasswordModal(false)}>
        <DialogTitle>Re-enter Password</DialogTitle>
        <form onSubmit={handlePasswordSubmit}>
          <DialogContent>
            <input
              type="password"
              className="input w-full mb-2"
              placeholder="Enter your password to confirm recipe change"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {passwordError && <div className="text-error-600 text-sm mb-2">{passwordError}</div>}
          </DialogContent>
          <DialogActions>
            <button className="btn btn-secondary" type="button" onClick={() => setShowPasswordModal(false)}>Cancel</button>
            <button className="btn btn-primary" type="submit">Confirm</button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
} 