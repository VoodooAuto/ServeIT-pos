import { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box, ButtonBase } from '@mui/material';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import UserGroupIcon from '@mui/icons-material/Group';
import BuildingStorefrontIcon from '@mui/icons-material/Store';
import ClipboardDocumentListIcon from '@mui/icons-material/Assignment';
import ExclamationTriangleIcon from '@mui/icons-material/WarningAmber';
import { StatCard } from '../ui/StatCard';
import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { mockDashboardStats, mockSalesData, mockTasks } from '../../utils/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { db } from '../../utils/firebase';
import { collection, onSnapshot, query, where, orderBy, limit, Timestamp, getDocs } from 'firebase/firestore';
import { useEstablishmentType } from '../../utils/establishmentType';
// Try to import useNavigate, fallback to undefined if not available
let useNavigate: any = undefined;
try {
  // @ts-ignore
  useNavigate = require('react-router-dom').useNavigate;
} catch {}

export function Dashboard() {
  // --- Real-time stats state ---
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    activeStaff: 0,
    availableTables: 3, // mock for now
    pendingTasks: 0,
    lowStockItems: 0,
  });

  const establishmentType = useEstablishmentType();
  const navigate = typeof useNavigate === 'function' ? useNavigate() : null;

  // Navigation handlers
  const goTo = (module: string) => {
    if (navigate) {
      navigate(`/${module}`);
    } else {
      window.location.hash = `#/${module}`;
    }
  };

  useEffect(() => {
    // Today's date string (YYYY-MM-DD)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startTimestamp = Timestamp.fromDate(startOfDay);

    // --- Today's Sales & Orders ---
    const unsubInvoices = onSnapshot(
      query(collection(db, 'invoices'), where('date', '>=', startTimestamp)),
      (snapshot) => {
        let totalSales = 0;
        let orderCount = 0;
        snapshot.forEach(doc => {
          const data = doc.data();
          totalSales += data.total || 0;
          orderCount++;
        });
        setStats(prev => ({ ...prev, todaySales: totalSales, todayOrders: orderCount }));
      }
    );

    // --- Active Staff ---
    const unsubStaff = onSnapshot(
      query(collection(db, 'staff'), where('status', '==', 'active')),
      (snapshot) => {
        setStats(prev => ({ ...prev, activeStaff: snapshot.size }));
      }
    );

    // --- Pending Tasks ---
    const unsubTasks = onSnapshot(
      query(collection(db, 'tasks'), where('status', '==', 'pending')),
      (snapshot) => {
        setStats(prev => ({ ...prev, pendingTasks: snapshot.size }));
      }
    );

    // --- Low Stock Items ---
    const unsubIngredients = onSnapshot(
      collection(db, 'ingredients'),
      (snapshot) => {
        let lowStockCount = 0;
        snapshot.forEach(doc => {
          const data = doc.data();
          if (typeof data.quantity === 'number' && typeof data.lowStockThreshold === 'number') {
            if (data.quantity <= data.lowStockThreshold) {
              lowStockCount++;
            }
          }
        });
        setStats(prev => ({ ...prev, lowStockItems: lowStockCount }));
      }
    );

    // Cleanup
    return () => {
      unsubInvoices();
      unsubStaff();
      unsubTasks();
      unsubIngredients();
    };
  }, []);

  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [ordersChart, setOrdersChart] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  // Fetch last 7 days sales/orders for charts
  useEffect(() => {
    async function fetchSalesOrders() {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // midnight today
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);
      const q = query(
        collection(db, 'invoices'),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(endOfToday))
      );
      const snap = await getDocs(q);
      const dayMap = new Map();
      for (let i = 0; i < 7; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        dayMap.set(key, { date: key, sales: 0, orders: 0 });
      }
      snap.forEach(doc => {
        const data = doc.data();
        const d = data.date?.toDate ? data.date.toDate() : new Date(data.date);
        d.setHours(0, 0, 0, 0); // normalize to local midnight
        const key = d.toISOString().slice(0, 10);
        if (dayMap.has(key)) {
          dayMap.get(key).sales += data.total || 0;
          dayMap.get(key).orders += 1;
        }
      });
      const arr = Array.from(dayMap.values());
      setSalesChart(arr);
      setOrdersChart(arr);
    }
    fetchSalesOrders();
  }, []);

  // Fetch 3 most recent tasks
  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(3));
    const unsub = onSnapshot(q, (snapshot) => {
      setRecentTasks(snapshot.docs.map(doc => doc.data()));
    });
    return () => unsub();
  }, []);

  // --- Keep the rest of the dashboard as is for now ---
  const taskColumns = [
    { key: 'title', label: 'Task' },
    { key: 'assignedTo', label: 'Assigned To' },
    { 
      key: 'priority', 
      label: 'Priority',
      render: (value: string) => (
        <Badge variant={value === 'high' ? 'error' : value === 'medium' ? 'warning' : 'gray'}>
          {value}
        </Badge>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'completed' ? 'success' : value === 'in-progress' ? 'warning' : 'gray'}>
          {value}
        </Badge>
      )
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tailwind Test Card Removed */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* MUI Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ boxShadow: 3, width: '100%' }}>
            <ButtonBase onClick={() => goTo('billing')} sx={{ width: '100%', display: 'block', textAlign: 'left' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <CurrencyRupeeIcon color="primary" fontSize="large" />
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Today's Sales</Typography>
                    <Typography variant="h5" color="primary">₹{stats.todaySales.toLocaleString()}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </ButtonBase>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ boxShadow: 3, width: '100%' }}>
            <ButtonBase onClick={() => goTo('billing')} sx={{ width: '100%', display: 'block', textAlign: 'left' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <ShoppingCartIcon color="primary" fontSize="large" />
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Orders</Typography>
                    <Typography variant="h5" color="primary">{stats.todayOrders}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </ButtonBase>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ boxShadow: 3, width: '100%' }}>
            <ButtonBase onClick={() => goTo('staff')} sx={{ width: '100%', display: 'block', textAlign: 'left' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <UserGroupIcon color="primary" fontSize="large" />
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Active Staff</Typography>
                    <Typography variant="h5" color="primary">{stats.activeStaff}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </ButtonBase>
          </Card>
        </Grid>
        {establishmentType !== 'QSR' && (
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <BuildingStorefrontIcon color="primary" fontSize="large" />
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Available Tables</Typography>
                    <Typography variant="h5" color="primary">{stats.availableTables}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ boxShadow: 3, width: '100%' }}>
            <ButtonBase onClick={() => goTo('tasks')} sx={{ width: '100%', display: 'block', textAlign: 'left' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <ClipboardDocumentListIcon color="warning" fontSize="large" />
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Pending Tasks</Typography>
                    <Typography variant="h5" color="warning.main">{stats.pendingTasks}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </ButtonBase>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ boxShadow: 3, width: '100%' }}>
            <ButtonBase onClick={() => goTo('inventory')} sx={{ width: '100%', display: 'block', textAlign: 'left' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <ExclamationTriangleIcon color="error" fontSize="large" />
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Low Stock Items</Typography>
                    <Typography variant="h5" color="error.main">{stats.lowStockItems}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </ButtonBase>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`₹${value}`, 'Sales']}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Orders</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ordersChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
              <YAxis />
              <Tooltip 
                formatter={(value) => [value, 'Orders']}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Bar dataKey="orders" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
        <Table columns={taskColumns} data={recentTasks} />
      </div>
    </div>
  );
}