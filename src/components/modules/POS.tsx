import { useEffect, useState, useRef } from 'react';
import { PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { db } from '../../utils/firebase';
import { collection, onSnapshot, query, where, addDoc, Timestamp, updateDoc, doc, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import type { MenuItem, OrderItem, Table } from '../../types';
import { useMemo } from 'react';
import { useEstablishmentType } from '../../utils/establishmentType';
import { Grid as MuiGrid, Box, Paper, Chip, Typography, Card, CardContent, CardMedia, CardActions, Button, TextField, Tabs, Tab, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PushPinIcon from '@mui/icons-material/PushPin';
import EditIcon from '@mui/icons-material/Edit';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

// Add flicker animation CSS
const flickerStyle = `
@keyframes flicker {
  0%, 100% { border-color: #ef4444; }
  50% { border-color: #fff; }
}
.flicker-border {
  animation: flicker 1s infinite;
}
`;

// Helper for activity logging
async function logActivity(action: string, targetId: string, targetType: string, details?: any) {
  await addDoc(collection(db, 'activityLogs'), {
    user: 'Admin User',
    action,
    targetId,
    targetType,
    timestamp: Timestamp.now(),
    details: details || null
  });
}

export function POS() {
  const establishmentType = useEstablishmentType();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // Order type state
  const [orderType, setOrderType] = useState<'Dine-in' | 'Delivery' | 'Take away'>('Dine-in');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Other'>('Cash');
  const [userRole, setUserRole] = useState<'manager' | 'cashier' | 'kitchen'>('manager');

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: '',
    address: '',
    gstin: '',
    fssai: '',
    contact: '',
    operator: 'Admin User',
  });

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any | null>(null);
  // Add audio ref for KOT notification
  const kotAudioRef = useRef<HTMLAudioElement | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', price: '', category: '', description: '', image: '' });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelPassword, setCancelPassword] = useState('');
  const [cancelError, setCancelError] = useState('');

  // Ticket number logic
  const [ticketMap, setTicketMap] = useState<{ [orderId: string]: number }>({});
  const [usedTickets, setUsedTickets] = useState<number[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Listen for pending KOT orders
  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', '==', 'kot'));
    const unsub = onSnapshot(q, (snapshot) => {
      setPendingOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // Fetch restaurant info from Firestore
  useEffect(() => {
    async function fetchRestaurantInfo() {
      const ref = doc(db, 'settings', 'restaurant');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setRestaurantInfo({
          name: data.name || '',
          address: data.address || '',
          gstin: data.gst || '',
          fssai: data.fssai || '',
          contact: data.contact || '',
          operator: 'Admin User',
        });
      }
    }
    fetchRestaurantInfo();
  }, []);

  // Assign ticket numbers to pending orders
  useEffect(() => {
    // Only for pending orders
    const currentIds = pendingOrders.map((o: any) => o.id);
    // Remove tickets for orders that are no longer pending
    setTicketMap(prev => {
      const newMap: { [orderId: string]: number } = {};
      for (const id of currentIds) {
        if (prev[id]) newMap[id] = prev[id];
      }
      return newMap;
    });
    // Update used tickets
    setUsedTickets(Object.values(ticketMap).filter((num, idx, arr) => arr.indexOf(num) === idx));
  }, [pendingOrders]);

  // Assign ticket number to new pending orders
  useEffect(() => {
    setTicketMap(prev => {
      const newMap = { ...prev };
      for (const order of pendingOrders) {
        if (!newMap[order.id]) {
          newMap[order.id] = getNextTicketNumber();
        }
      }
      return newMap;
    });
  }, [pendingOrders, usedTickets]);

  // When an order is completed or cancelled, remove its ticket number
  async function handleOrderCompleted(orderId: string) {
    await updateDoc(doc(db, 'orders', orderId), { status: 'completed' });
    setTicketMap(prev => {
      const newMap = { ...prev };
      delete newMap[orderId];
      return newMap;
    });
  }

  const categories = useMemo(() => {
    const cats = menuItems ? Array.from(new Set(menuItems.map(item => item.category).filter(Boolean))) : [];
    return ['All', ...cats];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase()) || (item.description && item.description.toLowerCase().includes(searchText.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchText]);

  // Add to cart handler
  const handleAddToCart = (menuItem: MenuItem) => {
    const existingItem = cart.find(item => item.menuItem.id === menuItem.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.menuItem.id === menuItem.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * menuItem.price }
          : item
      ));
    } else {
      setCart([...cart, {
        id: Date.now().toString(),
        menuItem,
        quantity: 1,
        modifiers: [],
        total: menuItem.price
      }]);
    }
  };

  const updateQuantity = (itemId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(0, item.quantity + change);
        return newQuantity === 0 
          ? item 
          : { ...item, quantity: newQuantity, total: newQuantity * item.menuItem.price };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const getCartTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.05; // 5% GST
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleOrderComplete = () => {
    if (cart.length === 0) return;
    
    // In a real app, this would create an order
    alert(`Order placed for Table ${tableNumber || 'Takeaway'}`);
    setCart([]);
    setTableNumber(null);
    setShowPaymentModal(false);
  };

  const totals = getCartTotal();

  // Add this function to create an invoice only when requested
  const saveInvoiceToFirestore = async (orderId: string) => {
    try {
      const invoiceNumber = `INV-${Date.now()}`;
      await addDoc(collection(db, 'invoices'), {
        invoiceNumber,
        date: Timestamp.now(),
        customer: null, // Update if customer info is available
        items: cart.map(i => ({
          name: i.menuItem.name,
          quantity: i.quantity,
          price: i.menuItem.price,
          category: i.menuItem.category
        })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: 0,
        total: totals.total,
        paymentMethod: paymentMethod, // <-- use selected payment method from state
        status: 'pending',
        orderId
      });
      alert('Invoice generated and saved to Firestore!');
    } catch (err) {
      alert('Failed to save invoice: ' + (err as Error).message);
    }
  };

  // Update saveOrderToFirestore to return the orderRef
  const saveOrderToFirestore = async (action: 'save' | 'kot') => {
    try {
      // Save order
      const orderRef = await addDoc(collection(db, 'orders'), {
        items: cart.map(i => ({
          name: i.menuItem.name,
          quantity: i.quantity,
          price: i.menuItem.price,
          category: i.menuItem.category
        })),
        table: tableNumber || '07',
        total: totals.total,
        paymentMethod: 'Cash', // You can update this to use the selected payment method
        orderType,
        status: action === 'save' ? 'placed' : 'kot',
        createdAt: Timestamp.now()
      });
      alert(`Order ${action === 'save' ? 'saved' : 'KOT printed'} and sent to Firestore!`);
      setCart([]);
      return orderRef.id;
    } catch (err) {
      alert('Failed to save order: ' + (err as Error).message);
      return null;
    }
  };

  // Handler for Save Invoice button
  const handleSaveInvoice = async () => {
    const orderId = await saveOrderToFirestore('save');
    if (orderId) {
      await saveInvoiceToFirestore(orderId);
    }
  };
  const handleSaveAndPrint = () => saveOrderToFirestore('save');
  const handleKOTAndPrint = () => saveOrderToFirestore('kot');

  // Save invoice for a pending order
  const saveInvoiceForOrder = async (order: any) => {
    try {
      // Check if invoice already exists
      const q = query(collection(db, 'invoices'), where('orderId', '==', order.id));
      const existing = await getDocs(q);
      if (!existing.empty) return;
      const invoiceNumber = `INV-${Date.now()}`;
      await addDoc(collection(db, 'invoices'), {
        invoiceNumber,
        date: Timestamp.now(),
        customer: null,
        items: order.items.map((item: OrderItem) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          category: item.category
        })),
        subtotal: order.total / 1.18, // assuming 18% GST
        tax: order.total - order.total / 1.18,
        discount: 0,
        total: order.total,
        paymentMethod: order.paymentMethod || 'cash',
        status: 'pending',
        orderId: order.id
      });
      // Optionally update UI
      setPendingOrders(pendingOrders.map(o => o.id === order.id ? { ...o, invoiceCreated: true } : o));

      // Automatically print the invoice
      const subtotal = order.total / 1.18;
      const gst = order.total - subtotal;
      const total = order.total;
      const invoiceHtml = `
        <html>
        <head>
          <title>Invoice</title>
          <style>
            body { font-family: Menlo, Consolas, monospace; font-size: 12px; margin: 0; padding: 0; }
            .invoice { width: 2in; margin: 0 auto; padding: 0.1in 0.05in; background: #fff; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
            th, td { padding: 0; }
            th { text-align: left; font-weight: bold; border-bottom: 1px solid #333; }
            td, th { font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="center bold" style="font-size:14px;">${restaurantInfo.name}</div>
            <div class="center" style="font-size:10px;">${restaurantInfo.address}</div>
            <div class="center" style="font-size:10px;">GSTIN: ${restaurantInfo.gstin} | FSSAI: ${restaurantInfo.fssai}</div>
            <div class="center" style="font-size:10px; margin-bottom:2px;">Contact: ${restaurantInfo.contact}</div>
            <div class="center" style="margin-bottom:2px;">TAX INVOICE</div>
            <div style="font-size:10px; margin-bottom:2px;">
              Table: ${order.table || 'N/A'}<br />
              Date: ${new Date().toLocaleString()}<br />
              Operator: ${restaurantInfo.operator}
            </div>
            <table style="width:100%; border-collapse:collapse; margin-bottom:4px; font-size:12px;">
              <thead>
                <tr style="border-bottom:1px solid #333;">
                  <th style="text-align:left; width:10%;">SN</th>
                  <th style="text-align:left; width:50%;">Item</th>
                  <th style="text-align:right; width:20%;">Qty</th>
                  <th style="text-align:right; width:20%;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${(order.items || []).map((item: OrderItem, idx: number) =>
                  `<tr>
                    <td style="text-align:left;">${idx + 1}</td>
                    <td style="text-align:left; white-space:nowrap; max-width:80px; overflow:hidden; text-overflow:ellipsis;">${item.name || item.menuItem?.name}</td>
                    <td style="text-align:right;">${item.quantity}</td>
                    <td style="text-align:right;">₹${((item.price || item.menuItem?.price || 0) * item.quantity).toFixed(2)}</td>
                  </tr>`
                ).join('')}
              </tbody>
            </table>
            <div style="font-size:12px; margin-top:4px;">Subtotal: ₹${subtotal.toFixed(2)}</div>
            <div style="font-size:12px;">GST (5%): ₹${gst.toFixed(2)}</div>
            <div style="font-size:14px; font-weight:bold;">Total: ₹${total.toFixed(2)}</div>
          </div>
          <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
        </body>
        </html>
      `;
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(invoiceHtml);
        printWindow.document.close();
      }
    } catch (err) {
      alert('Failed to save invoice: ' + (err as Error).message);
    }
  };

  // Helper to check if order is older than 15 minutes
  const isOrderStale = (order: any) => {
    if (!order.createdAt?.toDate) return false;
    const created = order.createdAt.toDate();
    return (Date.now() - created.getTime()) > 15 * 60 * 1000;
  };

  // QSR workflow: single action for order, KOT, invoice, payment
  const handleQSRPlaceOrder = async () => {
    if (cart.length === 0) return;
    // Save order with status 'kot' so it appears as a sticky note
    const orderData = {
      items: cart.map(i => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        price: i.menuItem.price,
        category: i.menuItem.category,
        menuItem: i.menuItem
      })),
      table: 'Takeaway',
      total: cart.reduce((sum: number, i: OrderItem) => sum + i.total, 0),
      paymentMethod: 'Cash',
      orderType,
      status: 'kot',
      createdAt: Timestamp.now()
    };
    const orderRef = await addDoc(collection(db, 'orders'), orderData);

    // Print KOT and Invoice together
    const kotHtml = `
      <div class="kot">
        <div class="center bold" style="font-size:14px;">${restaurantInfo.name}</div>
        <div class="center" style="margin-bottom:2px;">KOT SLIP</div>
        <div style="font-size:10px; margin-bottom:2px;">
          Table: Takeaway<br />
          Date: ${new Date().toLocaleString()}<br />
          Operator: ${restaurantInfo.operator}
        </div>
        <table>
          <thead>
            <tr><th>SN</th><th>Item</th><th style="text-align:right;">Qty</th></tr>
          </thead>
          <tbody>
            ${(cart || []).map((item: OrderItem, idx: number) =>
              `<tr><td>${idx + 1}</td><td>${item.menuItem.name}</td><td style="text-align:right;">${item.quantity}</td></tr>`
            ).join('')}
          </tbody>
        </table>
        <div class="thankyou">--- Send to Kitchen ---</div>
      </div>
    `;
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const gst = subtotal * 0.05;
    const total = subtotal + gst;
    const invoiceHtml = `
      <div class="invoice" style="margin-top:16px;">
        <div class="center bold" style="font-size:14px;">${restaurantInfo.name}</div>
        <div class="center" style="font-size:10px;">${restaurantInfo.address}</div>
        <div class="center" style="font-size:10px;">GSTIN: ${restaurantInfo.gstin} | FSSAI: ${restaurantInfo.fssai}</div>
        <div class="center" style="font-size:10px; margin-bottom:2px;">Contact: ${restaurantInfo.contact}</div>
        <div class="center" style="margin-bottom:2px;">TAX INVOICE</div>
        <div style="font-size:10px; margin-bottom:2px;">
          Table: Takeaway<br />
          Date: ${new Date().toLocaleString()}<br />
          Operator: ${restaurantInfo.operator}
        </div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:4px; font-size:12px;">
          <thead>
            <tr style="border-bottom:1px solid #333;">
              <th style="text-align:left; width:10%;">SN</th>
              <th style="text-align:left; width:50%;">Item</th>
              <th style="text-align:right; width:20%;">Qty</th>
              <th style="text-align:right; width:20%;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${(cart || []).map((item: OrderItem, idx: number) =>
              `<tr>
                <td style="text-align:left;">${idx + 1}</td>
                <td style="text-align:left; white-space:nowrap; max-width:80px; overflow:hidden; text-overflow:ellipsis;">${item.menuItem.name}</td>
                <td style="text-align:right;">${item.quantity}</td>
                <td style="text-align:right;">₹${(item.menuItem.price * item.quantity).toFixed(2)}</td>
              </tr>`
            ).join('')}
          </tbody>
        </table>
        <div style="font-size:12px; margin-top:4px;">Subtotal: ₹${subtotal.toFixed(2)}</div>
        <div style="font-size:12px;">GST (5%): ₹${gst.toFixed(2)}</div>
        <div style="font-size:14px; font-weight:bold;">Total: ₹${total.toFixed(2)}</div>
      </div>
    `;
    const printHtml = `
      <html>
      <head>
        <title>KOT + Invoice</title>
        <style>
          body { font-family: Menlo, Consolas, monospace; font-size: 12px; margin: 0; padding: 0; }
          .kot { width: 2in; margin: 0 auto; padding: 0.1in 0.05in; background: #fff; }
          .invoice { width: 2in; margin: 0 auto; padding: 0.1in 0.05in; background: #fff; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
          th, td { padding: 0; }
          th { text-align: left; font-weight: bold; border-bottom: 1px solid #333; }
          td, th { font-size: 12px; }
          .thankyou { text-align: center; margin-top: 8px; }
        </style>
      </head>
      <body>
        ${kotHtml}
        ${invoiceHtml}
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
    if (establishmentType === 'QSR') {
      // Save invoice to Firestore with status 'paid' BEFORE clearing the cart
      const invoiceNumber = `INV-${Date.now()}`;
      const invoiceData = {
        invoiceNumber,
        date: Timestamp.now(),
        customer: null,
        items: cart.map((item: OrderItem) => ({
          name: item.menuItem.name,
          quantity: item.quantity,
          price: item.menuItem.price,
          category: item.menuItem.category
        })),
        subtotal: subtotal,
        tax: gst,
        discount: 0,
        total: total,
        paymentMethod: paymentMethod, // <-- use selected payment method from state
        status: 'paid',
        orderId: orderRef.id
      };
      await addDoc(collection(db, 'invoices'), invoiceData);
      setLastInvoice(invoiceData);
    }
    setCart([]); // Only clear cart after invoice is saved
    if (kotAudioRef.current) kotAudioRef.current.play();
    await logActivity('placed order', orderRef.id, 'order');
  };

  function handleKOTPrint() {
    const tableValue = establishmentType === 'QSR' ? 'Takeaway' : (tableNumber !== null ? tableNumber : 'N/A');
    const orderData = {
      items: cart.map(i => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        price: i.menuItem.price,
        category: i.menuItem.category,
        menuItem: i.menuItem
      })),
      table: tableValue,
      total: cart.reduce((sum: number, i: OrderItem) => sum + i.total, 0),
      paymentMethod: 'Cash',
      orderType,
      status: 'kot',
      createdAt: Timestamp.now()
    };
    addDoc(collection(db, 'orders'), orderData).then(async orderRef => {
      // KOT HTML
      const kotHtml = `
        <div class="kot">
          <div class="center bold" style="font-size:14px;">${restaurantInfo.name}</div>
          <div class="center" style="margin-bottom:2px;">KOT SLIP</div>
          <div style="font-size:10px; margin-bottom:2px;">
            Table: ${tableValue} &nbsp; Type: ${orderType}<br />
            Date: ${new Date().toLocaleString()}<br />
            Operator: ${restaurantInfo.operator}
          </div>
          <table>
            <thead>
              <tr><th>SN</th><th>Item</th><th style="text-align:right;">Qty</th></tr>
            </thead>
            <tbody>
              ${(cart || []).map((item, idx) =>
                `<tr><td>${idx + 1}</td><td>${item.menuItem.name}</td><td style="text-align:right;">${item.quantity}</td></tr>`
              ).join('')}
            </tbody>
          </table>
          <div class="thankyou">--- Send to Kitchen ---</div>
        </div>
      `;
      // Invoice HTML (for QSR only)
      let invoiceHtml = '';
      if (establishmentType === 'QSR') {
        const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
        const gst = subtotal * 0.05;
        const total = subtotal + gst;
        invoiceHtml = `
          <div class="invoice" style="margin-top:16px;">
            <div class="center bold" style="font-size:14px;">${restaurantInfo.name}</div>
            <div class="center" style="font-size:10px;">${restaurantInfo.address}</div>
            <div class="center" style="font-size:10px;">GSTIN: ${restaurantInfo.gstin} | FSSAI: ${restaurantInfo.fssai}</div>
            <div class="center" style="font-size:10px; margin-bottom:2px;">Contact: ${restaurantInfo.contact}</div>
            <div class="center" style="margin-bottom:2px;">TAX INVOICE</div>
            <div style="font-size:10px; margin-bottom:2px;">
              Table: Takeaway<br />
              Date: ${new Date().toLocaleString()}<br />
              Operator: ${restaurantInfo.operator}
            </div>
            <table style="width:100%; border-collapse:collapse; margin-bottom:4px; font-size:12px;">
              <thead>
                <tr style="border-bottom:1px solid #333;">
                  <th style="text-align:left; width:10%;">SN</th>
                  <th style="text-align:left; width:50%;">Item</th>
                  <th style="text-align:right; width:20%;">Qty</th>
                  <th style="text-align:right; width:20%;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${(cart || []).map((item: OrderItem, idx: number) =>
                  `<tr>
                    <td style="text-align:left;">${idx + 1}</td>
                    <td style="text-align:left; white-space:nowrap; max-width:80px; overflow:hidden; text-overflow:ellipsis;">${item.menuItem.name}</td>
                    <td style="text-align:right;">${item.quantity}</td>
                    <td style="text-align:right;">₹${(item.menuItem.price * item.quantity).toFixed(2)}</td>
                  </tr>`
                ).join('')}
              </tbody>
            </table>
            <div style="font-size:12px; margin-top:4px;">Subtotal: ₹${subtotal.toFixed(2)}</div>
            <div style="font-size:12px;">GST (5%): ₹${gst.toFixed(2)}</div>
            <div style="font-size:14px; font-weight:bold;">Total: ₹${total.toFixed(2)}</div>
          </div>
        `;
      }
      // Compose print HTML
      const printHtml = `
        <html>
        <head>
          <title>KOT${establishmentType === 'QSR' ? ' + Invoice' : ''}</title>
          <style>
            body { font-family: Menlo, Consolas, monospace; font-size: 12px; margin: 0; padding: 0; }
            .kot { width: 2in; margin: 0 auto; padding: 0.1in 0.05in; background: #fff; }
            .invoice { width: 2in; margin: 0 auto; padding: 0.1in 0.05in; background: #fff; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
            th, td { padding: 0; }
            th { text-align: left; font-weight: bold; border-bottom: 1px solid #333; }
            td, th { font-size: 12px; }
            .thankyou { text-align: center; margin-top: 8px; }
          </style>
        </head>
        <body>
          ${kotHtml}
          ${invoiceHtml}
          <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
        </body>
        </html>
      `;
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(printHtml);
        printWindow.document.close();
      }
      setCart([]); // Clear cart only after saving order
      if (establishmentType === 'QSR') {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
      if (searchInputRef.current) searchInputRef.current.focus();
      if (kotAudioRef.current) kotAudioRef.current.play();
      await logActivity('printed invoice', invoiceNumber, 'invoice');
    });
  }

  // Add a function to reprint the last invoice
  function handleReprintInvoice() {
    if (!lastInvoice) return;
    const { invoiceNumber, date, customer, items, subtotal, tax, discount, total, paymentMethod, status, orderId } = lastInvoice;
    const invoiceHtml = `
      <html>
      <head>
        <title>Invoice</title>
        <style>
          body { font-family: Menlo, Consolas, monospace; font-size: 12px; margin: 0; padding: 0; }
          .invoice { width: 2in; margin: 0 auto; padding: 0.1in 0.05in; background: #fff; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
          th, td { padding: 0; }
          th { text-align: left; font-weight: bold; border-bottom: 1px solid #333; }
          td, th { font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="center bold" style="font-size:14px;">${restaurantInfo.name}</div>
          <div class="center" style="font-size:10px;">${restaurantInfo.address}</div>
          <div class="center" style="font-size:10px;">GSTIN: ${restaurantInfo.gstin} | FSSAI: ${restaurantInfo.fssai}</div>
          <div class="center" style="font-size:10px; margin-bottom:2px;">Contact: ${restaurantInfo.contact}</div>
          <div class="center" style="margin-bottom:2px;">TAX INVOICE</div>
          <div style="font-size:10px; margin-bottom:2px;">
            Invoice: ${invoiceNumber}<br />
            Date: ${new Date(date?.toDate ? date.toDate() : date).toLocaleString()}<br />
            Operator: ${restaurantInfo.operator}
          </div>
          <table style="width:100%; border-collapse:collapse; margin-bottom:4px; font-size:12px;">
            <thead>
              <tr style="border-bottom:1px solid #333;">
                <th style="text-align:left; width:10%;">SN</th>
                <th style="text-align:left; width:50%;">Item</th>
                <th style="text-align:right; width:20%;">Qty</th>
                <th style="text-align:right; width:20%;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${(items || []).map((item: any, idx: number) =>
                `<tr>
                  <td style="text-align:left;">${idx + 1}</td>
                  <td style="text-align:left; white-space:nowrap; max-width:80px; overflow:hidden; text-overflow:ellipsis;">${item.name}</td>
                  <td style="text-align:right;">${item.quantity}</td>
                  <td style="text-align:right;">₹${(item.price * item.quantity).toFixed(2)}</td>
                </tr>`
              ).join('')}
            </tbody>
          </table>
          <div style="font-size:12px; margin-top:4px;">Subtotal: ₹${subtotal.toFixed(2)}</div>
          <div style="font-size:12px;">GST (5%): ₹${tax.toFixed(2)}</div>
          <div style="font-size:14px; font-weight:bold;">Total: ₹${total.toFixed(2)}</div>
        </div>
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
    }
    logActivity('reprinted invoice', lastInvoice.invoiceNumber, 'invoice');
  }

  // Open edit modal
  const handleEditMenuItem = (item: any) => {
    setEditingMenuItem(item);
    setEditForm({
      name: item.name || '',
      price: item.price?.toString() || '',
      category: item.category || '',
      description: item.description || '',
      image: item.image || '',
    });
    setShowEditModal(true);
  };

  // Save changes
  const handleSaveEdit = async () => {
    if (!editingMenuItem) return;
    const ref = doc(db, 'menuItems', editingMenuItem.id);
    await updateDoc(ref, {
      name: editForm.name,
      price: Number(editForm.price),
      category: editForm.category,
      description: editForm.description,
      image: editForm.image,
    });
    setShowEditModal(false);
    setEditingMenuItem(null);
  };

  // Cancel & Refund handler
  const handleCancelOrder = (orderId: string) => {
    setCancelOrderId(orderId);
    setShowCancelModal(true);
    setCancelPassword('');
    setCancelError('');
  };

  const confirmCancelOrder = async () => {
    setCancelError('');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !user.email) {
      setCancelError('No user session. Please sign in again.');
      return;
    }
    const credential = EmailAuthProvider.credential(user.email, cancelPassword);
    try {
      await reauthenticateWithCredential(user, credential);
      // Delete order
      if (cancelOrderId) {
        await deleteDoc(doc(db, 'orders', cancelOrderId));
        // Delete invoice(s) for this order
        const q = query(collection(db, 'invoices'), where('orderId', '==', cancelOrderId));
        const snap = await getDocs(q);
        for (const invoiceDoc of snap.docs) {
          await deleteDoc(invoiceDoc.ref);
        }
      }
      setShowCancelModal(false);
      setCancelOrderId(null);
    } catch (err) {
      setCancelError('Incorrect password.');
    }
  };

  function getNextTicketNumber() {
    for (let i = 1; i <= 99; i++) {
      if (!usedTickets.includes(i)) return i;
    }
    return 1;
  }

  return (
    <>
      <style>{flickerStyle}</style>
      <Box sx={{ width: '100%', height: '100%', bgcolor: 'background.default', p: { xs: 1, md: 3 } }}>
        <MuiGrid container spacing={2}>
          {/* Pending Orders (left) */}
          <MuiGrid item xs={12} md={3}>
            <Paper sx={{ height: '80vh', overflowY: 'auto', p: 2 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700} mr={1}>Pending Orders</Typography>
                <Chip label={pendingOrders.length} color="warning" />
              </Box>
              <Box>
                {pendingOrders.length === 0 ? (
                  <Typography color="textSecondary">No pending orders.</Typography>
                ) : (
                  <Box display="flex" flexDirection="column" gap={2}>
                    {pendingOrders.map(order => {
                      const stale = isOrderStale(order);
                      const ticketNumber = ticketMap[order.id] || '';
                      return (
                        <Paper
                          key={order.id}
                          elevation={4}
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            border: 3,
                            borderColor: stale ? 'error.main' : 'warning.main',
                            boxShadow: stale ? 8 : 3,
                            bgcolor: stale ? '#fff5f5' : '#fffde7',
                          }}
                          className={stale ? 'flicker-border' : ''}
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Chip
                              label={stale ? 'Overdue' : 'Pending'}
                              color={stale ? 'error' : 'warning'}
                              size="small"
                            />
                            <Typography variant="caption" color="textSecondary">Table: {order.table || 'N/A'}</Typography>
                          </Box>
                          <Box mb={1} display="flex" alignItems="center" gap={1}>
                            <Typography variant="h5" fontWeight={700} color="primary">#{ticketNumber}</Typography>
                            <Box flex={1}>
                              {(order.items || []).map((item: any, idx: number) => (
                                <Box key={idx} display="flex" justifyContent="space-between" fontSize={14}>
                                  <span>{item.quantity} x {item.name || item.menuItem?.name}</span>
                                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                          <Typography variant="h6" fontWeight={700} mb={1}>Total: ₹{order.total?.toFixed(2)}</Typography>
                          {establishmentType !== 'QSR' && !order.invoiceCreated ? (
                            <button
                              className="btn btn-primary w-full mt-2 py-3 text-base md:text-lg"
                              onClick={() => saveInvoiceForOrder(order)}
                            >
                              Create Invoice
                            </button>
                          ) : establishmentType !== 'QSR' ? (
                            <button className="btn btn-success w-full mt-2" disabled>
                              Invoice Created
                            </button>
                          ) : null}
                          <button
                            className="btn btn-secondary w-full mt-2"
                            onClick={() => handleOrderCompleted(order.id)}
                          >
                            Order Completed
                          </button>
                          {(userRole === 'manager' || userRole === 'admin') && (
                            <button
                              className="btn btn-error w-full mt-2"
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              Cancel & Refund
                            </button>
                          )}
                        </Paper>
                      );
                    })}
                  </Box>
                )}
              </Box>
            </Paper>
          </MuiGrid>
          {/* Menu/Search (center) */}
          <MuiGrid item xs={12} md={5}>
            <Paper sx={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1, p: 2 }}>
                <Typography variant="h6" fontWeight={700}>Menu</Typography>
                {/* Category Tabs */}
                <Tabs
                  value={categories.indexOf(selectedCategory)}
                  onChange={(_, idx) => setSelectedCategory(categories[idx])}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ mb: 2 }}
                >
                  {categories.map((cat) => (
                    <Tab key={cat} label={cat} />
                  ))}
                </Tabs>
                {/* Search input */}
                <TextField
                  inputRef={searchInputRef}
                  variant="outlined"
                  size="small"
                  placeholder="Search item"
                  fullWidth
                  sx={{ mb: 2 }}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                />
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                <MuiGrid container spacing={1} direction="column">
                  {loading ? (
                    <MuiGrid item xs={12}><Typography align="center" color="textSecondary">Loading menu items...</Typography></MuiGrid>
                  ) : filteredItems.length === 0 ? (
                    <MuiGrid item xs={12}><Typography align="center" color="textSecondary">No menu items found.</Typography></MuiGrid>
                  ) : filteredItems.map(item => (
                    <MuiGrid item xs={12} key={item.id}>
                      <Card sx={{ display: 'flex', flexDirection: 'column', mb: 1 }}>
                        {item.image && (
                          <CardMedia
                            component="img"
                            height="80"
                            image={item.image}
                            alt={item.name}
                            sx={{ objectFit: 'cover' }}
                          />
                        )}
                        <CardContent sx={{ flex: 1, p: 1 }}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="subtitle2" fontWeight={700}>{item.name}</Typography>
                            {item.category && <Chip label={item.category} size="small" color="primary" />}
                          </Box>
                          <Typography variant="body2" color="textSecondary" mb={1}>{item.description}</Typography>
                          <Typography variant="subtitle2" color="primary">₹{item.price}</Typography>
                        </CardContent>
                        <CardActions sx={{ p: 1 }}>
                          <Button variant="contained" color="primary" fullWidth onClick={() => handleAddToCart(item)} size="small">
                            Add
                          </Button>
                          {userRole === 'admin' && (
                            <IconButton color="secondary" onClick={() => handleEditMenuItem(item)} size="small">
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                        </CardActions>
                      </Card>
                    </MuiGrid>
                  ))}
                </MuiGrid>
              </Box>
            </Paper>
          </MuiGrid>
          {/* Order Cart (right) */}
          <MuiGrid item xs={12} md={4}>
            <Paper sx={{ height: '80vh', position: 'sticky', top: 24, p: 2, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Order Cart</Typography>
              {/* Cart/order summary content goes here (keep as-is for now) */}
              <div className="flex space-x-2 mb-4 border-b">
                {['Dine-in', 'Delivery', 'Take away'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setOrderType(tab as 'Dine-in' | 'Delivery' | 'Take away')}
                    className={`py-2 px-4 font-medium border-b-2 transition-colors ${orderType === tab ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    aria-pressed={orderType === tab}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900">Bill for</span>
                  {establishmentType === 'QSR' ? (
                    <span className="text-xs text-gray-500">Takeaway</span>
                  ) : (
                    <input
                      type="number"
                      className="input input-xs w-24"
                      placeholder="Table #"
                      value={tableNumber !== null ? tableNumber : ''}
                      onChange={e => {
                        if (e.target.value === '') {
                          setTableNumber(null);
                        } else {
                          setTableNumber(Number(e.target.value));
                        }
                      }}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <span className="text-sm">{item.quantity} x {item.menuItem.name}</span>
                      <div className="flex items-center space-x-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200">-</button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200">+</button>
                      </div>
                      <span className="text-sm font-medium text-gray-900">₹{item.total.toFixed(2)}</span>
                      <button onClick={() => removeFromCart(item.id)} className="ml-2 text-error-600 hover:text-error-800" title="Remove item">
                        <DeleteIcon fontSize="small" />
                      </button>
                    </div>
                  ))}
                </div>
                {cart.length > 0 && (
                  <button className="btn btn-secondary btn-xs mt-2 w-full" onClick={() => setCart([])}>
                    Clear Cart
                  </button>
                )}
              </div>
              <div className="flex justify-between items-center text-lg font-bold mb-4">
                <span>Total Payable:</span>
                <span>₹{totals.total.toFixed(2)}</span>
              </div>
              {establishmentType === 'QSR' && (
                <div className="flex space-x-4 mb-4">
                  {['Cash', 'Card', 'UPI', 'Other'].map(method => (
                    <label key={method} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="payment"
                        className="accent-red-500"
                        checked={paymentMethod === method}
                        onChange={() => setPaymentMethod(method as any)}
                      />
                      <span className="text-sm">{method}</span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex space-x-3">
                {(userRole === 'manager' || userRole === 'cashier') && establishmentType === 'QSR' && (
                  <button
                    className="flex-1 btn btn-primary"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={cart.length === 0}
                  >
                    Place Order
                  </button>
                )}
                {userRole === 'kitchen' && (
                  <button
                    className="flex-1 btn bg-red-600 text-white hover:bg-red-700"
                    onClick={handleKOTPrint}
                    disabled={cart.length === 0}
                  >
                    KOT Print
                  </button>
                )}
              </div>
            </Paper>
          </MuiGrid>
        </MuiGrid>
      </Box>
      
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded shadow-lg z-50 transition-opacity">
          Order completed and invoice saved!
        </div>
      )}
      {lastInvoice && showToast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 px-6 py-3 rounded shadow-lg z-50 border border-gray-300 flex items-center gap-4">
          <span>Last Invoice: <b>{lastInvoice.invoiceNumber}</b></span>
          <button className="btn btn-primary btn-xs" onClick={handleReprintInvoice}>Reprint</button>
        </div>
      )}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirm Order?">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Order Summary</h3>
            <ul className="divide-y divide-gray-200">
              {cart.map((item) => (
                <li key={item.id} className="flex justify-between py-1">
                  <span>{item.quantity} x {item.menuItem.name}</span>
                  <span>₹{(item.menuItem.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>₹{getCartTotal().total.toFixed(2)}</span>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { setShowConfirmModal(false); handleQSRPlaceOrder(); }}>Confirm & Print</button>
          </div>
        </div>
      </Modal>
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)}>
        <DialogTitle>Edit Menu Item</DialogTitle>
        <DialogContent sx={{ minWidth: 320 }}>
          <TextField
            label="Name"
            value={editForm.name}
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
            fullWidth
            margin="dense"
          />
          <TextField
            label="Price"
            type="number"
            value={editForm.price}
            onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
            fullWidth
            margin="dense"
          />
          <TextField
            label="Category"
            value={editForm.category}
            onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
            fullWidth
            margin="dense"
          />
          <TextField
            label="Description"
            value={editForm.description}
            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
            fullWidth
            margin="dense"
          />
          <TextField
            label="Image URL"
            value={editForm.image}
            onChange={e => setEditForm(f => ({ ...f, image: e.target.value }))}
            fullWidth
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Save</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={showCancelModal} onClose={() => setShowCancelModal(false)}>
        <DialogTitle>Cancel & Refund Order</DialogTitle>
        <form onSubmit={e => { e.preventDefault(); confirmCancelOrder(); }}>
          <DialogContent>
            <p>Enter your password to confirm cancellation and refund.</p>
            <input
              type="password"
              className="input w-full mb-2"
              placeholder="Password"
              value={cancelPassword}
              onChange={e => setCancelPassword(e.target.value)}
              required
            />
            {cancelError && <div className="text-error-600 text-sm mb-2">{cancelError}</div>}
          </DialogContent>
          <DialogActions>
            <button className="btn btn-secondary" type="button" onClick={() => setShowCancelModal(false)}>Cancel</button>
            <button className="btn btn-error" type="submit">Confirm Cancel & Refund</button>
          </DialogActions>
        </form>
      </Dialog>
      <audio ref={kotAudioRef} src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" preload="auto" />
    </>
  );
}