import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function testCompanyAPI() {
  try {
    console.log('🔍 Testing Company API...\n');

    // Test 1: Try to GET company (should fail if empty)
    console.log('1️⃣ GET /api/company (get existing company)');
    try {
      const getRes = await axios.get(`${API_URL}/company`);
      console.log('✅ Found existing company:', getRes.data.data);
    } catch (err) {
      console.log('❌ No company found (expected if first time)');
    }

    // Test 2: Create a new company
    console.log('\n2️⃣ POST /api/company (create company)');
    const companyData = {
      company_name: 'Test Company Inc',
      address: '123 Main Street, City, Country',
      phone: '+1-555-0100',
      email: 'test@testcompany.com',
      gst_number: 'GST123456789',
      financial_year_start: '2024-04-01',
      financial_year_end: '2025-03-31',
      currency: 'INR',
      logo_url: 'https://example.com/logo.png'
    };

    console.log('📤 Sending:', JSON.stringify(companyData, null, 2));

    const postRes = await axios.post(`${API_URL}/company`, companyData);
    console.log('✅ Company created successfully!');
    console.log('Response:', JSON.stringify(postRes.data, null, 2));

    // Test 3: Fetch company again to verify it was saved
    console.log('\n3️⃣ GET /api/company (verify company was saved)');
    const getRes2 = await axios.get(`${API_URL}/company`);
    console.log('✅ Company found in database:', JSON.stringify(getRes2.data.data, null, 2));

    console.log('\n✅ All tests passed! Company API is working correctly.');
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused - Is the backend server running?');
      console.error('   Run: npm start (in backend folder)');
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testCompanyAPI();
