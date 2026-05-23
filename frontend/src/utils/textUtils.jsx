import React from 'react';

const getPreferredLanguage = () => {
  try {
    return localStorage.getItem('language') || 'gu';
  } catch {
    return 'gu';
  }
};

/**
 * Utility to render mixed text where legacy-mapped Gujarati (via Prompt font)
 * and modern English codes/numbers coexist.
 * 
 * Rules:
 * 1. Numbers (0-9) and Uppercase codes (e.g., SL-101, BILL-01) should use standard Sans-serif.
 * 2. Lowercase text (likely legacy-mapped) should use the Prompt font.
 * 3. Unicode Gujarati should fall back to Noto Sans.
 * 4. Specific system English terms are translated to proper Unicode Gujarati.
 * 5. Mixed-case English abbreviations like 'Qt', 'SR' are kept in sans-serif.
 */

const DICTIONARY = {
  "Gross Sale Inv": "કુલ વેચાણ ભરતિયું",
  "Sales Account": "વેચાણ ખાતું",
  "Sale Inv": "વેચાણ ભરતિયું",
  "Gross": "કુલ",
  "Sale": "વેચાણ",
  "Inv": "ભરતિયું",
  "Purchase": "ખરીદી",
  "Return": "પરત",
  "Brokerage": "દલાલી",
  "Bardan": "બારદાન",
  "Labour Charge": "મજૂરી ચાર્જ",
  "Labour": "મજૂરી",
  "Charge": "ચાર્જ",
  "Godown": "ગોડાઉન",
  "Fund": "ફંડ",
  "Account": "ખાતું",
  "Dangar": "ડાંગર",
  "Danger": "ડાંગર",
  "Recalc": "ગણતરી",
  "Kharidi": "ખરીદી",
  "Khatu": "ખાતું",
  "Opening Balance": "ઉઘડતી સિલ્ક",
  "Closing Balance": "બંધ સિલ્ક",
  "Interest Calculation": "વ્યાજ ગણતરી",
  "Interest": "વ્યાજ",
  "KAPAT (PRINCIPAL)": "કપાત (મુદ્દલ)",
  "KAPAT": "કપાત",
  "PRINCIPAL": "મુદ્દલ",
  "Node": "સભ્ય",
  "Multiple Members": "વિવિધ સભાસદો",
  "Dalali": "દલાલી",
  "Cash": "રોકડ",
  "System": "સીસ્ટમ",
  "Majuri": "મજૂરી",
  "Member": "સભાસદ",
  "Advance": "એડવાન્સ",
  "Rounding": "રાઉન્ડીંગ"
};

// English abbreviations/words that must always render in standard font
// These are mixed-case words that look like Gujarati when rendered in Prompt font
const ENGLISH_ABBREV_PATTERN = /\b(Qt|QT|qt|SR|Sr|KG|Kg|kg|AM|PM|NA|No|ID)\b/gi;

/**
 * String-only version of the translator for use in non-React contexts (like PDF generation)
 */
export const translateSystemText = (text, language = getPreferredLanguage()) => {
  if (!text || typeof text !== 'string') return text;
  if (language !== 'gu') return text;
  let processedText = text;
  Object.entries(DICTIONARY).forEach(([eng, guj]) => {
    const regex = new RegExp(eng, 'gi');
    processedText = processedText.replace(regex, guj);
  });
  return processedText;
};

export const formatBilingualText = (text, language = getPreferredLanguage()) => {
  if (!text || typeof text !== 'string') return text;

  // English mode: keep text in English, but still render codes/numbers cleanly.
  if (language !== 'gu') {
    const parts = text.split(/([A-Z0-9\-\/#]{2,}|[0-9]+(?:\.[0-9]+)?|[@#]|\b(?:Qt|QT|qt|SR|Sr|KG|Kg|kg|AM|PM|NA|No|ID)\b)/g);
    return (
      <>
        {parts.map((part, i) => {
          if (!part) return null;
          const isEnglishCode = /^[A-Z0-9\-\/#@]+$/.test(part) || /^\d+(\.\d+)?$/.test(part);
          const isMixedCaseAbbrev = /^(Qt|QT|qt|SR|Sr|KG|Kg|kg|AM|PM|NA|No|ID|@|#)$/i.test(part);
          if (isEnglishCode || isMixedCaseAbbrev) {
            return (
              <span key={i} className="font-sans font-bold tracking-normal text-zinc-500" style={{ fontFamily: 'sans-serif', margin: '0 2px' }}>
                {part}
              </span>
            );
          }
          return (
            <span key={i} style={{ fontFamily: 'sans-serif' }}>
              {part}
            </span>
          );
        })}
      </>
    );
  }

  // Gujarati mode: translate legacy/system text to Gujarati and preserve code fragments.
  let processedText = text;
  Object.entries(DICTIONARY).forEach(([eng, guj]) => {
    // Case-insensitive replacement for specific words/phrases
    const regex = new RegExp(eng, 'gi');
    processedText = processedText.replace(regex, guj);
  });

  // 2. Split text by parts that look like English codes/numbers (Uppercase + Digits + common symbols)
  //    Also split on mixed-case abbreviations like Qt, SR, KG, and symbols like @ # /
  //    Pattern: all-caps codes, numbers, or known mixed-case abbreviations, or @ symbol
  const parts = processedText.split(/([A-Z0-9\-\/#]{2,}|[0-9]+(?:\.[0-9]+)?|[@#]|\b(?:Qt|QT|qt|SR|Sr|KG|Kg|kg)\b)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        
        // If the part matches our English code/number pattern, use standard font
        const isEnglishCode = /^[A-Z0-9\-\/#@]+$/.test(part) || /^\d+(\.\d+)?$/.test(part);
        
        // Known mixed-case English abbreviations — must render in sans-serif
        const isMixedCaseAbbrev = /^(Qt|QT|qt|SR|Sr|KG|Kg|kg|AM|PM|NA|No|ID|@|#)$/i.test(part);
        
        // If the part contains Unicode Gujarati characters, use Noto Sans stack
        const hasUnicodeGuj = /[\u0A80-\u0AFF]/.test(part);
        
        if ((isEnglishCode || isMixedCaseAbbrev) && !hasUnicodeGuj) {
          return (
            <span key={i} className="font-sans font-bold tracking-normal text-zinc-500" style={{ fontFamily: 'sans-serif', margin: '0 2px' }}>
              {part}
            </span>
          );
        }

        if (hasUnicodeGuj) {
          return (
            <span key={i} className="font-sans" style={{ fontFamily: "'Noto Sans Gujarati', sans-serif" }}>
              {part}
            </span>
          );
        }

        // Otherwise, use the Prompt font stack for legacy-mapped parts
        return (
          <span key={i} style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}>
            {part}
          </span>
        );
      })}
    </>
  );
};
