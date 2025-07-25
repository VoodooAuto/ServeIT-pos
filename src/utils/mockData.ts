import type { MenuItem, Table, Staff, InventoryItem, Task, SalesData, DashboardStats } from '../types';

export const mockMenuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Chicken Biryani',
    price: 299,
    category: 'Main Course',
    description: 'Aromatic basmati rice with tender chicken pieces',
    available: true,
  },
  {
    id: '2',
    name: 'Paneer Butter Masala',
    price: 249,
    category: 'Main Course',
    description: 'Creamy tomato-based curry with paneer',
    available: true,
  },
  {
    id: '3',
    name: 'Masala Dosa',
    price: 149,
    category: 'South Indian',
    description: 'Crispy dosa with spiced potato filling',
    available: true,
  },
  {
    id: '4',
    name: 'Mango Lassi',
    price: 89,
    category: 'Beverages',
    description: 'Refreshing yogurt-based mango drink',
    available: true,
  },
  {
    id: '5',
    name: 'Tandoori Chicken',
    price: 349,
    category: 'Starters',
    description: 'Marinated chicken grilled in tandoor',
    available: true,
  },
  {
    id: '6',
    name: 'Mutton Curry',
    price: 399,
    category: 'Main Course',
    description: 'Spicy mutton curry with traditional spices',
    available: true,
  },
];

export const mockTables: Table[] = [
  { id: '1', number: 1, capacity: 4, status: 'available' },
  { id: '2', number: 2, capacity: 2, status: 'occupied' },
  { id: '3', number: 3, capacity: 6, status: 'available' },
  { id: '4', number: 4, capacity: 4, status: 'reserved' },
  { id: '5', number: 5, capacity: 8, status: 'available' },
  { id: '6', number: 6, capacity: 2, status: 'cleaning' },
];

export const mockStaff: Staff[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    role: 'Chef',
    phone: '+91 9876543210',
    email: 'rajesh@khilao.com',
    salary: 35000,
    joinDate: new Date('2023-01-15'),
    status: 'active',
    attendanceToday: {
      id: '1',
      staffId: '1',
      date: new Date(),
      clockIn: new Date('2024-01-15T09:00:00'),
      totalHours: 8,
      status: 'present',
    },
  },
  {
    id: '2',
    name: 'Priya Sharma',
    role: 'Waiter',
    phone: '+91 9876543211',
    email: 'priya@khilao.com',
    salary: 25000,
    joinDate: new Date('2023-03-20'),
    status: 'active',
    attendanceToday: {
      id: '2',
      staffId: '2',
      date: new Date(),
      clockIn: new Date('2024-01-15T09:15:00'),
      totalHours: 8,
      status: 'present',
    },
  },
  {
    id: '3',
    name: 'Amit Patel',
    role: 'Manager',
    phone: '+91 9876543212',
    email: 'amit@khilao.com',
    salary: 50000,
    joinDate: new Date('2022-11-10'),
    status: 'active',
  },
];

export const mockInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'Basmati Rice',
    category: 'Grains',
    quantity: 25,
    unit: 'kg',
    lowStockThreshold: 10,
    price: 120,
    supplier: 'Rice Suppliers Ltd',
    expiryDate: new Date('2024-12-31'),
  },
  {
    id: '2',
    name: 'Chicken',
    category: 'Meat',
    quantity: 5,
    unit: 'kg',
    lowStockThreshold: 8,
    price: 280,
    supplier: 'Fresh Meat Co',
    expiryDate: new Date('2024-01-20'),
  },
  {
    id: '3',
    name: 'Paneer',
    category: 'Dairy',
    quantity: 3,
    unit: 'kg',
    lowStockThreshold: 5,
    price: 320,
    supplier: 'Dairy Fresh',
    expiryDate: new Date('2024-01-18'),
  },
  {
    id: '4',
    name: 'Tomatoes',
    category: 'Vegetables',
    quantity: 15,
    unit: 'kg',
    lowStockThreshold: 5,
    price: 40,
    supplier: 'Veggie Mart',
    expiryDate: new Date('2024-01-22'),
  },
];

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Clean Kitchen Equipment',
    description: 'Deep clean all kitchen equipment and sanitize surfaces',
    assignedTo: 'Rajesh Kumar',
    priority: 'high',
    status: 'pending',
    dueDate: new Date('2024-01-16'),
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: 'Update Menu Prices',
    description: 'Review and update menu prices for new items',
    assignedTo: 'Amit Patel',
    priority: 'medium',
    status: 'in-progress',
    dueDate: new Date('2024-01-18'),
    createdAt: new Date('2024-01-14'),
  },
  {
    id: '3',
    title: 'Staff Training Session',
    description: 'Conduct training session for new POS system',
    assignedTo: 'Priya Sharma',
    priority: 'low',
    status: 'completed',
    dueDate: new Date('2024-01-15'),
    createdAt: new Date('2024-01-10'),
  },
];

export const mockSalesData: SalesData[] = [
  { date: '2024-01-08', sales: 12500, orders: 45, avgOrderValue: 278 },
  { date: '2024-01-09', sales: 15200, orders: 52, avgOrderValue: 292 },
  { date: '2024-01-10', sales: 18300, orders: 61, avgOrderValue: 300 },
  { date: '2024-01-11', sales: 16800, orders: 58, avgOrderValue: 290 },
  { date: '2024-01-12', sales: 21200, orders: 67, avgOrderValue: 316 },
  { date: '2024-01-13', sales: 19500, orders: 63, avgOrderValue: 310 },
  { date: '2024-01-14', sales: 22800, orders: 72, avgOrderValue: 317 },
];

export const mockDashboardStats: DashboardStats = {
  todaySales: 22800,
  todayOrders: 72,
  activeStaff: 3,
  availableTables: 3,
  pendingTasks: 2,
  lowStockItems: 2,
};