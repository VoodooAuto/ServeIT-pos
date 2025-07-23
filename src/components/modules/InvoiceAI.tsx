import React, { useState } from 'react';
import { CloudArrowUpIcon, DocumentTextIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Badge } from '../ui/Badge';

export function InvoiceAI() {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  };

  const processFiles = (files: File[]) => {
    setIsProcessing(true);
    
    // Simulate AI processing
    setTimeout(() => {
      const processedFiles = files.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'processed',
        extractedData: {
          vendor: 'ABC Suppliers Ltd',
          amount: 12450.00,
          date: '2024-01-15',
          invoiceNumber: 'INV-2024-001',
          items: [
            { name: 'Basmati Rice', quantity: 50, rate: 120, amount: 6000 },
            { name: 'Chicken', quantity: 20, rate: 280, amount: 5600 },
            { name: 'Spices Mix', quantity: 5, rate: 170, amount: 850 },
          ],
          tax: 2244.00,
          total: 14694.00
        }
      }));
      
      setUploadedFiles(prev => [...prev, ...processedFiles]);
      setIsProcessing(false);
    }, 3000);
  };

  const removeFile = (id: string) => {
    setUploadedFiles(files => files.filter(f => f.id !== id));
  };

  const approveInvoice = (id: string) => {
    setUploadedFiles(files => 
      files.map(f => 
        f.id === id ? { ...f, status: 'approved' } : f
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AI Invoice Processing</h1>
        <div className="flex items-center space-x-2">
          <Badge variant="success">AI Powered</Badge>
          <Badge variant="primary">Auto-Extract</Badge>
        </div>
      </div>

      {/* Upload Area */}
      <div className="card">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload Invoice Documents
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop your invoice files here, or click to select files
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="btn btn-primary cursor-pointer"
          >
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Select Files
          </label>
          <p className="text-sm text-gray-500 mt-2">
            Supports PDF, JPG, PNG files up to 10MB each
          </p>
        </div>
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span className="text-gray-700">Processing invoices with AI...</span>
          </div>
        </div>
      )}

      {/* Processed Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Processed Invoices</h2>
          {uploadedFiles.map(file => (
            <div key={file.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-8 w-8 text-primary-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">{file.name}</h3>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={file.status === 'approved' ? 'success' : 'warning'}>
                    {file.status}
                  </Badge>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {file.extractedData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Invoice Details */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Invoice Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Vendor:</span>
                        <span className="font-medium">{file.extractedData.vendor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Invoice #:</span>
                        <span className="font-medium">{file.extractedData.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Date:</span>
                        <span className="font-medium">{file.extractedData.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Subtotal:</span>
                        <span className="font-medium">₹{file.extractedData.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tax:</span>
                        <span className="font-medium">₹{file.extractedData.tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>₹{file.extractedData.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Line Items</h4>
                    <div className="space-y-2">
                      {file.extractedData.items.map((item: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-gray-900">{item.name}</h5>
                              <p className="text-sm text-gray-600">
                                {item.quantity} × ₹{item.rate}
                              </p>
                            </div>
                            <span className="font-medium">₹{item.amount.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button className="btn btn-secondary">
                  Edit Data
                </button>
                {file.status !== 'approved' && (
                  <button
                    onClick={() => approveInvoice(file.id)}
                    className="btn btn-success"
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Approve & Process
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Insights */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights & Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Processing Accuracy</h4>
            <p className="text-2xl font-bold text-blue-600">98.5%</p>
            <p className="text-sm text-blue-700">Average accuracy rate</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Time Saved</h4>
            <p className="text-2xl font-bold text-green-600">15 min</p>
            <p className="text-sm text-green-700">Per invoice processed</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">Monthly Savings</h4>
            <p className="text-2xl font-bold text-purple-600">₹25,000</p>
            <p className="text-sm text-purple-700">In processing costs</p>
          </div>
        </div>
      </div>
    </div>
  );
}