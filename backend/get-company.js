import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function getCompanyData() {
  try {
    console.log('🔍 Fetching existing company...\n');

    const response = await axios.get(`${API_URL}/company`);

    if (response.data.success) {
      console.log('✅ Company found!\n');
      console.log('📋 Company Details:');
      console.log(JSON.stringify(response.data.data, null, 2));
    } else {
      console.log('❌ Error:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Error:');
    if (error.response?.data?.error) {
      console.error('API Error:', error.response.data.error);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

getCompanyData();
