import { queryOne, query } from './db.js';

async function testQueryOne() {
  try {
    console.log('🔍 Testing queryOne function...\n');

    console.log('1️⃣ Testing query() function:');
    const results = await query('SELECT id FROM company LIMIT 1');
    console.log('query() returned:', results);
    console.log('Type:', typeof results);
    console.log('Length:', results?.length);
    console.log('Is empty array?', Array.isArray(results) && results.length === 0);

    console.log('\n2️⃣ Testing queryOne() function:');
    const oneResult = await queryOne('SELECT id FROM company LIMIT 1');
    console.log('queryOne() returned:', oneResult);
    console.log('Type:', typeof oneResult);
    console.log('Is null?', oneResult === null);
    console.log('Boolean value:', oneResult ? 'truthy' : 'falsy');

    console.log('\n✅ Test complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testQueryOne();
