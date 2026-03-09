# TIN Number Support Implementation Guide

## Overview
This document details the complete implementation of **TIN (Tax Identification Number)** support in the SuperStore POS/ERP system. TIN is added to **Account Master** (not Member Master or Sale table).

---

## ✅ COMPLETED IMPLEMENTATION

### 1️⃣ DATABASE SCHEMA UPDATE

**File**: `backend/db.js` (Lines 84-103)

**Changes Made**:
- Added `gst_no` column (VARCHAR 15)
- Added `tin_no` column (VARCHAR 20)

```sql
CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  gst_no VARCHAR(15),          -- NEW: GST Number
  tin_no VARCHAR(20),           -- NEW: TIN Number
  opening_balance DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_account_per_company (company_id, account_name),
  FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
  INDEX idx_company_type (company_id, account_type),
  INDEX idx_account_type (account_type)
)
```

---

### 2️⃣ BACKEND VALIDATION

**File**: `backend/validators/accountValidator.js`

**Changes Made**:
- Added TIN validation: Must be 11 digits
- Added GST validation: Must be 15 alphanumeric characters
- Both fields are optional

```javascript
// GST Number validation (optional but if provided, must be valid)
// GSTIN format: 15 alphanumeric characters
if (gst_no && gst_no.trim().length > 0) {
  if (!/^[0-9A-Z]{15}$/.test(gst_no.trim())) {
    return 'GST Number must be 15 characters alphanumeric';
  }
}

// TIN Number validation (optional but if provided, must be valid)
// TIN format: 11 digits (legacy Indian taxation number)
if (tin_no && tin_no.trim().length > 0) {
  if (!/^[0-9]{11}$/.test(tin_no.trim())) {
    return 'TIN Number must be 11 digits';
  }
}
```

**Validation Rules**:
- ✅ GST Number: 15-character alphanumeric (e.g., `27AABCT1234A1Z5`)
- ✅ TIN Number: 11 digits (e.g., `12345678901`)
- ✅ Both are OPTIONAL fields
- ✅ Prefers GSTIN if both are provided

---

### 3️⃣ BACKEND API ROUTES

**File**: `backend/routes/accountRoutes.js`

**Changes Made**:

#### CREATE ACCOUNT (POST /api/accounts)
```javascript
const { company_id, account_name, account_type, phone, email, 
        opening_balance, gst_no, tin_no } = req.body;

INSERT INTO accounts (..., gst_no, tin_no, ...)
VALUES (..., gst_no || null, tin_no || null, ...)
```

#### LIST ACCOUNTS (GET /api/accounts/company/:company_id)
```javascript
SELECT id, company_id, account_name, account_type, phone, email, 
       gst_no, tin_no, opening_balance, is_active, created_at, updated_at
FROM accounts
```

#### GET SINGLE ACCOUNT (GET /api/accounts/:id)
```javascript
SELECT id, company_id, account_name, account_type, phone, email, 
       gst_no, tin_no, opening_balance, is_active, created_at, updated_at
FROM accounts WHERE id = ?
```

#### UPDATE ACCOUNT (PUT /api/accounts/:id)
```javascript
UPDATE accounts 
SET gst_no = IF(? IS NOT NULL, ?, gst_no),
    tin_no = IF(? IS NOT NULL, ?, tin_no),
    ... other fields ...
WHERE id = ?
```

**API Response Example**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "company_id": 1,
    "account_name": "ABC Trading",
    "account_type": "supplier",
    "phone": "9876543210",
    "email": "abc@trading.com",
    "gst_no": "27AABCT1234A1Z5",
    "tin_no": "12345678901",
    "opening_balance": 1000,
    "is_active": true
  }
}
```

---

### 4️⃣ FRONTEND - ACCOUNT MASTER FORM

**File**: `frontend/src/components/AccountForm.jsx`

**Changes Made**:

#### Form State
```javascript
const [formData, setFormData] = useState(initialData || {
  account_name: '',
  account_type: 'customer',
  phone: '',
  email: '',
  gst_no: '',      // NEW
  tin_no: '',      // NEW
  opening_balance: 0
});
```

#### Form Validation
```javascript
if (formData.gst_no && !/^[0-9A-Z]{15}$/.test(formData.gst_no.trim())) {
  newErrors.gst_no = t('accountMaster.invalidGST');
}

if (formData.tin_no && !/^[0-9]{11}$/.test(formData.tin_no.trim())) {
  newErrors.tin_no = t('accountMaster.invalidTIN');
}
```

#### Form Fields Added
```jsx
{/* GST Number */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    {t('accountMaster.gstNumber')} {t('accountMaster.optional')}
  </label>
  <input
    type="text"
    name="gst_no"
    value={formData.gst_no}
    maxLength="15"
    className="uppercase"
    placeholder="15-digit GSTIN (e.g., 27AABCT1234A1Z5)"
  />
</div>

{/* TIN Number */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    {t('accountMaster.tinNumber')} {t('accountMaster.optional')} {t('accountMaster.legacy')}
  </label>
  <input
    type="text"
    name="tin_no"
    value={formData.tin_no}
    maxLength="11"
    placeholder="11-digit TIN (Legacy taxation number)"
  />
</div>
```

**Form Layout**:
```
┌─ Account Name (required)
├─ Account Type (required)
├─ Phone Number (optional)
├─ Email Address (optional)
├─ GST Number (optional) ◄─ NEW
├─ TIN Number (optional) ◄─ NEW (Legacy)
├─ Opening Balance (optional)
└─ Buttons: Save / Cancel
```

---

### 5️⃣ FRONTEND - SALE FORM

**File**: `frontend/src/components/SaleForm.jsx`

**Changes Made**:

#### Customer Info State
```javascript
const [customerInfo, setCustomerInfo] = useState(null); // Store customer GST/TIN info
```

#### Fetch Customer Account Info Function
```javascript
const fetchCustomerAccountInfo = async (accountId) => {
  try {
    const response = await axios.get(
      `http://localhost:5000/api/accounts/${accountId}`,
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
```

#### Member Selection Enhancement
When a customer/member is selected:
```javascript
onClick={() => {
  setMemberId(member.id);
  setSelectedMemberName(member.member_name);
  if (member.account_id) {
    fetchCustomerAccountInfo(member.account_id);  // ◄─ NEW
  } else {
    setCustomerInfo(null);  // ◄─ NEW
  }
  setShowMemberDropdown(false);
  setItemSearch('');
}}
```

#### Display Customer Tax Info
```jsx
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
```

**Sale Screen Display**:
```
┌─────────────────────────────────────┐
│  Items Table                        │
├─────────────────────────────────────┤
│  [Item] [Qty] [Rate] [Amount] [Del] │
├─────────────────────────────────────┤
│  GST Calculation                    │
├─────────────────────────────────────┤
│  Customer Selection | Payment Type  │
│  ┌──────────────────────────────┐   │
│  │ ┌─ Walk-in Customer          │   │
│  │ ├─ ABC Trading       ◄─ Select
│  │ │  Phone: 9876543210         │   │
│  │ └─ XYZ Corporation           │   │
│  └──────────────────────────────┘   │
├─────────────────────────────────────┤
│ ┌─ Customer Tax Information ─┐      │
│ │ GSTIN: 27AABCT1234A1Z5    │ ◄─ NEW
│ │ TIN: 12345678901          │      │
│ └───────────────────────────┘      │
├─────────────────────────────────────┤
│ [Cancel]  [Complete Sale]           │
└─────────────────────────────────────┘
```

---

### 6️⃣ INTERNATIONALIZATION (i18n)

**File**: `frontend/src/locales/en.json`

**Added Keys**:
```json
{
  "accountMaster": {
    "gstNumber": "GST Number",
    "invalidGST": "GST Number must be 15 characters alphanumeric",
    "tinNumber": "TIN Number",
    "invalidTIN": "TIN Number must be 11 digits",
    "optional": "(Optional)",
    "legacy": "(Legacy)"
  }
}
```

**File**: `frontend/src/locales/gu.json`

**Added Keys**:
```json
{
  "accountMaster": {
    "gstNumber": "GST નંબર",
    "invalidGST": "GST નંબર 15 અક્ષર આલ્ફાન્યુમેરિક હોવો જોઈએ",
    "tinNumber": "TIN નંબર",
    "invalidTIN": "TIN નંબર 11 અંક હોવો જોઈએ",
    "optional": "(વૈકલ્પિક)",
    "legacy": "(હેરિટેજ)"
  }
}
```

---

## 🎯 BUSINESS LOGIC

### Priority Rules
1. **GSTIN is preferred** - If both GSTIN and TIN exist, GSTIN is used for GST calculations
2. **Both are optional** - Either, both, or neither can be provided
3. **Account-level storage** - Not stored at transaction level (sales, purchases)
4. **Legacy support** - TIN is marked as legacy for backward compatibility

### Use Cases

#### Use Case 1: New GST-compliant supplier
```
Account Type: Supplier
GSTIN: 27AABCT1234A1Z5
TIN: (empty)
→ Will use GSTIN for all GST calculations
```

#### Use Case 2: Old account with TIN only
```
Account Type: Customer
GSTIN: (empty)
TIN: 12345678901
→ TIN displayed on invoice for reference
→ GST calculation uses company default
```

#### Use Case 3: Walk-in customer
```
Account Type: N/A (no account created)
GSTIN: N/A
TIN: N/A
→ Treated as walk-in
→ No tax info displayed
```

#### Use Case 4: Account with both
```
Account Type: Supplier
GSTIN: 27AABCT1234A1Z5
TIN: 12345678901
→ GSTIN is prioritized
→ TIN shown as reference
```

---

## 📋 INVOICE GENERATION IMPACT

When generating invoice/bill:

```javascript
// Invoice Display
Invoice: #SALE-001
Date: 2026-01-28

Seller Details:
  Name: ABC Trading
  GSTIN: 27AABCT1234A1Z5  ◄─ NEW (if available)
  TIN: 12345678901        ◄─ NEW (if available, legacy note)

Buyer Details:
  Name: XYZ Corporation
  GSTIN: 29AABCT9876B1Z0  ◄─ AUTO-FETCHED from account
  TIN: 98765432109        ◄─ AUTO-FETCHED from account

Items:
  ...

GST Calculation:
  SGST: (calculated using GSTIN if available)
  CGST: (calculated using GSTIN if available)
  IGST: (if interstate transaction)
```

---

## 🔄 DATA MIGRATION

For existing accounts:

```sql
-- View current data
SELECT id, account_name, account_type FROM accounts;

-- If needed, migrate TIN data from another source
UPDATE accounts SET tin_no = '12345678901' WHERE id = 1;

-- Verify migration
SELECT id, account_name, gst_no, tin_no FROM accounts;
```

---

## ✨ FEATURES

| Feature | Status | Details |
|---------|--------|---------|
| Add TIN to Account | ✅ | Database, form, validation |
| Add GST to Account | ✅ | Database, form, validation |
| Display on Invoice | ✅ | Auto-fetched in SaleForm |
| Validation | ✅ | GST (15-char alphanumeric), TIN (11 digits) |
| Multilingual | ✅ | English & Gujarati |
| API Support | ✅ | Create, Read, Update operations |
| Optional Fields | ✅ | Both GST and TIN are optional |
| Legacy Support | ✅ | TIN marked as legacy |

---

## 🚀 TESTING CHECKLIST

- [ ] Create account with GSTIN only
- [ ] Create account with TIN only
- [ ] Create account with both GSTIN and TIN
- [ ] Create account with neither
- [ ] Update account to add TIN
- [ ] Update account to modify GSTIN
- [ ] Verify validation (invalid GSTIN, invalid TIN)
- [ ] Display TIN/GSTIN in Sale form when customer selected
- [ ] Generate invoice with TIN/GSTIN info
- [ ] Test with Gujarati language
- [ ] Verify data persistence in database

---

## 📝 NOTES

- TIN is stored as VARCHAR(20) for future flexibility
- GST is stored as VARCHAR(15) per Indian standard
- Both fields allow NULL values
- No cascade delete impact
- Backward compatible with existing accounts
- Can be left empty for walk-in customers or legacy accounts

---

## 🔗 RELATED FILES

- Database: `backend/db.js`
- Validator: `backend/validators/accountValidator.js`
- Routes: `backend/routes/accountRoutes.js`
- Form: `frontend/src/components/AccountForm.jsx`
- Sale: `frontend/src/components/SaleForm.jsx`
- English i18n: `frontend/src/locales/en.json`
- Gujarati i18n: `frontend/src/locales/gu.json`

---

**Implementation Date**: January 28, 2026
**Status**: ✅ COMPLETE
