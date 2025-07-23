import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  ButtonBase,
} from '@mui/material';

import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import GroupIcon from '@mui/icons-material/Group';
import StoreIcon from '@mui/icons-material/Store';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningIcon from '@mui/icons-material/Warning';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../utils/firebase';

import { useEstablishmentType } from '../../utils/establishmentType';

const useNavigate = () => {
  try {
    return require('react-router-dom').useNavigate();
  } catch {
    return (path: string) => (window.location.hash = `#${path}`);
  }
};

export function Dashboard() {
  const navigate = useNavigate();
  const establishmentType = useEstablishmentType();

  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    activeStaff: 0,
    availableTables: 4,
    pendingTasks: 0,
    lowStockItems: 0,
  });

  const goTo = (path: string) => {
    navigate(`/${path}`);
  };

  useEffect(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startTimestamp = Timestamp.fromDate(startOfDay);

    const invoiceUnsub = onSnapshot(
      query(collection(db, 'invoices'), where('date', '>=', startTimestamp)),
      (snapshot) => {
        let total = 0;
        snapshot.forEach((doc) => {
          total += doc.data().total || 0;
        });
        setStats((prev) => ({ ...prev, todaySales: total, todayOrders: snapshot.size }));
      }
    );

    const staffUnsub = onSnapshot(
      query(collection(db, 'staff'), where('status', '==', 'active')),
      (snapshot) => {
        setStats((prev) => ({ ...prev, activeStaff: snapshot.size }));
      }
    );

    const taskUnsub = onSnapshot(
      query(collection(db, 'tasks'), where('status', '==', 'pending')),
      (snapshot) => {
        setStats((prev) => ({ ...prev, pendingTasks: snapshot.size }));
      }
    );

    const stockUnsub = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      let lowStockCount = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.quantity <= data.lowStockThreshold) {
          lowStockCount++;
        }
      });
      setStats((prev) => ({ ...prev, lowStockItems: lowStockCount }));
    });

    return () => {
      invoiceUnsub();
      staffUnsub();
      taskUnsub();
      stockUnsub();
    };
  }, []);

  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [ordersChart, setOrdersChart] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const q = query(
        collection(db, 'invoices'),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end))
      );

      const snap = await getDocs(q);

      const result: any = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const key = date.toISOString().split('T')[0];
        result[key] = { date: key, sales: 0, orders: 0 };
      }

      snap.forEach((doc) => {
        const data = doc.data();
        const d = data.date.toDate ? data.date.toDate() : new Date(data.date);
        const key = d.toISOString().split('T')[0];
        if (result[key]) {
          result[key].sales += data.total || 0;
          result[key].orders += 1;
        }
      });

      const values = Object.values(result);
      setSalesChart(values);
      setOrdersChart(values);
    };

    fetch();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(3));
    const unsub = onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map((doc) => doc.data());
      setRecentTasks(tasks);
    });
    return () => unsub();
  }, []);

  const taskColumns = [
    { key: 'title', label: 'Task' },
    { key: 'assignedTo', label: 'Assigned To' },
    {
      key: 'priority',
      label: 'Priority',
      render: (value: string) => <Badge>{value}</Badge>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => <Badge>{value}</Badge>,
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight="bold">
        Dashboard
      </Typography>

      <Typography variant="caption" color="text.secondary">
        Last updated {new Date().toLocaleTimeString()}
      </Typography>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        {[
          {
            title: "Today's Sales",
            value: `₹${stats.todaySales}`,
            icon: <CurrencyRupeeIcon />,
            color: 'primary',
            go: 'billing',
          },
          {
            title: 'Orders',
            value: stats.todayOrders,
            icon: <ShoppingCartIcon />,
            go: 'billing',
          },
          {
            title: 'Active Staff',
            value: stats.activeStaff,
            icon: <GroupIcon />,
            go: 'staff',
          },
          establishmentType !== 'QSR' && {
            title: 'Available Tables',
            value: stats.availableTables,
            icon: <StoreIcon />,
            go: '',
          },
          {
            title: 'Pending Tasks',
            value: stats.pendingTasks,
            icon: <AssignmentIcon />,
            go: 'tasks',
          },
          {
            title: 'Low Stock Items',
            value: stats.lowStockItems,
            icon: <WarningIcon color="error" />,
            go: 'inventory',
          },
        ]
          .filter(Boolean)
          .map(
            (item: any, idx) =>
              item && (
                <Grid key={idx} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                  <ButtonBase
                    sx={{ width: '100%', textAlign: 'left', borderRadius: 2 }}
                    onClick={() => item.go && goTo(item.go)}
                  >
                    <Card sx={{ width: '100%' }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={1}>
                          {item.icon}
                          <Typography variant="subtitle2">{item.title}</Typography>
                        </Box>
                        <Typography fontWeight="bold">{item.value}</Typography>
                      </CardContent>
                    </Card>
                  </ButtonBase>
                </Grid>
              )
          )}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Sales Trend (7 Days)
        </Typography>
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#1976d2" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Orders per Day
        </Typography>
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ordersChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#43a047" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Recent Tasks
        </Typography>
        <Table columns={taskColumns} data={recentTasks} />
      </Box>
    </Box>
  );
}
