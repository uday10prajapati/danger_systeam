import React, { useState, useEffect } from 'react';
import { Plus, X, Eye, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import GSTSelector from './GSTSelector';

export default function SaleReturnForm({ onClose, onSuccess }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1: Select Sale, 2: Select Items, 3: Review
  const [availableSales, setAvailableSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [refundType, setRefundType] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gstData, setGstData] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      } else {
        setCompany(null);
      }
    } catch (error) {
      setCompany(null);
    }
  };

  useEffect(() => {
    if (step === 1 && company?.id) {
      fetchAvailableSales();
    }
  }, [step, company]);

  const fetchAvailableSales = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/sale-returns/available-sales`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      setAvailableSales(response.data.data);
    } catch (err) {
      setError('Failed to fetch available sales');
    }
  };

  const handleSelectSale = async (sale) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/sale-returns/sale/${sale.id}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      setSelectedSale(response.data.data);
      // Initialize return items with all original items
      setReturnItems(
        response.data.data.items.map(item => ({
          ...item,
          return_quantity: 0,
          return_amount: 0
        }))
      );
      setStep(2);
    } catch (err) {
      setError('Failed to load sale details');
    }
  };

  const handleReturnQtyChange = (index, qty) => {
    const updated = [...returnItems];
    const quantity = Math.min(qty, updated[index].quantity);
    updated[index].return_quantity = quantity;
    updated[index].return_amount = quantity * parseFloat(updated[index].sale_rate || 0);
    setReturnItems(updated);
  };

  const handleSubmitReturn = async () => {
    try {
      const itemsToReturn = returnItems.filter(item => item.return_quantity > 0);
      
      if (itemsToReturn.length === 0) {
        setError('Select at least one item to return');
        return;
      }

      setLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/sale-returns`,
        {
          sale_id: selectedSale.id,
          return_date: returnDate,
          items: itemsToReturn.map(item => ({
            item_id: item.item_id,
            quantity: item.return_quantity,
            sale_rate: item.sale_rate,
            amount: item.return_amount
          })),
          refund_type: refundType,
          notes
        },
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      if (response.data.success) {
        setSuccess('Sale Return created successfully! Stock updated.');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create sale return');
    } finally {
      setLoading(false);
    }
  };

  const totalReturnAmount = returnItems.reduce((sum, item) => sum + (item.return_amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-linear-to-r from-orange-600 to-orange-700 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Sale Return</h2>
            <p className="text-orange-100 text-sm">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-orange-500 p-1 rounded">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
              {success}
            </div>
          )}

          {/* Step 1: Select Sale */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Select Sale to Return</h3>
              {availableSales.length === 0 ? (
                <p className="text-gray-600">No sales available for return</p>
              ) : (
                <div className="space-y-3">
                  {availableSales.map(sale => (
                    <div
                      key={sale.id}
                      onClick={() => handleSelectSale(sale)}
                      className="p-4 border border-gray-200 rounded cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold">{sale.invoice_no}</p>
                          <p className="text-sm text-gray-600">{sale.customer_name}</p>
                          <p className="text-xs text-gray-500 mt-1">{sale.item_summary}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">₹{parseFloat(sale.net_amount || 0).toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{sale.item_count} items</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Items to Return */}
          {step === 2 && selectedSale && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded">
                <p className="text-sm font-semibold text-blue-900">Invoice: {selectedSale.invoice_no}</p>
                <p className="text-sm text-blue-800">Customer: {selectedSale.customer_name}</p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Select items to return:</h3>
                {returnItems.map((item, index) => (
                  <div key={item.item_id} className="border border-gray-200 p-4 rounded">
                    <div className="flex justify-between mb-3">
                      <div>
                        <p className="font-semibold">{item.item_name}</p>
                        <p className="text-sm text-gray-600">Original: {item.quantity} × ₹{parseFloat(item.sale_rate || 0).toFixed(2)}</p>
                      </div>
                      <p className="font-semibold text-gray-700">₹{parseFloat(item.amount || 0).toFixed(2)}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-600">Return Qty:</label>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={item.return_quantity}
                        onChange={(e) => handleReturnQtyChange(index, parseInt(e.target.value) || 0)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                      />
                      <span className="text-sm text-gray-600">Return Amount: ₹{parseFloat(item.return_amount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Return Metadata */}
              <div className="space-y-3 border-t pt-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Return Date</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Refund Type</label>
                  <select
                    value={refundType}
                    onChange={(e) => setRefundType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                  >
                    <option value="cash">Cash Refund</option>
                    <option value="credit">Credit to Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reason for return..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Summary with GST */}
          <div className="border-t pt-4 mt-4 grid grid-cols-2 gap-4">
            <div className="flex justify-between font-semibold">
              <span>Total Return Amount:</span>
              <span className="text-lg text-green-600">₹{parseFloat(totalReturnAmount).toFixed(2)}</span>
            </div>
            
            {/* GST Calculator */}
            <GSTSelector
              amount={totalReturnAmount}
              isIntraState={true}
              showBreakdown={true}
              onGSTChange={(data) => setGstData(data)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex justify-between gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              Back
            </button>
          )}
          {step === 1 && (
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-100 ml-auto"
            >
              Cancel
            </button>
          )}
          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 ml-auto"
            >
              Review & Confirm
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleSubmitReturn}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 ml-auto"
            >
              {loading ? 'Processing...' : 'Confirm Return'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
