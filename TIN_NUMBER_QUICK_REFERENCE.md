# TIN NUMBER SUPPORT - QUICK REFERENCE

## 🎯 What Was Added

### Database
- ✅ `gst_no` column (VARCHAR 15) - GST Number
- ✅ `tin_no` column (VARCHAR 20) - TIN Number
- Both added to `accounts` table

### Backend
- ✅ Validation: GST (15 alphanumeric), TIN (11 digits)
- ✅ API endpoints updated: POST/GET/PUT /api/accounts
- ✅ Both fields returned in API responses

### Frontend
- ✅ Account Master Form: Added GST and TIN input fields
- ✅ Sale Form: Auto-display customer's GST/TIN when selected
- ✅ Translations: English & Gujarati support

---

## 🔍 Key Points

| Aspect | Details |
|--------|---------|
| **Location** | Added to Account Master (not Member/Sale) |
| **GST Format** | 15 alphanumeric characters (e.g., `27AABCT1234A1Z5`) |
| **TIN Format** | 11 digits (e.g., `12345678901`) |
| **Optional** | Yes, both fields are completely optional |
| **Priority** | GSTIN preferred if both exist |
| **Legacy** | TIN marked as legacy/old taxation number |
| **Invoice** | Auto-fetched and displayed when available |

---

## 💾 Database Migration

For existing databases, the columns will be created automatically on next server start.

To manually add to existing accounts table:
```sql
ALTER TABLE accounts ADD COLUMN gst_no VARCHAR(15) AFTER email;
ALTER TABLE accounts ADD COLUMN tin_no VARCHAR(20) AFTER gst_no;
```

---

## 🧪 Example Usage

### Create Account with TIN/GSTIN
```bash
POST /api/accounts
{
  "company_id": 1,
  "account_name": "ABC Trading Co.",
  "account_type": "supplier",
  "phone": "9876543210",
  "email": "abc@trading.com",
  "gst_no": "27AABCT1234A1Z5",
  "tin_no": "12345678901",
  "opening_balance": 5000
}
```

### Fetch Account Details
```bash
GET /api/accounts/1

Response:
{
  "id": 1,
  "account_name": "ABC Trading Co.",
  "gst_no": "27AABCT1234A1Z5",
  "tin_no": "12345678901",
  ...
}
```

### Update Account TIN
```bash
PUT /api/accounts/1
{
  "tin_no": "98765432109"
}
```

---

## 📱 UI Components

### Account Master Form
```
[Account Name] *
[Account Type] *
[Phone]
[Email]
[GST Number] (Optional)
  Hint: 15-digit GSTIN (e.g., 27AABCT1234A1Z5)
[TIN Number] (Optional) (Legacy)
  Hint: 11-digit TIN
[Opening Balance]
```

### Sale Screen
When customer is selected, shows:
```
┌─ Customer Tax Information ─────┐
│ GSTIN: 27AABCT1234A1Z5        │
│ TIN: 12345678901              │
└───────────────────────────────┘
```

---

## ✅ Validation Rules

| Field | Valid | Invalid | Error Message |
|-------|-------|---------|---------------|
| GST | `27AABCT1234A1Z5` | `27AABCT1234` | Must be 15 characters alphanumeric |
| GST | `27AABCT1234A1Z0` | `27aabct1234a1z0` | Must be uppercase |
| TIN | `12345678901` | `1234567890` | Must be 11 digits |
| TIN | `1234567890X` | `12345ABC901` | Must be digits only |
| Either | Empty | (optional) | ✅ Allowed |

---

## 🌍 Language Support

### English
- GST Number
- TIN Number (Legacy)
- Optional
- Invalid GST: "GST Number must be 15 characters alphanumeric"
- Invalid TIN: "TIN Number must be 11 digits"

### Gujarati
- GST નંબર
- TIN નંબર (હેરિટેજ)
- વૈકલ્પિક
- Invalid GST: "GST નંબર 15 અક્ષર આલ્ફાન્યુમેરિક હોવો જોઈએ"
- Invalid TIN: "TIN નંબર 11 અંક હોવો જોઈએ"

---

## 🔗 Modified Files

1. **backend/db.js** - Database schema
2. **backend/validators/accountValidator.js** - Validation logic
3. **backend/routes/accountRoutes.js** - API endpoints
4. **frontend/src/components/AccountForm.jsx** - Form UI
5. **frontend/src/components/SaleForm.jsx** - Sale display
6. **frontend/src/locales/en.json** - English translations
7. **frontend/src/locales/gu.json** - Gujarati translations

---

## 🚀 Next Steps

1. **Database**: Restart backend to create new columns
2. **Frontend**: No build needed, changes are live
3. **Testing**: Create test account with TIN/GST
4. **Invoice**: Verify TIN/GST appears on generated invoices
5. **Reports**: Include TIN/GST in account reports if needed

---

## 📊 Implementation Status

| Component | Status |
|-----------|--------|
| Database Schema | ✅ Complete |
| Backend Validator | ✅ Complete |
| Backend Routes | ✅ Complete |
| Frontend Form | ✅ Complete |
| Frontend Display | ✅ Complete |
| Translations | ✅ Complete |
| Testing | 🔄 Pending |
| Documentation | ✅ Complete |

---

**Last Updated**: January 28, 2026
**Version**: 1.0
