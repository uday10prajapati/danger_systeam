import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import GSTSelector from './GSTSelector';

export default function PurchaseForm({ company, onSubmit, onClose }) {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [itemRates, setItemRates] = useState({});
  const [formData, setFormData] = useState({
    supplier_account_id: '',
    invoice_no: '',
    invoice_date: new Date().toISOString().split('T')[0],
    items: [{ item_id: '', quantity: '', purchase_rate: '' }],
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [itemLoading, setItemLoading] = useState({});
  const [gstData, setGstData] = useState(null);

  // Load suppliers (account_type = supplier)
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/accounts/company/${company.id}`, {
          headers: { 'x-company-id': company.id }
        });
        const supplierList = (res.data.data || res.data).filter(acc => acc.account_type === 'supplier');
        setSuppliers(supplierList);
      } catch (err) {
        console.error('Fetch suppliers error:', err);
      }
    };
    fetchSuppliers();
  }, [company]);

  // Load items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/items/company/${company.id}`, {
          headers: { 'x-company-id': company.id }
        });
        setItems(res.data.success ? res.data.data : []);
      } catch (err) {
        console.error('Fetch items error:', err);
      }
    };
    fetchItems();
  }, [company]);

  // Determines which units allow decimal quantities
  const allowsDecimal = (unit) => {
    const decimalUnits = ['kg', 'gm', 'liter', 'ml'];
    return decimalUnits.includes(unit);
  };

  // Fetch item rate when item is selected
  const fetchItemRate = async (itemId, index) => {
    try {
      setItemLoading(prev => ({ ...prev, [index]: true }));
      const res = await axios.get(`http://localhost:5000/api/item-rates/item/${itemId}`, {
        headers: { 'x-company-id': company.id }
      });
      
      // Handle response - could be single object { success, data: {...} } or array
      let activeRate = null;
      
      if (res.data.success && res.data.data) {
        // Single rate object
        activeRate = res.data.data;
      } else if (Array.isArray(res.data)) {
        // Array of rates
        activeRate = res.data[0];
      }
      
      if (activeRate && activeRate.purchase_rate) {
        setItemRates(prev => ({
          ...prev,
          [itemId]: activeRate.purchase_rate
        }));

        // Auto-fill purchase rate if not already set
        setFormData(prev => {
          const newItems = [...prev.items];
          if (!newItems[index].purchase_rate) {
            newItems[index].purchase_rate = activeRate.purchase_rate;
          }
          return { ...prev, items: newItems };
        });
      }
    } catch (err) {
      console.error('Fetch item rate error:', err);
    } finally {
      setItemLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));

    // Fetch rate when item is selected
    if (field === 'item_id' && value) {
      fetchItemRate(value, index);
    }

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

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { item_id: '', quantity: '', purchase_rate: '' }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.purchase_rate) || 0;
      return sum + (qty * rate);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Convert form data to proper types for backend
      const purchaseData = {
        supplier_account_id: parseInt(formData.supplier_account_id),
        invoice_no: formData.invoice_no.trim(),
        invoice_date: formData.invoice_date,
        items: formData.items.map(item => ({
          item_id: parseInt(item.item_id),
          quantity: parseFloat(item.quantity),
          purchase_rate: parseFloat(item.purchase_rate)
        })),
        notes: formData.notes
      };
      await onSubmit(purchaseData);
      // Form will be reset by parent component
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
        <h2 className="text-2xl font-bold text-slate-900">{t('purchase.createNewPurchase')}</h2>
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

        {/* Row 1: Supplier & Invoice No */}
        <div className="grid grid-cols-2 gap-4">
          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('purchase.supplierRequired')}
            </label>
            <select
              name="supplier_account_id"
              value={formData.supplier_account_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.supplier_account_id ? 'border-red-500' : 'border-slate-300'
              }`}
            >
              <option value="">{t('purchase.selectSupplier')}</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.account_name}
                  {supplier.account_code ? ` (${supplier.account_code})` : ''}
                </option>
              ))}
            </select>
            {errors.supplier_account_id && (
              <p className="text-xs text-red-600 mt-1">{errors.supplier_account_id}</p>
            )}
          </div>

          {/* Invoice No */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('purchase.invoiceNoRequired')}
            </label>
            <input
              type="text"
              name="invoice_no"
              value={formData.invoice_no}
              onChange={handleInputChange}
              placeholder={t('purchase.egINV')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.invoice_no ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.invoice_no && (
              <p className="text-xs text-red-600 mt-1">{errors.invoice_no}</p>
            )}
          </div>
        </div>

        {/* Row 2: Invoice Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('purchase.invoiceDateRequired')}
            </label>
            <input
              type="date"
              name="invoice_date"
              value={formData.invoice_date}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.invoice_date ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.invoice_date && (
              <p className="text-xs text-red-600 mt-1">{errors.invoice_date}</p>
            )}
          </div>
        </div>

        {/* Items Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-900">{t('purchase.purchaseItems')}</h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              {t('purchase.addItem')}
            </button>
          </div>

          {errors.items && typeof errors.items === 'string' && (
            <div className="flex gap-3 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{errors.items}</span>
            </div>
          )}

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {formData.items.map((item, index) => {
              const selectedItem = items.find(i => i.id === parseInt(item.item_id));
              const itemUnit = selectedItem?.unit || 'unit';
              
              return (
              <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="grid grid-cols-5 gap-3 mb-3">
                  {/* Item Select */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('purchase.itemRequired')}
                    </label>
                    <select
                      value={item.item_id}
                      onChange={(e) => handleItemChange(index, 'item_id', e.target.value)}
                      className={`w-full px-2 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.items?.[index]?.item_id ? 'border-red-500' : 'border-slate-300'
                      }`}
                      disabled={itemLoading[index]}
                    >
                      <option value="">{t('purchase.selectItem')}</option>
                      {items.map(itm => (
                        <option key={itm.id} value={itm.id}>
                          {itm.item_name} ({itm.item_code})
                        </option>
                      ))}
                    </select>
                    {errors.items?.[index]?.item_id && (
                      <p className="text-xs text-red-600 mt-1">{errors.items[index].item_id}</p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('purchase.quantityRequired')}
                    </label>
                    <input
                      type="number"
                      step={allowsDecimal(itemUnit) ? "0.01" : "1"}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      placeholder={allowsDecimal(itemUnit) ? "0.00" : "0"}
                      className={`w-full px-2 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.items?.[index]?.quantity ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="text-xs text-red-600 mt-1">{errors.items[index].quantity}</p>
                    )}
                  </div>

                  {/* Unit (Read-only, derived from Item Master) */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Unit
                    </label>
                    <div className="px-2 py-2 text-sm border border-slate-300 rounded bg-white text-slate-700 font-semibold">
                      {itemUnit}
                    </div>
                  </div>

                  {/* Purchase Rate */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('purchase.rateRequired')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.purchase_rate}
                      onChange={(e) => handleItemChange(index, 'purchase_rate', e.target.value)}
                      placeholder="0.00"
                      className={`w-full px-2 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.items?.[index]?.purchase_rate ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {errors.items?.[index]?.purchase_rate && (
                      <p className="text-xs text-red-600 mt-1">{errors.items[index].purchase_rate}</p>
                    )}
                  </div>

                  {/* Amount & Delete */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('purchase.amount')}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 px-2 py-2 text-sm font-semibold text-slate-900">
                        ₹{(parseFloat(item.quantity || 0) * parseFloat(item.purchase_rate || 0)).toFixed(2)}
                      </span>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('purchase.notes')}
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder={t('purchase.optionalNotes')}
            rows="3"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.notes ? 'border-red-500' : 'border-slate-300'
            }`}
          />
          {errors.notes && (
            <p className="text-xs text-red-600 mt-1">{errors.notes}</p>
          )}
        </div>
        {/* Total & Summary with GST */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-600 mb-1">{t('purchase.totalItems')}</p>
                <p className="text-lg font-bold text-slate-900">{formData.items.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">{t('purchase.totalQuantity')}</p>
                <p className="text-lg font-bold text-slate-900">
                  {formData.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">{t('purchase.grandTotal')}</p>
                <p className="text-lg font-bold text-indigo-600">₹{calculateTotal().toFixed(2)}</p>
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
            disabled={loading}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('purchase.saving') : t('purchase.createPurchase')}
          </button>
        </div>
      </form>
    </div>
  );
}
