import { useState, useEffect } from 'react';
import { CalendarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyRupeeIcon } from '@heroicons/react/24/outline';
import { StatCard } from '../ui/StatCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { db } from '../../utils/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Modal } from '../ui/Modal';

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#f472b6', '#facc15'];

function getDateRange(range: string, customStart?: Date, customEnd?: Date) {
  if (range === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }
  const now = new Date();
  let start;
  if (range === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (range === '7days') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  else if (range === '30days') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  else if (range === '90days') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89);
  else if (range === '1year') start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  else start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  return { start, end: now };
}

export function Analytics() {
  const [dateRange, setDateRange] = useState('7days');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      const { start, end } = getDateRange(dateRange, customStart ? new Date(customStart) : undefined, customEnd ? new Date(customEnd) : undefined);
      const q = query(collection(db, 'invoices'), where('date', '>=', start), where('date', '<=', end));
      const snap = await getDocs(q);
      const invoices = snap.docs.map(doc => doc.data());
      // Aggregate sales by day
      const dayMap = new Map();
      const hourMap = new Map();
      const itemMap = new Map();
      const categoryMap = new Map();
      let salesSum = 0;
      let orderCount = 0;
      invoices.forEach((inv: any) => {
        const d = inv.date?.toDate ? inv.date.toDate() : new Date(inv.date);
        const dayKey = d.toISOString().slice(0, 10);
        const hourKey = d.getHours();
        salesSum += inv.total || 0;
        orderCount++;
        // By day
        if (!dayMap.has(dayKey)) dayMap.set(dayKey, { date: dayKey, sales: 0, orders: 0 });
        dayMap.get(dayKey).sales += inv.total || 0;
        dayMap.get(dayKey).orders += 1;
        // By hour
        if (!hourMap.has(hourKey)) hourMap.set(hourKey, { hour: `${hourKey}:00`, sales: 0, orders: 0 });
        hourMap.get(hourKey).sales += inv.total || 0;
        hourMap.get(hourKey).orders += 1;
        // By item/category
        (inv.items || []).forEach((item: any) => {
          // Top items
          if (!itemMap.has(item.name)) itemMap.set(item.name, { name: item.name, sales: 0, revenue: 0 });
          itemMap.get(item.name).sales += item.quantity || 0;
          itemMap.get(item.name).revenue += (item.price || 0) * (item.quantity || 0);
          // Category
          if (item.category) {
            if (!categoryMap.has(item.category)) categoryMap.set(item.category, { name: item.category, value: 0 });
            categoryMap.get(item.category).value += (item.price || 0) * (item.quantity || 0);
          }
        });
      });
      // Prepare chart data
      const salesArr = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      const hourArr = Array.from(hourMap.values()).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
      const topArr = Array.from(itemMap.values()).sort((a, b) => b.sales - a.sales).slice(0, 5);
      const catArr = Array.from(categoryMap.values()).map((cat, i) => ({ ...cat, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
      setSalesData(salesArr);
      setHourlyData(hourArr);
      setTopItems(topArr);
      setCategoryData(catArr);
      setTotalSales(salesSum);
      setTotalOrders(orderCount);
      setAvgOrderValue(orderCount ? salesSum / orderCount : 0);
      setLoading(false);
    }
    fetchAnalytics();
  }, [dateRange, customStart, customEnd]);

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      setDateRange('custom');
      setShowCustomModal(false);
    }
  };

  let customLabel = 'Custom Range';
  if (dateRange === 'custom' && customStart && customEnd) {
    customLabel = `${new Date(customStart).toLocaleDateString()} - ${new Date(customEnd).toLocaleDateString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
            <option value="custom">{customLabel}</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition" onClick={() => setShowCustomModal(true)}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Custom Range
          </button>
        </div>
      </div>
      <Modal isOpen={showCustomModal} onClose={() => setShowCustomModal(false)} title="Select Custom Date Range">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input type="date" className="input w-full" value={customStart} onChange={e => setCustomStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input type="date" className="input w-full" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn btn-secondary rounded-lg shadow" onClick={() => setShowCustomModal(false)}>Cancel</button>
            <button className="btn btn-primary rounded-lg shadow" onClick={handleCustomApply} disabled={!customStart || !customEnd}>Apply</button>
          </div>
        </div>
      </Modal>
      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading analytics...</div>
      ) : (
      <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={`₹${totalSales.toLocaleString()}`}
          change=""
          trend="up"
          icon={<CurrencyRupeeIcon className="h-6 w-6 text-primary-600" />}
        />
        <StatCard
          title="Total Orders"
          value={totalOrders}
          change=""
          trend="up"
          icon={<ArrowTrendingUpIcon className="h-6 w-6 text-success-600" />}
        />
        <StatCard
          title="Avg Order Value"
          value={`₹${avgOrderValue.toFixed(0)}`}
          change=""
          trend="up"
          icon={<ArrowTrendingUpIcon className="h-6 w-6 text-primary-600" />}
        />
        <StatCard
          title="Customer Retention"
          value="-"
          change=""
          trend="neutral"
          icon={<ArrowTrendingDownIcon className="h-6 w-6 text-error-600" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
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

        {/* Order Volume */}
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
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

        {/* Category Distribution */}
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Sales Pattern */}
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Sales Pattern</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${value}`, 'Sales']} />
              <Bar dataKey="sales" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performing Items */}
      <div className="card rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Items</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Item Name</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Units Sold</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Revenue</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Performance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topItems.map((item, index) => (
                <tr key={item.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-primary-600">#{index + 1}</span>
                      </div>
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.sales}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{item.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full" 
                        style={{ width: `${(item.sales / (topItems[0]?.sales || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}