import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, Search } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import GSTSelector from './GSTSelector';

export default function PurchaseReturnForm({ company, onSubmit, onClose }) {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [formData, setFormData] = useState({
    purchase_id: '',
    return_date: new Date().toISOString().split('T')[0],
    items: [],
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchPurchase, setSearchPurchase] = useState('');
  const [showPurchaseSearch, setShowPurchaseSearch] = useState(false);
  const [gstData, setGstData] = useState(null);

  // Load purchases
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const startDate = new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];
        
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchases`, {
          params: { startDate, endDate },
          headers: { 'x-company-id': company.id }
        });
        setPurchases(res.data.success ? res.data.data : []);
      } catch (err) {
        console.error('Fetch purchases error:', err);
      }
    };
    fetchPurchases();
  }, [company]);

  const filteredPurchases = purchases.filter(p =>
    p.invoice_no.toLowerCase().includes(searchPurchase.toLowerCase()) ||
    p.supplier_name.toLowerCase().includes(searchPurchase.toLowerCase())
  );

  const handleSelectPurchase = async (purchase) => {
    try {
      // Fetch full purchase details with items
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchase-returns/purchase/${purchase.id}`, {
        headers: { 'x-company-id': company.id }
      });

      if (res.data.success) {
        const purchaseData = res.data.data;
        setSelectedPurchase(purchaseData);
        setFormData(prev => ({
          ...prev,
          purchase_id: purchase.id,
          items: purchaseData.items.map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            item_code: item.item_code,
            purchased_quantity: item.purchased_quantity,
            purchase_rate: item.purchase_rate,
            quantity: '',
            max_return_qty: item.purchased_quantity
          }))
        }));
        setShowPurchaseSearch(false);
        setSearchPurchase('');
      }
    } catch (err) {
      console.error('Fetch purchase details error:', err);
      setErrors({ submit: 'Failed to load purchase details' });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));

    // Clear item errors
    if (errors.items && errors.items[index]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        const itemErrors = [...(newErrors.items || [])];
        delete itemErrors[index];
        return { ...newErrors, items: itemErrors };
      });
    }
  };

  const calculateAmount = (index) => {
    const item = formData.items[index];
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.purchase_rate) || 0;
    return qty * rate;
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item, index) => {
      return sum + calculateAmount(index);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const returnData = {
        purchase_id: parseInt(formData.purchase_id),
        return_date: formData.return_date,
        items: formData.items
          .filter(item => item.quantity)
          .map(item => ({
            item_id: parseInt(item.item_id),
            quantity: parseFloat(item.quantity),
            purchase_rate: parseFloat(item.purchase_rate),
            max_return_qty: parseFloat(item.max_return_qty)
          })),
        notes: formData.notes
      };

      await onSubmit(returnData);
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ submit: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b">
        <h2 className="text-2xl font-bold text-slate-900">{t('purchaseReturn.createNewReturn')}</h2>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-700 text-2xl"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Errors */}
        {errors.submit && (
          <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span className="text-sm text-red-700">{errors.submit}</span>
          </div>
        )}

        {/* Purchase Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('purchaseReturn.selectPurchase')}
          </label>
          <div className="relative">
            {selectedPurchase ? (
              <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-900">{selectedPurchase.invoice_no}</p>
                  <p className="text-xs text-slate-600">{selectedPurchase.supplier_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPurchase(null);
                    setFormData(prev => ({
                      ...prev,
                      purchase_id: '',
                      items: []
                    }));
                  }}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowPurchaseSearch(!showPurchaseSearch)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-left text-slate-600 hover:bg-slate-50"
                >
                  {t('purchaseReturn.selectPurchase')}
                </button>

                {showPurchaseSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                    <div className="p-3 border-b sticky top-0 bg-white">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder={t('purchaseReturn.searchPurchase')}
                          value={searchPurchase}
                          onChange={(e) => setSearchPurchase(e.target.value)}
                          className="w-full pl-8 pr-3 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                        />
                      </div>
                    </div>
                    {filteredPurchases.length === 0 ? (
                      <div className="p-3 text-center text-sm text-slate-600">
                        {t('purchaseReturn.noPurchasesFound')}
                      </div>
                    ) : (
                      filteredPurchases.map(purchase => (
                        <button
                          key={purchase.id}
                          type="button"
                          onClick={() => handleSelectPurchase(purchase)}
                          className="w-full px-3 py-2 text-left hover:bg-slate-100 border-b text-sm"
                        >
                          <p className="font-medium text-slate-900">{purchase.invoice_no}</p>
                          <p className="text-xs text-slate-600">{purchase.supplier_name}</p>
                          <p className="text-xs text-slate-500">₹{parseFloat(purchase.total_amount).toFixed(2)}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          {errors.purchase_id && (
            <p className="text-xs text-red-600 mt-1">{errors.purchase_id}</p>
          )}
        </div>

        {selectedPurchase && (
          <>
            {/* Return Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('purchaseReturn.returnDateRequired')}
              </label>
              <input
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData(prev => ({ ...prev, return_date: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.return_date ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors.return_date && (
                <p className="text-xs text-red-600 mt-1">{errors.return_date}</p>
              )}
            </div>

            {/* Items Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('purchaseReturn.returnItems')}</h3>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {formData.items.map((item, index) => (
                  <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                    <div className="grid grid-cols-5 gap-3">
                      {/* Item Name (read-only) */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          {t('purchaseReturn.item')}
                        </label>
                        <div className="px-2 py-2 text-sm font-medium text-slate-900 bg-white rounded border border-slate-300">
                          {item.item_name}
                        </div>
                      </div>

                      {/* Purchased Quantity (read-only) */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          {t('purchaseReturn.purchasedQty')}
                        </label>
                        <div className="px-2 py-2 text-sm font-medium text-slate-900 bg-white rounded border border-slate-300">
                          {item.purchased_quantity}
                        </div>
                      </div>

                      {/* Return Quantity */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          {t('purchaseReturn.returnQtyRequired')}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          placeholder="0.00"
                          max={item.purchased_quantity}
                          className={`w-full px-2 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            errors.items?.[index]?.quantity ? 'border-red-500' : 'border-slate-300'
                          }`}
                        />
                        {errors.items?.[index]?.quantity && (
                          <p className="text-xs text-red-600 mt-1">{errors.items[index].quantity}</p>
                        )}
                      </div>

                      {/* Rate (read-only) */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          {t('purchaseReturn.rate')}
                        </label>
                        <div className="px-2 py-2 text-sm font-medium text-slate-900 bg-white rounded border border-slate-300">
                          ₹{parseFloat(item.purchase_rate).toFixed(2)}
                        </div>
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          {t('purchaseReturn.amount')}
                        </label>
                        <div className="px-2 py-2 text-sm font-bold text-indigo-600 bg-white rounded border border-slate-300">
                          ₹{calculateAmount(index).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('purchaseReturn.notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('purchaseReturn.optionalNotes')}
                rows="3"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Total Summary with GST */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">{t('purchaseReturn.itemsToReturn')}</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formData.items.filter(i => i.quantity).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">{t('purchaseReturn.totalQtyReturn')}</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formData.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">{t('purchaseReturn.totalReturnAmount')}</p>
                    <p className="text-lg font-bold text-green-600">₹{calculateTotal().toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* GST Calculator */}
              <GSTSelector
                amount={calculateTotal()}
                isIntraState={true}
                showBreakdown={true}
                onGSTChange={(data) => setGstData(data)}
              />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading || !selectedPurchase}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('purchaseReturn.saving') : t('purchaseReturn.createReturn')}
          </button>
        </div>
      </form>
    </div>
  );
}
