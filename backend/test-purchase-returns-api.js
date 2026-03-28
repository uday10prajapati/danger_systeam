/**
 * Test Purchase Returns API
 * Run: node backend/test-purchase-returns-api.js
 */

import axios from 'axios';

const API_URL = 'http://localhost:5000';

const testPurchaseReturns = async () => {
  try {
    console.log('\n========================================');
    console.log('🧪 TESTING PURCHASE RETURNS API');
    console.log('========================================\n');

    const companyId = 1;
    const startDate = '2026-02-26';
    const endDate = '2026-03-28';

    console.log(`Company ID: ${companyId}`);
    console.log(`Date Range: ${startDate} to ${endDate}\n`);

    const response = await axios.get(
      `${API_URL}/api/purchase-returns`,
      {
        params: {
          startDate,
          endDate
        },
        headers: {
          'x-company-id': companyId
        }
      }
    );

    console.log('✅ Purchase Returns Retrieved Successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Purchase Returns API Failed!');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
    console.error('Message:', error.message);
    process.exit(1);
  }
};

testPurchaseReturns();
