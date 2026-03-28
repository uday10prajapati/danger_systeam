/**
 * Test Purchase Creation
 * Run: node backend/test-purchase-api.js
 */

import axios from 'axios';

const API_URL = 'http://localhost:5000';

const testPurchase = async () => {
  try {
    console.log('\n========================================');
    console.log('🧪 TESTING PURCHASE API');
    console.log('========================================\n');

    // Generate unique invoice number
    const invoiceNo = `INV-${Date.now()}`;
    const companyId = 1;

    console.log('test payload:', {
      supplier_account_id: 5,
      invoice_no: invoiceNo,
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          item_id: 1,
          quantity: 50,
          purchase_rate: 20
        }
      ],
      notes: 'Test purchase from API'
    });

    const response = await axios.post(
      `${API_URL}/api/purchases`,
      {
        supplier_account_id: 5,
        invoice_no: invoiceNo,
        invoice_date: new Date().toISOString().split('T')[0],
        items: [
          {
            item_id: 1,
            quantity: 50,
            purchase_rate: 20
          }
        ],
        notes: 'Test purchase from API'
      },
      {
        headers: {
          'x-company-id': companyId,
          'x-user-id': 1
        }
      }
    );

    console.log('\n✅ Purchase Created Successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Purchase Creation Failed!');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
    process.exit(1);
  }
};

testPurchase();
