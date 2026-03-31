/**
 * English to Gujarati Transliteration Utility
 * Converts English text to Gujarati using transliteration mapping
 */

// Gujarati character mappings
const GUJARATI_VOWELS = {
  'a': 'અ',
  'aa': 'આ',
  'i': 'ઇ',
  'ii': 'ઈ',
  'u': 'ુ',
  'uu': 'ૂ',
  'e': 'ે',
  'ee': 'ી',
  'o': 'ો',
  'oo': 'ૂ',
  'ai': 'ૈ',
};

const GUJARATI_CONSONANTS = {
  'ka': 'ક',
  'kh': 'ખ',
  'ga': 'ગ',
  'gh': 'ઘ',
  'cha': 'ચ',
  'chh': 'છ',
  'ja': 'જ',
  'jh': 'ઝ',
  'ta': 'ટ',
  'th': 'ઠ',
  'da': 'ડ',
  'dh': 'ઢ',
  'na': 'ણ',
  'pa': 'પ',
  'ph': 'ફ',
  'ba': 'બ',
  'bh': 'ભ',
  'ma': 'મ',
  'ya': 'ય',
  'ra': 'ર',
  'la': 'લ',
  'va': 'વ',
  'sha': 'શ',
  'sa': 'સ',
  'ha': 'હ',
};

// Common English words to Gujarati mapping
const WORD_MAPPING = {
  // Common product names
  'sumul': 'સુમુલ',
  'ghari': 'ઘારી',
  'ghee': 'ઘી',
  'oil': 'તેલ',
  'salt': 'મીઠું',
  'sugar': 'ખાંડ',
  'flour': 'અંદણ',
  'milk': 'દૂધ',
  'butter': 'માખણ',
  'rice': 'ચોખું',
  'wheat': 'ધાન',
  'dal': 'દાળ',
  'pulses': 'શણતણ',
  'spice': 'મસાલો',
  'masala': 'મસાલો',
  'tea': 'ચા',
  'coffee': 'કોફી',
  'water': 'પાણી',
  'juice': 'રસ',
  'bread': 'બ્રેડ',
  'butter bread': 'માખણ બ્રેડ',
  
  // Common units
  'kg': 'કિગ્રા',
  'gram': 'ગ્રામ',
  'liter': 'લિટર',
  'ml': 'મીલીલીટર',
  'piece': 'પીસ',
  'pcs': 'પીસ',
  'unit': 'યુનિટ',
  'box': 'બોક્સ',
  'dozen': 'ડઝન',
  'bottle': 'બોટલ',
  'packet': 'પેકેટ',
  'can': 'કેન',
};

/**
 * Convert English to Gujarati using transliteration
 * @param {string} englishText - English text to convert
 * @returns {string} - Gujarati transliterated text
 */
export function transliterateEnglishToGujarati(englishText) {
  if (!englishText) return '';

  const text = englishText.toLowerCase().trim();
  
  // Check for direct word mapping first
  const lowerText = text.toLowerCase();
  if (WORD_MAPPING[lowerText]) {
    return WORD_MAPPING[lowerText];
  }

  // For multi-word strings, transliterate each word
  if (text.includes(' ')) {
    const words = text.split(' ');
    return words.map(word => transliterateWord(word)).join(' ');
  }

  return transliterateWord(text);
}

/**
 * Transliterate a single word
 * @param {string} word - English word
 * @returns {string} - Gujarati word
 */
function transliterateWord(word) {
  if (!word) return '';

  // Check word mapping
  if (WORD_MAPPING[word.toLowerCase()]) {
    return WORD_MAPPING[word.toLowerCase()];
  }

  // Simple phonetic-based transliteration
  let result = '';
  let i = 0;

  while (i < word.length) {
    let matched = false;

    // Try 2-character combinations first
    if (i < word.length - 1) {
      const twoChar = word.substring(i, i + 2).toLowerCase();
      
      if (GUJARATI_CONSONANTS[twoChar]) {
        result += GUJARATI_CONSONANTS[twoChar];
        i += 2;
        matched = true;
      } else if (GUJARATI_VOWELS[twoChar]) {
        result += GUJARATI_VOWELS[twoChar];
        i += 2;
        matched = true;
      }
    }

    // If no 2-char match, try single character
    if (!matched) {
      const char = word[i].toLowerCase();
      const singleChar = GUJARATI_CONSONANTS[char] || GUJARATI_VOWELS[char];
      
      if (singleChar) {
        result += singleChar;
      } else if (char === ' ' || char === '-') {
        result += char;
      } else {
        // Keep the English character if no mapping found
        result += char;
      }
      i += 1;
    }
  }

  return result;
}

/**
 * Convert descriptive text
 * Handles longer strings with multiple words
 * @param {string} text - Description text
 * @returns {string} - Gujarati description
 */
export function translateDescription(text) {
  if (!text) return '';

  // For descriptions, split by spaces and transliterate each word
  const words = text.split(' ');
  return words.map(word => {
    // Remove punctuation for translation, then add back
    const punctuation = word.match(/[.,!?;:—-]+$/);
    const cleanWord = word.replace(/[.,!?;:—-]+$/, '');
    
    const translated = transliterateEnglishToGujarati(cleanWord);
    return punctuation ? translated + punctuation[0] : translated;
  }).join(' ');
}

/**
 * Get suggestion for a text (returns both transliteration options)
 * @param {string} englishText - English text
 * @returns {object} - { english: text, gujarati: transliterated }
 */
export function getSuggestion(englishText) {
  return {
    english: englishText,
    gujarati: transliterateEnglishToGujarati(englishText)
  };
}

export default {
  transliterateEnglishToGujarati,
  translateDescription,
  getSuggestion
};
