export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'staff';
    avatar?: string;
  }
  
  export interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    description?: string;
    image?: string;
    available: boolean;
    modifiers?: Modifier[];
  }
  
  export interface Modifier {
    id: string;
    name: string;
    price: number;
    required: boolean;
    options: ModifierOption[];
  }
  
  export interface ModifierOption {
    id: string;
    name: string;
    price: number;
  }
  
  export interface OrderItem {
    id: string;
    menuItem: MenuItem;
    quantity: number;
    modifiers: ModifierOption[];
    notes?: string;
    total: number;
    category?: string;
    name?: string; // Add for compatibility
    price?: number; // Add for compatibility
  }
  
  export interface Order {
    id: string;
    tableNumber?: number;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid';
    timestamp: Date;
    customer?: Customer;
  }
  
  export interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
  }
  
  export interface Table {
    id: string;
    number: number;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved' | 'cleaning';
    currentOrder?: Order;
  }
  
  export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    lowStockThreshold: number;
    price: number;
    supplier: string;
    expiryDate?: Date;
    batchNumber?: string;
  }
  
  export interface Staff {
    id: string;
    name: string;
    role: string;
    phone: string;
    email: string;
    salary: number;
    joinDate: Date;
    status: 'active' | 'inactive';
    attendanceToday?: AttendanceRecord;
  }
  
  export interface AttendanceRecord {
    id: string;
    staffId: string;
    date: Date;
    clockIn?: Date;
    clockOut?: Date;
    breakStart?: Date;
    breakEnd?: Date;
    totalHours: number;
    status: 'present' | 'absent' | 'late' | 'half-day';
  }
  
  export interface Invoice {
    id: string;
    invoiceNumber: string;
    date: Date;
    customer: Customer;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: 'cash' | 'card' | 'upi' | 'online';
    status: 'paid' | 'pending' | 'overdue';
  }
  
  export interface Task {
    id: string;
    title: string;
    description: string;
    assignedTo: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in-progress' | 'completed';
    dueDate?: Date;
    startDateTime?: Date;
    dueDateTime?: Date;
    createdAt: Date;
  }
  
  export interface SalesData {
    date: string;
    sales: number;
    orders: number;
    avgOrderValue: number;
  }
  
  export interface DashboardStats {
    todaySales: number;
    todayOrders: number;
    activeStaff: number;
    availableTables: number;
    pendingTasks: number;
    lowStockItems: number;
  }