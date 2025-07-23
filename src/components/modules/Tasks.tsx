import { useState, useEffect } from 'react';
import { PlusIcon, ClockIcon, UserIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { db } from '../../utils/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import type { Task, Staff } from '../../types';

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [staffList, setStaffList] = useState<Staff[]>([]);

  // Fetch staff for assignment dropdown
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'staff'), (snapshot) => {
      setStaffList(snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          role: data.role || '',
          phone: data.phone || '',
          email: data.email || '',
          salary: data.salary || 0,
          joinDate: data.joinDate?.toDate ? data.joinDate.toDate() : new Date(data.joinDate),
          status: data.status || 'inactive',
        };
      }));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || '',
          description: data.description || '',
          assignedTo: data.assignedTo || '',
          priority: data.priority || 'low',
          status: data.status || 'pending',
          startDateTime: data.startDateTime?.toDate ? data.startDateTime.toDate() : (data.startDateTime ? new Date(data.startDateTime) : undefined),
          dueDateTime: data.dueDateTime?.toDate ? data.dueDateTime.toDate() : (data.dueDateTime ? new Date(data.dueDateTime) : undefined),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        };
      }));
    });
    return () => unsub();
  }, []);

  const filteredTasks = tasks.filter(task => {
    const statusMatch = selectedStatus === 'all' || task.status === selectedStatus;
    const priorityMatch = selectedPriority === 'all' || task.priority === selectedPriority;
    return statusMatch && priorityMatch;
  });

  const completeTask = async (taskId: string) => {
    await updateDoc(doc(db, 'tasks', taskId), { status: 'completed' });
  };

  const updateTaskStatus = async (taskId: string, status: 'pending' | 'in-progress' | 'completed') => {
    await updateDoc(doc(db, 'tasks', taskId), { status });
  };

  const addTask = async (formData: any) => {
    await addDoc(collection(db, 'tasks'), {
      title: formData.title,
      description: formData.description,
      assignedTo: formData.assignedTo,
      priority: formData.priority,
      status: 'pending',
      startDateTime: new Date(formData.startDateTime),
      dueDateTime: new Date(formData.dueDateTime),
      createdAt: new Date(),
    });
    setShowAddModal(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'warning';
      case 'pending': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks & Operations</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          <PlusIcon className="h-4 w-4" /> Add Task
        </button>
      </div>

      {/* Task Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
            </div>
            <ClockIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-warning-600">
                {tasks.filter(t => t.status === 'pending').length}
              </p>
            </div>
            <ClockIcon className="h-5 w-5 text-warning-400" />
          </div>
        </div>
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-primary-600">
                {tasks.filter(t => t.status === 'in-progress').length}
              </p>
            </div>
            <UserIcon className="h-5 w-5 text-primary-400" />
          </div>
        </div>
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-success-600">
                {tasks.filter(t => t.status === 'completed').length}
              </p>
            </div>
            <CheckCircleIcon className="h-5 w-5 text-success-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="input rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Task Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map(task => (
          <div key={task.id} className="card rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{task.title}</h3>
              <Badge variant={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">{task.description}</p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Assigned to:</span>
                <span className="text-sm font-medium">{task.assignedTo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Start:</span>
                <span className="text-sm font-medium">
                  {task.startDateTime ? new Date(task.startDateTime).toLocaleString() : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Due:</span>
                <span className="text-sm font-medium">
                  {task.dueDateTime ? new Date(task.dueDateTime).toLocaleString() : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={getStatusColor(task.status)}>
                  {task.status}
                </Badge>
              </div>
            </div>

            <div className="flex space-x-2">
              {task.status === 'pending' && (
                <button
                  onClick={() => updateTaskStatus(task.id, 'in-progress')}
                  className="btn btn-primary btn-sm flex-1"
                >
                  Start Task
                </button>
              )}
              {task.status === 'in-progress' && (
                <button
                  onClick={() => completeTask(task.id)}
                  className="btn btn-success btn-sm flex-1"
                >
                  Mark Complete
                </button>
              )}
              {task.status === 'completed' && (
                <div className="flex-1 text-center py-2 text-sm text-success-600 font-medium">
                  ✓ Completed
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Task Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Task"
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            addTask({
              title: formData.get('title'),
              description: formData.get('description'),
              assignedTo: formData.get('assignedTo'),
              priority: formData.get('priority'),
              startDateTime: formData.get('startDateTime'),
              dueDateTime: formData.get('dueDateTime'),
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title
            </label>
            <input
              type="text"
              name="title"
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              className="input w-full"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to
              </label>
              <select name="assignedTo" className="input w-full" required>
                <option value="">Select Staff</option>
                {staffList.filter(s => s.status === 'active').map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select name="priority" className="input w-full" required>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                name="startDateTime"
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due On (Date & Time)
              </label>
              <input
                type="datetime-local"
                name="dueDateTime"
                className="input w-full"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary rounded-lg shadow">Cancel</button>
            <button type="submit" className="btn btn-primary rounded-lg shadow">Add Task</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}