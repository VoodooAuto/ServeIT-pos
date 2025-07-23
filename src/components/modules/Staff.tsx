import { useState, useEffect } from 'react';
import { PlusIcon, ClockIcon, UserIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { db } from '../../utils/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import type { Staff as StaffType } from '../../types';
import { ADMIN_PASSWORD } from '../../utils/config';

const mockStaff: StaffType[] = [
  { id: '1', name: 'Amit Kumar', role: 'cashier', phone: '9876543210', email: 'amit@example.com', salary: 15000, joinDate: new Date('2023-01-01'), status: 'active' },
  { id: '2', name: 'Priya Sharma', role: 'manager', phone: '9123456780', email: 'priya@example.com', salary: 25000, joinDate: new Date('2022-06-15'), status: 'active' },
  { id: '3', name: 'Ravi Singh', role: 'kitchen', phone: '9988776655', email: 'ravi@example.com', salary: 12000, joinDate: new Date('2023-03-10'), status: 'active' },
];

export function Staff({ userRole }: { userRole: string | null }) {
  const [tab, setTab] = useState<'attendance' | 'payroll' | 'performance'>('attendance');
  const [staff, setStaff] = useState<StaffType[]>(mockStaff);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add real-time Firestore listener for staff
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'staff'), (snapshot) => {
      setStaff(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          role: data.role || '',
          phone: data.phone || '',
          email: data.email || '',
          salary: data.salary || 0,
          joinDate: data.joinDate?.toDate ? data.joinDate.toDate() : new Date(data.joinDate),
          status: data.status || 'inactive',
          attendanceToday: data.attendanceToday || undefined,
        };
      }));
    });
    return () => unsub();
  }, []);

  // Fetch attendance records for today/month
  useEffect(() => {
    const q = query(collection(db, 'attendanceRecords'), where('date', '>=', month + '-01'), where('date', '<=', month + '-31'));
    const unsub = onSnapshot(q, (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [month]);

  // Calculate payroll
  useEffect(() => {
    const payrollData = staff.map(s => {
      const daysPresent = attendance.filter(a => a.staffId === s.id && a.status === 'present').length;
      return {
        ...s,
        daysPresent,
        salaryDue: daysPresent * (s.salary / 30),
        paid: false,
      };
    });
    setPayroll(payrollData);
  }, [attendance, staff]);

  // Clock In/Out handlers
  const handleClockIn = async (staffId: string) => {
    await addDoc(collection(db, 'attendanceRecords'), {
      staffId,
      date: today,
      clockIn: Timestamp.now(),
      status: 'present',
    });
  };
  const handleClockOut = async (attendanceId: string) => {
    await updateDoc(doc(db, 'attendanceRecords', attendanceId), {
      clockOut: Timestamp.now(),
    });
  };
  // Mark payroll as paid
  const handleMarkPaid = async (staffId: string) => {
    await addDoc(collection(db, 'payrollRecords'), {
      staffId,
      month,
      paidAt: Timestamp.now(),
    });
    setPayroll(payroll.map(p => p.id === staffId ? { ...p, paid: true } : p));
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Name',
      render: (_value: string, row: StaffType) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-primary-600" />
          </div>
          <span className="font-medium">{row.name}</span>
        </div>
      )
    },
    { key: 'role', label: 'Role' },
    { 
      key: 'phone', 
      label: 'Phone',
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <PhoneIcon className="h-4 w-4 text-gray-400" />
          <span>{value}</span>
        </div>
      )
    },
    { 
      key: 'salary', 
      label: 'Salary',
      render: (value: number) => `₹${value.toLocaleString()}`
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'active' ? 'success' : 'error'}>
          {value}
        </Badge>
      )
    },
    { 
      key: 'attendance', 
      label: 'Today',
      render: (_value: any, row: StaffType) => (
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm">
            {row.attendanceToday?.clockIn
              ? new Date(row.attendanceToday.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Not clocked in'}
          </span>
        </div>
      )
    },
    { 
      key: 'actions', 
      label: 'Actions',
      render: (_value: any, row: StaffType) => (
        <div className="flex space-x-2">
          {userRole === 'manager' && (
            <button
              onClick={() => {
                const password = window.prompt('Enter admin password to proceed:');
                if (password !== ADMIN_PASSWORD) {
                  alert('Incorrect password. Action cancelled.');
                  return;
                }
                setSelectedStaff(row);
                setShowAddModal(true);
              }}
              className="p-1 rounded hover:bg-blue-100 text-blue-600 font-semibold"
              title="Edit"
            >
              Edit
            </button>
          )}
          <button
            onClick={async () => {
              const password = window.prompt('Enter admin password to proceed:');
              if (password !== ADMIN_PASSWORD) {
                alert('Incorrect password. Action cancelled.');
                return;
              }
              if (window.confirm('Are you sure you want to delete this staff member?')) {
                try {
                  await deleteDoc(doc(db, 'staff', row.id));
                  alert('Staff deleted successfully!');
                } catch (err) {
                  alert('Failed to delete staff: ' + (err as Error).message);
                }
              }
            }}
            className="p-1 rounded hover:bg-red-100 text-red-600 font-semibold"
            title="Delete"
          >
            Delete
          </button>
        </div>
      )
    },
  ];

  const addOrEditStaff = async (formData: any) => {
    try {
      if (selectedStaff) {
        // Edit existing staff
        const staffRef = doc(db, 'staff', selectedStaff.id);
        await updateDoc(staffRef, {
          name: formData.name,
          role: formData.role,
          phone: formData.phone,
          salary: Number(formData.salary),
        });
        alert('Staff updated successfully!');
      } else {
        // Add new staff
        await addDoc(collection(db, 'staff'), {
          name: formData.name,
          role: formData.role,
          phone: formData.phone,
          salary: Number(formData.salary),
          status: 'active',
          attendanceToday: null,
        });
      }
      setShowAddModal(false);
      setSelectedStaff(null);
    } catch (err) {
      alert('Failed to save staff: ' + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Style tab buttons */}
      <div className="flex gap-4 mb-4">
        <button className={`px-4 py-2 rounded-lg shadow font-semibold transition-colors ${tab === 'attendance' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`} onClick={() => setTab('attendance')}>Attendance</button>
        {userRole === 'admin' && (
          <button className={`px-4 py-2 rounded-lg shadow font-semibold transition-colors ${tab === 'payroll' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`} onClick={() => setTab('payroll')}>Payroll</button>
        )}
        <button className={`px-4 py-2 rounded-lg shadow font-semibold transition-colors ${tab === 'performance' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`} onClick={() => setTab('performance')}>Performance</button>
      </div>
      {/* 2. Style Add Employee button */}
      {userRole === 'admin' && (
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition mb-4" onClick={() => { setSelectedStaff(null); setShowAddModal(true); }}>
          Add Employee
        </button>
      )}
      {/* 3. Style card containers and table headers */}
      {tab === 'attendance' && (
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Today's Attendance</h2>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Name</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Role</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Status</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Clock In</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Clock Out</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => {
                const record = attendance.find(a => a.staffId === s.id && a.date === today);
                return (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.role}</td>
                    <td>{record ? record.status : 'absent'}</td>
                    <td>{record && record.clockIn ? new Date(record.clockIn.toDate()).toLocaleTimeString() : '-'}</td>
                    <td>{record && record.clockOut ? new Date(record.clockOut.toDate()).toLocaleTimeString() : '-'}</td>
                    <td>
                      {!record && <button className="btn btn-success btn-xs" onClick={() => handleClockIn(s.id)}>Clock In</button>}
                      {record && !record.clockOut && <button className="btn btn-warning btn-xs" onClick={() => handleClockOut(record.id)}>Clock Out</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'payroll' && userRole === 'admin' && (
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Payroll ({month})</h2>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Name</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Role</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Days Present</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Salary Due</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.role}</td>
                  <td>{p.daysPresent}</td>
                  <td>₹{p.salaryDue.toFixed(2)}</td>
                  <td>
                    {!p.paid && <button className="btn btn-primary btn-xs" onClick={() => handleMarkPaid(p.id)}>Mark as Paid</button>}
                    {p.paid && <span className="text-success-600 font-bold">Paid</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'performance' && (
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Staff Performance ({month})</h2>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Name</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Role</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Days Present</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Attendance Rate</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Total Hours</th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-xs text-gray-600">Payroll Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => {
                const records = attendance.filter(a => a.staffId === s.id && a.date.startsWith(month));
                const daysPresent = records.filter(a => a.status === 'present').length;
                const totalWorkingDays = new Date().getDate();
                const attendanceRate = totalWorkingDays ? Math.round((daysPresent / totalWorkingDays) * 100) : 0;
                const totalHours = records.reduce((sum, a) => sum + (a.totalHours || 0), 0);
                const payrollRecord = payroll.find(p => p.id === s.id);
                return (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.role}</td>
                    <td>{daysPresent}</td>
                    <td>{attendanceRate}%</td>
                    <td>{totalHours.toFixed(1)}</td>
                    <td>{payrollRecord && payrollRecord.paid ? <span className="text-success-600 font-bold">Paid</span> : <span className="text-warning-600 font-bold">Unpaid</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showAddModal && (
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={selectedStaff ? 'Edit Employee' : 'Add Employee'}>
          <form onSubmit={async e => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);
            const data = {
              name: formData.get('name') as string,
              role: formData.get('role') as string,
              phone: formData.get('phone') as string,
              email: formData.get('email') as string,
              salary: Number(formData.get('salary')),
              status: formData.get('status') as string,
            };
            await addOrEditStaff(data);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input name="name" defaultValue={selectedStaff?.name || ''} className="input w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select name="role" defaultValue={selectedStaff?.role || 'cashier'} className="input w-full" required>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="chef">Chef</option>
                  <option value="commi2">Commi 2</option>
                  <option value="commi3">Commi 3</option>
                  <option value="helper">Helper</option>
                  <option value="kitchen">Kitchen</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input name="phone" defaultValue={selectedStaff?.phone || ''} className="input w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input name="email" defaultValue={selectedStaff?.email || ''} className="input w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Salary (₹/month)</label>
                <input name="salary" type="number" defaultValue={selectedStaff?.salary || ''} className="input w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select name="status" defaultValue={selectedStaff?.status || 'active'} className="input w-full" required>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            {/* 5. Style modal buttons */}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{selectedStaff ? 'Save' : 'Add'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}