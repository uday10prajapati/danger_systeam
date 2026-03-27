import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function createCompanyInDatabase() {
  try {
    console.log('🚀 Creating Company via API...\n');

    // Test company data
    const companyData = {
      company_name: 'Local Superstore',
      address: '123 Main Street, City, State, Country',
      phone: '+91-9876543210',
      email: 'admin@localsuperstore.com',
      gst_number: '27AABCT1234H1Z0',
      financial_year_start: '2024-04-01',
      financial_year_end: '2025-03-31',
      currency: 'INR',
      logo_url: null
    };

    console.log('📤 Sending company data:');
    console.log(JSON.stringify(companyData, null, 2));
    console.log('\n');

    // Create company
    const response = await axios.post(`${API_URL}/company`, companyData);

    if (response.data.success) {
      console.log('✅ Company created successfully!');
      console.log('\n📋 Company Details:');
      console.log(JSON.stringify(response.data.data, null, 2));
      
      // Verify by fetching the company
      console.log('\n🔍 Verifying company in database...');
      const verifyRes = await axios.get(`${API_URL}/company`);
      
      if (verifyRes.data.success) {
        console.log('✅ Company verified in database:');
        console.log(JSON.stringify(verifyRes.data.data, null, 2));
        console.log('\n✅ All done! Company is now stored in superstore_local database.');
      }
    } else {
      console.log('❌ Error:', response.data.error);
    }
  } catch (error) {
    console.error('\n❌ Error:');
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused - Backend server is not running!');
      console.error('   Please run: npm start (in backend folder)');
    } else if (error.response?.data?.error) {
      console.error('API Error:', error.response.data.error);
      console.error('Status:', error.response.status);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

createCompanyInDatabase();
