import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Minus, Trash2, Search, ShoppingCart, ChevronDown, Printer, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import GSTSelector from './GSTSelector';

export default function SaleForm({ onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [saleItems, setSaleItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customerAccountId, setCustomerAccountId] = useState(null);
  const [memberId, setMemberId] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentType, setPaymentType] = useState('cash');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMemberName, setSelectedMemberName] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [gstData, setGstData] = useState(null);
  const [customerState, setCustomerState] = useState('Gujarat');
  const [customerInfo, setCustomerInfo] = useState(null); // Store customer GST/TIN info
  const [company, setCompany] = useState(null);
  const [successSale, setSuccessSale] = useState(null); // Store created sale for print option
  const barcodeRef = useRef(null);

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (company?.id) {
      barcodeRef.current?.focus();
      fetchAllItems();
      fetchAllMembers();
    }
  }, [company]);

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

  const fetchAllItems = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/items/company/${company.id}?active=true`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setAvailableItems(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch items error:', error);
    }
  };

  const fetchAllMembers = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/members/company/${company.id}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setAvailableMembers(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch members error:', error);
    }
  };

  // Fetch customer account details (GST, TIN)
  const fetchCustomerAccountInfo = async (accountId) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/accounts/${accountId}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setCustomerInfo(response.data.data);
      }
    } catch (error) {
      console.error('Fetch customer account info error:', error);
      setCustomerInfo(null);
    }
  };

  // Determines which units allow decimal quantities
  const allowsDecimal = (unit) => {
    const decimalUnits = ['kg', 'gm', 'liter', 'ml'];
    return decimalUnits.includes(unit);
  };

  // Validates quantity based on unit
  const validateQuantity = (quantity, unit) => {
    if (quantity <= 0) return false;
    if (!allowsDecimal(unit)) {
      return Number.isInteger(quantity);
    }
    return true;
  };

  const handleItemSelect = async (item) => {
    setSelectedItemId(item.id);
    setBarcodeInput(item.barcode);
    setShowItemDropdown(false);
    setErrors({});
    // Auto-add item to cart
    if (item.barcode) {
      await addItemByBarcode(item.barcode);
    }
    
    // Keep item visible for 1 second before clearing
    setTimeout(() => {
      setBarcodeInput('');
      setSelectedItemId('');
      setItemSearch('');
    }, 1000);
  };

  const handleBarcodeInput = async (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      await addItemByBarcode(barcodeInput);
      setBarcodeInput('');
    }
  };

  const addItemByBarcode = async (code) => {
    if (!code || !code.trim()) {
      setErrors({ barcode: 'Please enter a barcode' });
      return;
    }

    if (!company?.id) {
      setErrors({ barcode: 'Company ID not loaded. Please refresh the page.' });
      return;
    }

    try {
      setErrors({});
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/items/barcode/${encodeURIComponent(code.trim())}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      if (response.data.success) {
        const item = response.data.data;
        
        // Validate stock before adding
        if (item.current_stock <= 0) {
          setErrors({ barcode: `${item.item_name} is out of stock` });
          return;
        }

        // Validate rate exists
        if (!item.sale_rate || item.sale_rate <= 0) {
          setErrors({ barcode: `${item.item_name} has no active rate configured` });
          return;
        }

        addItemToCart(item);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Item not found';
      console.error('Barcode lookup error:', error.response?.data || error);
      setErrors({ barcode: errorMsg });
    }
  };

  const addItemToCart = (item) => {
    // Ensure numeric values are converted to numbers
    const saleRate = parseFloat(item.sale_rate) || 0;
    const currentStock = parseFloat(item.current_stock) || 0;
    
    // Validate stock
    if (currentStock <= 0) {
      setErrors({ barcode: `${item.item_name} is out of stock` });
      return;
    }

    // Validate rate
    if (saleRate <= 0) {
      setErrors({ barcode: `${item.item_name} has no valid sale rate` });
      return;
    }
    
    const existingItem = saleItems.find(si => si.item_id === item.id);
    
    if (existingItem) {
      // Check if adding more would exceed stock
      const newQty = existingItem.quantity + 1;
      if (newQty > currentStock) {
        setErrors({ barcode: `Cannot add more of ${item.item_name}. Available: ${currentStock}` });
        return;
      }

      // Increase quantity
      setSaleItems(
        saleItems.map(si =>
          si.item_id === item.id
            ? { ...si, quantity: newQty, amount: newQty * si.sale_rate }
            : si
        )
      );
      setSuccess(`✓ ${item.item_name} quantity increased to ${newQty}`);
    } else {
      // Add new item
      setSaleItems([
        ...saleItems,
        {
          item_id: item.id,
          item_code: item.item_code,
          item_name: item.item_name,
          unit: item.unit || 'unit',
          quantity: 1,
          sale_rate: saleRate,
          amount: saleRate,
          current_stock: currentStock
        }
      ]);
      setSuccess(`✓ ${item.item_name} added to cart`);
    }
    setErrors({});
    
    // Clear success message after 2 seconds
    setTimeout(() => setSuccess(''), 2000);
  };

  const updateQuantity = (index, newQty) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }

    const item = saleItems[index];
    const isDecimalAllowed = allowsDecimal(item.unit);

    // Validate quantity based on unit
    if (!isDecimalAllowed && !Number.isInteger(newQty)) {
      setErrors({ quantity: `${item.unit} requires integer quantity only` });
      setTimeout(() => setErrors({}), 2000);
      return;
    }

    setSaleItems(
      saleItems.map((item, i) =>
        i === index
          ? { ...item, quantity: newQty, amount: newQty * item.sale_rate }
          : item
      )
    );
  };

  const updateRate = (index, newRate) => {
    const numRate = parseFloat(newRate) || 0;
    setSaleItems(
      saleItems.map((item, i) =>
        i === index
          ? { ...item, sale_rate: numRate, amount: item.quantity * numRate }
          : item
      )
    );
  };

  const removeItem = (index) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const total = saleItems.reduce((sum, item) => sum + item.amount, 0);
    const net = total - discountAmount;
    return { total, net };
  };

  const { total, net } = calculateTotals();

  const handleSubmit = async () => {
    if (saleItems.length === 0) {
      setErrors({ items: 'Add at least one item' });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/sales`,
        {
          invoice_date: new Date().toISOString().split('T')[0],
          customer_account_id: customerAccountId || null,
          member_id: memberId || null,
          items: saleItems.map(item => ({
            item_id: parseInt(item.item_id),
            quantity: parseFloat(item.quantity),
            sale_rate: parseFloat(item.sale_rate)
          })),
          discount_amount: parseFloat(discountAmount) || 0,
          payment_type: paymentType || 'cash',
          notes: notes || ''
        },
        {
          headers: {
            'x-company-id': company.id,
            'x-user-id': 1
          }
        }
      );

      if (response.data.success) {
        // Store the created sale for print option
        setSuccessSale(response.data.data);
      }
    } catch (error) {
      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        setErrors({ submit: JSON.stringify(error.response.data.errors) });
      } else {
        setErrors({ submit: error.response?.data?.error || 'Failed to create sale' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrintBill = () => {
    if (!successSale || !company) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    const invoiceDate = new Date(successSale.invoice_date).toLocaleDateString('en-IN');
    const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            padding: 20px;
          }
          .invoice { 
            background: white;
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 20px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
          }
          .company-info {
            font-size: 12px;
            color: #666;
            margin-top: 10px;
          }
          .invoice-title {
            font-size: 18px;
            font-weight: bold;
            margin-top: 15px;
            color: #333;
          }
          .invoice-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
            font-size: 13px;
          }
          .meta-item {
            display: flex;
            justify-content: space-between;
          }
          .meta-label {
            font-weight: bold;
            color: #666;
          }
          .meta-value {
            color: #333;
          }
          .items-table {
            width: 100%;
            margin: 20px 0;
            border-collapse: collapse;
          }
          .items-table thead {
            background: #f0f0f0;
            border-top: 2px solid #ddd;
            border-bottom: 2px solid #ddd;
          }
          .items-table th {
            padding: 12px;
            text-align: left;
            font-weight: bold;
            color: #333;
            font-size: 13px;
          }
          .items-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #eee;
            font-size: 13px;
          }
          .items-table tr:last-child td {
            border-bottom: 2px solid #ddd;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .totals {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
          }
          .totals-box {
            width: 300px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 13px;
            border-bottom: 1px solid #ddd;
          }
          .total-row.subtotal {
            color: #666;
          }
          .total-row.discount {
            color: #ff6b35;
          }
          .total-row.net-amount {
            border-top: 2px solid #333;
            border-bottom: 2px solid #333;
            font-weight: bold;
            font-size: 16px;
            color: #1e40af;
            padding: 12px 0;
            margin: 10px 0;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            border-top: 1px solid #ddd;
            padding-top: 20px;
            font-size: 12px;
            color: #666;
          }
          .notes {
            margin-top: 20px;
            padding: 15px;
            background: #f9f9f9;
            border-left: 3px solid #ff9800;
            font-size: 12px;
          }
          .notes-label {
            font-weight: bold;
            color: #666;
            margin-bottom: 5px;
          }
          @media print {
            body { padding: 0; background: white; }
            .invoice { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice">
          <!-- Header -->
          <div class="header">
            <div class="company-name">${company.company_name}</div>
            <div class="company-info">
              Professional Sales Invoice
            </div>
            <div class="invoice-title">SALE BILL</div>
          </div>

          <!-- Invoice Meta -->
          <div class="invoice-meta">
            <div>
              <div class="meta-item">
                <span class="meta-label">Invoice #:</span>
                <span class="meta-value">${successSale.invoice_no}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Invoice Date:</span>
                <span class="meta-value">${invoiceDate}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Customer:</span>
                <span class="meta-value">${successSale.customer_name || 'Walk-in Customer'}</span>
              </div>
            </div>
            <div>
              <div class="meta-item">
                <span class="meta-label">Payment Type:</span>
                <span class="meta-value">${successSale.payment_type.charAt(0).toUpperCase() + successSale.payment_type.slice(1)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Print Date:</span>
                <span class="meta-value">${currentDate}</span>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40%;">Item</th>
                <th class="text-center" style="width: 15%;">Quantity</th>
                <th class="text-right" style="width: 15%;">Rate</th>
                <th class="text-right" style="width: 30%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${successSale.items.map(item => `
                <tr>
                  <td>${item.item_name}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">₹${parseFloat(item.sale_rate || 0).toFixed(2)}</td>
                  <td class="text-right">₹${parseFloat(item.amount || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="totals">
            <div class="totals-box">
              <div class="total-row subtotal">
                <span>Subtotal:</span>
                <span>₹${parseFloat(successSale.total_amount || 0).toFixed(2)}</span>
              </div>
              ${parseFloat(successSale.discount_amount || 0) > 0 ? `
                <div class="total-row discount">
                  <span>Discount:</span>
                  <span>-₹${parseFloat(successSale.discount_amount || 0).toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="total-row net-amount">
                <span>Net Amount:</span>
                <span>₹${parseFloat(successSale.net_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          ${successSale.notes ? `
            <div class="notes">
              <div class="notes-label">Notes:</div>
              <div>${successSale.notes}</div>
            </div>
          ` : ''}

          <!-- Footer -->
          <div class="footer">
            <p>Thank you for your business!</p>
            <p style="margin-top: 10px; font-size: 11px;">This is a computer-generated receipt. No signature required.</p>
          </div>
        </div>

        <script>
          window.addEventListener('load', function() {
            window.print();
            setTimeout(function() { window.close(); }, 1000);
          });
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleNewSale = () => {
    setSuccessSale(null);
    setSaleItems([]);
    setMemberId(null);
    setCustomerAccountId(null);
    setDiscountAmount(0);
    setPaymentType('cash');
    setNotes('');
    setErrors({});
    setBarcodeInput('');
    barcodeRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* Success Modal */}
      {successSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-green-600" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Sale Created Successfully!</h3>
            <p className="text-gray-600 mb-4">Invoice #{successSale.invoice_no}</p>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-lg font-bold text-blue-600">₹{parseFloat(successSale.net_amount || 0).toFixed(2)}</p>
              <p className="text-sm text-gray-600">{successSale.items.length} items</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  handlePrintBill();
                  handleNewSale();
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
              >
                <Printer size={20} />
                Print Bill & New Sale
              </button>
              
              <button
                onClick={handleNewSale}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
              >
                New Sale Only
              </button>
              
              <button
                onClick={() => {
                  onSubmit?.(successSale);
                  setSuccessSale(null);
                }}
                className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {!successSale && (
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-linear-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-2">
            <ShoppingCart size={24} />
            <h2 className="text-2xl font-bold">{t('sale.createSale', 'Create Sale')}</h2>
          </div>
          <button onClick={onCancel} className="hover:bg-blue-800 p-2 rounded">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Error Banner */}
            {(errors.barcode || errors.items || errors.submit) && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  {errors.barcode && <p>{errors.barcode}</p>}
                  {errors.items && <p>{errors.items}</p>}
                  {errors.submit && <p>{errors.submit}</p>}
                </div>
              </div>
            )}

            {/* Success Banner */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-2 animate-pulse">
                <span className="text-xl">✓</span>
                <p>{success}</p>
              </div>
            )}

            {/* Item Selection and Barcode Input - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Item Selection Dropdown */}
              <div className="bg-linear-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-300">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Item
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowItemDropdown(!showItemDropdown)}
                    className="w-full px-4 py-2 border-2 border-purple-400 rounded-lg bg-white flex justify-between items-center hover:bg-purple-50 focus:outline-none"
                  >
                    <span className="text-gray-700">
                      {selectedItemId && availableItems.find(i => i.id === selectedItemId)?.item_name || 'Choose an item...'}
                    </span>
                    <ChevronDown size={20} className={`transition-transform ${showItemDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showItemDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-purple-400 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      <input
                        type="text"
                        placeholder="Search items..."
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-full px-4 py-2 border-b border-purple-200 focus:outline-none"
                        autoFocus
                      />
                      {availableItems
                        .filter(item =>
                          item.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                          item.item_code.toLowerCase().includes(itemSearch.toLowerCase()) ||
                          item.barcode.includes(itemSearch)
                        )
                        .map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleItemSelect(item)}
                            className="w-full text-left px-4 py-2 hover:bg-purple-100 border-b border-purple-100 last:border-b-0"
                          >
                            <div className="font-semibold text-gray-800">{item.item_name}</div>
                            <div className="text-xs text-gray-500">
                              Code: {item.item_code} | Barcode: {item.barcode}
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Barcode Input Section */}
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-blue-300">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('sale.scanBarcode', 'Scan Barcode')}
                </label>
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={handleBarcodeInput}
                  placeholder="Scan item barcode or type code..."
                  className="w-full px-4 py-2 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600"
                  autoFocus
                />
              </div>
            </div>

            {/* Sale Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Item</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('sale.stock', 'Stock')}</th>
                    <th className="px-4 py-3 text-center font-semibold">{t('sale.qty', 'Quantity & Unit')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('sale.rate', 'Rate')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('sale.amount', 'Amount')}</th>
                    <th className="px-4 py-3 text-center font-semibold">{t('sale.action', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        {t('sale.noItems', 'No items added. Scan barcode to add items.')}
                      </td>
                    </tr>
                  ) : (
                    saleItems.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-blue-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-semibold">{item.item_name}</div>
                            <div className="text-xs text-gray-500">{item.item_code}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{item.current_stock}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => updateQuantity(index, item.quantity - (allowsDecimal(item.unit) ? 0.5 : 1))}
                              className="p-1 hover:bg-red-100 rounded"
                            >
                              <Minus size={16} />
                            </button>
                            <input
                              type={allowsDecimal(item.unit) ? "number" : "number"}
                              value={item.quantity}
                              onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                              className="w-12 text-center border rounded px-2 py-1"
                              min="0.1"
                              step={allowsDecimal(item.unit) ? "0.1" : "1"}
                            />
                            <span className="font-semibold text-indigo-600 min-w-fit">
                              {item.unit}
                            </span>
                            <button
                              onClick={() => updateQuantity(index, item.quantity + (allowsDecimal(item.unit) ? 0.5 : 1))}
                              className="p-1 hover:bg-green-100 rounded"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.sale_rate}
                            onChange={(e) => updateRate(index, parseFloat(e.target.value) || 0)}
                            className="w-20 border rounded px-2 py-1 text-right"
                            step="0.01"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">₹{item.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeItem(index)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* GST Calculator & Totals Section */}
            {saleItems.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {/* Left: Summary */}
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <div className="text-right mb-4">
                    <p className="text-gray-600 text-sm">{t('sale.subtotal', 'Subtotal')}</p>
                    <p className="text-2xl font-bold text-blue-600">₹{total.toFixed(2)}</p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('sale.discount', 'Discount')}
                    </label>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1"
                      step="0.01"
                    />
                  </div>
                  <div className="border-t-2 border-blue-300 pt-2">
                    <p className="text-gray-600 text-sm">{t('sale.netAmount', 'Net Amount')}</p>
                    <p className="text-3xl font-bold text-green-600">₹{(net).toFixed(2)}</p>
                  </div>
                </div>

                {/* Right: GST Calculator */}
                <GSTSelector
                  amount={net}
                  isIntraState={true}
                  showBreakdown={true}
                  onGSTChange={(data) => setGstData(data)}
                />
              </div>
            )}

            {/* Customer & Payment Section */}
            <div className="clear-both grid grid-cols-3 gap-4 mt-8">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('sale.customer', 'Customer')}
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                    className="w-full px-4 py-2 border-2 border-green-400 rounded-lg bg-white flex justify-between items-center hover:bg-green-50 focus:outline-none text-left"
                  >
                    <span className="text-gray-700">
                      {selectedMemberName || 'Select customer...'}
                    </span>
                    <ChevronDown size={20} className={`transition-transform flex-shrink-0 ${showMemberDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showMemberDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-green-400 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      <input
                        type="text"
                        placeholder="Search customers..."
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-full px-4 py-2 border-b border-green-200 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setMemberId(null);
                          setSelectedMemberName('');
                          setCustomerInfo(null); // Clear customer info
                          setShowMemberDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-green-100 border-b border-green-100 text-gray-600 italic"
                      >
                        No Customer (Walk-in Customer)
                      </button>
                      {availableMembers
                        .filter(member =>
                          member.member_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                          (member.phone && member.phone.includes(itemSearch))
                        )
                        .map((member) => (
                          <button
                            key={member.id}
                            onClick={() => {
                              setMemberId(member.id);
                              setSelectedMemberName(member.member_name);
                              if (member.account_id) {
                                fetchCustomerAccountInfo(member.account_id);
                              } else {
                                setCustomerInfo(null);
                              }
                              setShowMemberDropdown(false);
                              setItemSearch('');
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-green-100 border-b border-green-100 last:border-b-0"
                          >
                            <div className="font-semibold text-gray-800">{member.member_name}</div>
                            <div className="text-xs text-gray-500">
                              {member.phone && `Phone: ${member.phone}`}
                              {member.discount_percentage && ` | Discount: ${member.discount_percentage}%`}
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('sale.paymentType', 'Payment Type')}
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="cash">{t('sale.cash', 'Cash')}</option>
                  <option value="card">{t('sale.card', 'Card')}</option>
                  <option value="upi">{t('sale.upi', 'UPI')}</option>
                  <option value="credit">{t('sale.credit', 'Credit')}</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('sale.notes', 'Notes')}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            {/* Customer GST/TIN Info Display */}
            {customerInfo && (customerInfo.gst_no || customerInfo.tin_no) && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-gray-800 mb-2">Customer Tax Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {customerInfo.gst_no && (
                    <div>
                      <label className="text-gray-600">GSTIN:</label>
                      <p className="font-mono font-bold text-gray-900">{customerInfo.gst_no}</p>
                    </div>
                  )}
                  {customerInfo.tin_no && (
                    <div>
                      <label className="text-gray-600">TIN (Legacy):</label>
                      <p className="font-mono font-bold text-gray-900">{customerInfo.tin_no}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="border-t bg-gray-50 p-4 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2 border rounded-lg hover:bg-gray-100 font-semibold"
          >
            {t('sale.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || saleItems.length === 0}
            className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
          >
            {loading ? 'Processing...' : t('sale.completeSale', 'Complete Sale')}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
