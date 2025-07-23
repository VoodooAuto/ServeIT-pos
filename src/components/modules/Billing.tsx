import { useState, useEffect } from 'react';
import { PrinterIcon, DocumentTextIcon, CurrencyRupeeIcon } from '@heroicons/react/24/outline';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Table } from '../ui/Table';
import { db } from '../../utils/firebase';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { createPortal } from 'react-dom';

export function Invoices() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'invoices'), orderBy('date', 'desc'), limit(15));
    const unsub = onSnapshot(q, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (showPrintModal) {
      const handleAfterPrint = () => setShowPrintModal(false);
      window.addEventListener('afterprint', handleAfterPrint);
      return () => window.removeEventListener('afterprint', handleAfterPrint);
    }
  }, [showPrintModal]);

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'date', label: 'Date', render: (value: any) => value?.toDate ? value.toDate().toLocaleString() : '' },
    { key: 'total', label: 'Total', render: (_: any, row: any) => {
      const subtotal = (row.items || []).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      const gst = subtotal * 0.05;
      const total = subtotal + gst;
      return `₹${total.toFixed(2)}`;
    } },
    { key: 'status', label: 'Status', render: (value: string) => <Badge variant={value === 'paid' ? 'success' : 'warning'}>{value}</Badge> },
    { key: 'paymentMethod', label: 'Payment' },
    { key: 'actions', label: 'Actions', render: (_: any, row: any) => (
      <div className="flex gap-2">
        <button className="btn btn-secondary btn-sm flex items-center rounded-lg shadow hover:bg-blue-100 transition" onClick={() => handlePrintInvoice(row)}>
          <PrinterIcon className="h-4 w-4 mr-1" /> Print
        </button>
        {row.status === 'pending' && (
          <button className="btn btn-success btn-sm flex items-center rounded-lg shadow hover:bg-green-100 transition" onClick={() => markInvoiceAsPaid(row.id)}>
            Mark as Paid
          </button>
        )}
      </div>
    ) },
  ];

  const invoiceStats = invoices.map(inv => {
    const subtotal = (inv.items || []).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const gst = subtotal * 0.05;
    const cgst = gst / 2;
    const sgst = gst / 2;
    const total = subtotal + gst;
    return { subtotal, gst, cgst, sgst, total };
  });

  const totalSales = invoiceStats.reduce((sum, s) => sum + s.total, 0);
  const totalGST = invoiceStats.reduce((sum, s) => sum + s.gst, 0);
  const totalCGST = invoiceStats.reduce((sum, s) => sum + s.cgst, 0);
  const totalSGST = invoiceStats.reduce((sum, s) => sum + s.sgst, 0);
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;

  const restaurantInfo = {
    name: 'Khilao Restaurant',
    address: '123 Main Street, City, State 12345',
    gst: '27AAACR4849R1ZN',
    fssai: '12345678901234',
    contact: '+91 9876543210',
    operator: 'Admin User',
  };

  const printCSS = `
@media print {
  body > *:not(#print-area) { display: none !important; }
  #print-area, #print-area * { display: block !important; visibility: visible !important; }
  #print-area {
    position: absolute !important;
    left: 0; top: 0;
    width: 2in !important;
    min-width: 0 !important;
    max-width: 2in !important;
    box-shadow: none !important;
    background: #fff !important;
    font-family: 'Menlo', 'Consolas', 'monospace', monospace !important;
    font-size: 10px !important;
    padding: 0.1in 0.05in !important;
  }
  .print-hidden, header, footer { display: none !important; }
  @page { size: 2in auto; margin: 0; }
}
`;

  function handlePrintInvoice(invoice: any) {
    const subtotal = invoice.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;
    const gst = subtotal * 0.05;
    const total = subtotal + gst;
    const restaurantInfo = {
      name: 'Khilao Restaurant',
      address: '123 Main Street, City, State 12345',
      gst: '27AAACR4849R1ZN',
      fssai: '12345678901234',
      contact: '+91 9876543210',
      operator: 'Admin User',
    };
    const html = `
    <html>
    <head>
      <title>Invoice</title>
      <style>
        body { font-family: Menlo, Consolas, monospace; font-size: 10px; margin: 0; padding: 0; }
        .invoice { width: 2in; margin: 0 auto; padding: 0.1in 0.05in; background: #fff; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        th, td { padding: 0; }
        th { text-align: left; font-weight: bold; border-bottom: 1px solid #333; }
        td, th { font-size: 10px; }
        .totals { border-top: 1px solid #333; font-weight: bold; }
        .thankyou { text-align: center; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="center bold" style="font-size:14px;">${restaurantInfo.name}</div>
        <div class="center" style="margin-bottom:2px;">
          ${restaurantInfo.address}<br />
          PHONE : ${restaurantInfo.contact}<br />
          GSTIN : ${restaurantInfo.gst}<br />
          FSSAI : ${restaurantInfo.fssai}
        </div>
        <div style="font-size:10px; margin-bottom:2px;">
          Bill No: ${invoice.invoiceNumber} &nbsp; Date: ${invoice.date?.toDate ? invoice.date.toDate().toLocaleDateString() : ''}<br />
          Operator: ${restaurantInfo.operator}
        </div>
        <table>
          <thead>
            <tr><th>SN</th><th>Item</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Amt</th></tr>
          </thead>
          <tbody>
            ${(invoice.items || []).map((item: any, idx: number) =>
              `<tr><td>${idx + 1}</td><td>${item.name || item.menuItem?.name}</td><td style="text-align:right;">${item.quantity}</td><td style="text-align:right;">${item.price}</td><td style="text-align:right;">${(item.price * item.quantity).toFixed(2)}</td></tr>`
            ).join('')}
          </tbody>
        </table>
        <div style="display:flex; justify-content:space-between;"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>GST (5%)</span><span>₹${gst.toFixed(2)}</span></div>
        <div class="totals" style="display:flex; justify-content:space-between;"><span>TOTAL</span><span>₹${total.toFixed(2)}</span></div>
        <div class="thankyou">Thank You</div>
      </div>
      <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
    </body>
    </html>
  `;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    }
  }

  // Add a function to mark invoice as paid
  async function markInvoiceAsPaid(invoiceId: string) {
    if (!window.confirm('Mark this invoice as paid?')) return;
    await updateDoc(doc(db, 'invoices', invoiceId), { status: 'paid' });
  }

  return (
    <div className="space-y-6">
      <style>{printCSS}</style>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
      </div>

      {/* Daily Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalSales.toFixed(2)}</p>
            </div>
            <CurrencyRupeeIcon className="h-5 w-5 text-primary-400" />
          </div>
        </div>
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">GST Collected</p>
              <p className="text-2xl font-bold text-success-600">₹{totalGST.toFixed(2)}</p>
            </div>
            <DocumentTextIcon className="h-5 w-5 text-success-400" />
          </div>
        </div>
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{totalInvoices}</p>
            </div>
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="card rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paid Invoices</p>
              <p className="text-2xl font-bold text-primary-600">{paidInvoices}</p>
            </div>
            <DocumentTextIcon className="h-5 w-5 text-primary-400" />
          </div>
        </div>
      </div>

      {/* GST Summary */}
      <div className="card rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">GST Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">CGST (2.5%)</h4>
            <p className="text-2xl font-bold text-blue-600">₹{totalCGST.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">SGST (2.5%)</h4>
            <p className="text-2xl font-bold text-green-600">₹{totalSGST.toFixed(2)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">Total GST</h4>
            <p className="text-2xl font-bold text-purple-600">₹{totalGST.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card rounded-xl shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
        </div>
        <Table columns={columns} data={invoices} />
      </div>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Invoice"
        size="lg"
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name
              </label>
              <input type="text" className="input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Phone
              </label>
              <input type="tel" className="input w-full" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Address
            </label>
            <textarea className="input w-full" rows={3} />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Items</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <input type="text" placeholder="Item name" className="input" />
                <input type="number" placeholder="Quantity" className="input" />
                <input type="number" placeholder="Rate" className="input" />
                <input type="number" placeholder="Amount" className="input" readOnly />
              </div>
              <button type="button" className="btn btn-secondary btn-sm">
                Add Item
              </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹0.00</span>
              </div>
              <div className="flex justify-between">
                <span>GST (18%):</span>
                <span>₹0.00</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>₹0.00</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary rounded-lg shadow">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary rounded-lg shadow">
              Create Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* Invoice Details Modal */}
      <Modal
        isOpen={selectedInvoice !== null}
        onClose={() => setSelectedInvoice(null)}
        title="Invoice Details"
        size="lg"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
              <p className="text-gray-600">{selectedInvoice.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Bill To:</h4>
                <p className="text-gray-700">{selectedInvoice.customer}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Invoice Date:</h4>
                <p className="text-gray-700">{selectedInvoice.date}</p>
              </div>
            </div>

            <div className="border-t border-b py-4">
              <div className="grid grid-cols-4 gap-4 font-medium text-gray-900 mb-2">
                <span>Item</span>
                <span>Qty</span>
                <span>Rate</span>
                <span>Amount</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-gray-700">
                <span>Sample Item</span>
                <span>1</span>
                <span>₹{selectedInvoice.amount.toFixed(2)}</span>
                <span>₹{selectedInvoice.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{selectedInvoice.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (18%):</span>
                <span>₹{selectedInvoice.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>₹{selectedInvoice.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button className="btn btn-secondary">
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print
              </button>
              <button className="btn btn-primary">
                Send Email
              </button>
            </div>
          </div>
        )}
      </Modal>

      {showPrintModal && createPortal((() => {
        const subtotal = selectedInvoice?.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;
        const gst = subtotal * 0.05;
        const total = subtotal + gst;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 print:bg-transparent" id="print-portal-root">
            <style>{printCSS}</style>
            <div className="bg-white p-8 rounded-lg shadow-lg w-[350px] print:w-full print:rounded-none print:shadow-none" id="print-area" style={{ fontFamily: 'Menlo, Consolas, monospace' }}>
              <div className="text-center mb-2">
                <h2 className="text-xl font-bold tracking-wide">{restaurantInfo.name}</h2>
                <div className="text-xs text-gray-700 leading-tight">
                  {restaurantInfo.address}<br />
                  PHONE : {restaurantInfo.contact}<br />
                  GSTIN : {restaurantInfo.gst}<br />
                  FSSAI : {restaurantInfo.fssai}
                </div>
              </div>
              <div className="flex justify-between text-xs mb-2">
                <span>Bill No: {selectedInvoice?.invoiceNumber}</span>
                <span>Date: {selectedInvoice?.date?.toDate ? selectedInvoice.date.toDate().toLocaleDateString() : ''}</span>
              </div>
              <div className="flex justify-between text-xs mb-2">
                <span>Operator: {restaurantInfo.operator}</span>
              </div>
              <table className="w-full text-xs border-t border-b border-gray-300 mb-2" style={{ fontFamily: 'Menlo, Consolas, monospace' }}>
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left">SN</th>
                    <th className="text-left">Item</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice?.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{item.name || item.menuItem?.name}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">{item.price}</td>
                      <td className="text-right">{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between text-xs mb-1">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span>GST (5%)</span>
                <span>₹{gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold border-t border-gray-300 pt-1 mb-2">
                <span>TOTAL</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <div className="text-center text-xs mt-2">Thank You</div>
              <div className="flex justify-end mt-4 print-hidden">
                <button className="btn btn-secondary mr-2" onClick={() => setShowPrintModal(false)}>Close</button>
                <button className="btn btn-primary" onClick={() => { window.print(); }}>Print</button>
              </div>
            </div>
          </div>
        );
      })(), document.body)}
    </div>
  );
}