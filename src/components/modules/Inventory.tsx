import React, { useEffect, useRef, useState } from 'react';
import { PlusIcon, PencilIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { db } from '../../utils/firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import type { InventoryItem } from '../../types';
import { uploadMenuItemsFromCSV } from '../../utils/csvMenuUpload';

export function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const categories = ['All', 'Grains', 'Meat', 'Dairy', 'Vegetables', 'Spices', 'Boughtout'];
  const filteredItems = selectedCategory === 'All' 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  const lowStockItems = items.filter(item => item.quantity <= item.lowStockThreshold);

  const columns = [
    { key: 'name', label: 'Item Name' },
    { key: 'category', label: 'Category' },
    { 
      key: 'quantity', 
      label: 'Stock',
      render: (_value: number, row: InventoryItem) => (
        <div className="flex items-center space-x-2">
          <span className={row.quantity <= row.lowStockThreshold ? 'text-error-600 font-medium' : ''}>
            {row.quantity} {row.unit}
          </span>
          {row.quantity <= row.lowStockThreshold && (
            <ExclamationTriangleIcon className="h-4 w-4 text-error-600" />
          )}
        </div>
      )
    },
    { 
      key: 'price', 
      label: 'Price/Unit',
      render: (value: number) => `₹${value}`
    },
    { key: 'supplier', label: 'Supplier' },
    { 
      key: 'expiryDate', 
      label: 'Expiry',
      render: (value: Date) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (_value: any, row: InventoryItem) => (
        <Badge variant={row.quantity <= row.lowStockThreshold ? 'error' : 'success'}>
          {row.quantity <= row.lowStockThreshold ? 'Low Stock' : 'In Stock'}
        </Badge>
      )
    },
    { 
      key: 'actions', 
      label: 'Actions',
      render: (_value: any, row: InventoryItem) => (
        <button
          onClick={() => setEditingItem(row)}
          className="p-1 rounded hover:bg-blue-100"
          title="Edit"
        >
          <PencilIcon className="h-4 w-4 text-blue-600" />
        </button>
      )
    },
  ];

  const handleAddItem = async (formData: any) => {
    const newItem: Omit<InventoryItem, 'id'> = {
      ...formData,
      quantity: Number(formData.quantity),
      price: Number(formData.price),
      lowStockThreshold: Number(formData.lowStockThreshold),
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
    };
    await addDoc(collection(db, 'ingredients'), newItem);
    setShowAddModal(false);
  };

  const handleUpdateItem = (formData: any) => {
    if (!editingItem) return;
    
    const updatedItem: InventoryItem = {
      ...editingItem,
      ...formData,
      quantity: Number(formData.quantity),
      price: Number(formData.price),
      lowStockThreshold: Number(formData.lowStockThreshold),
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
    };
    
    setItems(items.map(item => item.id === editingItem.id ? updatedItem : item));
    setEditingItem(null);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleBulkUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvString = event.target?.result as string;
      try {
        const result = await uploadMenuItemsFromCSV(csvString);
        alert(`Bulk upload complete!\nSuccess: ${result.success}\nFailed: ${result.failed}`);
      } catch (err) {
        alert('Bulk upload failed: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be uploaded again if needed
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          <PlusIcon className="h-4 w-4" /> Add Item
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 text-error-600 mr-2" />
            <h3 className="text-sm font-medium text-error-800">Low Stock Alert</h3>
          </div>
          <p className="text-sm text-error-700 mt-1">
            {lowStockItems.length} item(s) are running low on stock: {lowStockItems.map(item => item.name).join(', ')}
          </p>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex space-x-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm border ${
              selectedCategory === category
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Inventory Table */}
      <div className="card rounded-xl shadow-lg border border-gray-100">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading menu items...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No menu items found.</div>
        ) : (
          <Table columns={columns} data={filteredItems} />
        )}
      </div>

      {/* Add/Edit Item Modal */}
      <ItemModal
        isOpen={showAddModal || editingItem !== null}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        onSubmit={editingItem ? handleUpdateItem : handleAddItem}
        initialData={editingItem}
        title={editingItem ? 'Edit Item' : 'Add New Item'}
      />
    </div>
  );
}

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: InventoryItem | null;
  title: string;
}

function ItemModal({ isOpen, onClose, onSubmit, initialData, title }: ItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: '',
    lowStockThreshold: '',
    price: '',
    supplier: '',
    expiryDate: '',
    batchNumber: '',
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        category: initialData.category,
        quantity: initialData.quantity.toString(),
        unit: initialData.unit,
        lowStockThreshold: initialData.lowStockThreshold.toString(),
        price: initialData.price.toString(),
        supplier: initialData.supplier,
        expiryDate: initialData.expiryDate ? initialData.expiryDate.toISOString().split('T')[0] : '',
        batchNumber: initialData.batchNumber || '',
      });
    } else {
      setFormData({
        name: '',
        category: '',
        quantity: '',
        unit: '',
        lowStockThreshold: '',
        price: '',
        supplier: '',
        expiryDate: '',
        batchNumber: '',
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input w-full"
              required
            >
              <option value="">Select Category</option>
              <option value="Grains">Grains</option>
              <option value="Meat">Meat</option>
              <option value="Dairy">Dairy</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Spices">Spices</option>
              <option value="Boughtout">Boughtout</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="input w-full"
              required
            >
              <option value="">Select Unit</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="ltr">ltr</option>
              <option value="ml">ml</option>
              <option value="pcs">pcs</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Low Stock Alert
            </label>
            <input
              type="number"
              value={formData.lowStockThreshold}
              onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
              className="input w-full"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price per Unit
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier
            </label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              className="input w-full"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch Number
            </label>
            <input
              type="text"
              value={formData.batchNumber}
              onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
              className="input w-full"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {initialData ? 'Update' : 'Add'} Item
          </button>
        </div>
      </form>
    </Modal>
  );
}