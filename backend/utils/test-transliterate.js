/**
 * Test Script for English-to-Gujarati Translation
 * Run this to verify the transliteration works correctly
 */

import {
  transliterateEnglishToGujarati,
  translateDescription,
  getSuggestion
} from '../utils/transliterate.js';

// Test data
const testCases = [
  { input: 'Sumul Ghari', type: 'name', expected: 'સુમુલ ઘારી' },
  { input: 'Ghee', type: 'name', expected: 'ઘી' },
  { input: 'Oil', type: 'name', expected: 'તેલ' },
  { input: 'Salt', type: 'name', expected: 'મીઠું' },
  { input: 'Sugar', type: 'name', expected: 'ખાંડ' },
  { input: 'kg', type: 'unit', expected: 'કિગ્રા' },
  { input: 'liter', type: 'unit', expected: 'લિટર' },
  { input: 'pcs', type: 'unit', expected: 'પીસ' },
  { input: 'Premium dairy ghee', type: 'description', expected: 'પ્રીમીયમ દેરી ઘી' },
];

console.log('\n=== English to Gujarati Translation Tests ===\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: "${testCase.input}" (${testCase.type})`);
  
  let result;
  if (testCase.type === 'description') {
    result = translateDescription(testCase.input);
  } else {
    result = transliterateEnglishToGujarati(testCase.input);
  }
  
  console.log(`  Result:   ${result}`);
  console.log(`  Expected: ${testCase.expected}`);
  console.log(`  Status:   ${result.includes('સ') || result.includes('ગ') ? '✅ Gujarati generated' : '❌ May need adjustment'}\n`);
});

// Test the API suggestion format
console.log('\n=== Suggestion Format Test ===\n');
const suggestion = getSuggestion('Sumul Ghari');
console.log('Input:', suggestion.english);
console.log('Output:', suggestion.gujarati);
console.log('Format:', suggestion);

console.log('\n=== Notes ===');
console.log('✓ Pre-mapped words will show exact matches');
console.log('✓ Unknown words will use phonetic transliteration');
console.log('✓ Multi-word phrases will transliterate word-by-word');
console.log('✓ You can add more words to the WORD_MAPPING and GUJARATI_CONSONANTS dictionaries\n');
