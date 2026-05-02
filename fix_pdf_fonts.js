/**
 * fix_pdf_fonts.js
 *
 * Root cause: NotoSansGujarati has NO Latin glyphs.
 * When autoTable uses `font: 'NotoGujarati'`, all Latin text (names, codes,
 * types, statuses) is invisible because the font has no glyph for those chars.
 * Numbers happen to look ok because numerals are encoded the same way.
 *
 * Fix:
 *   - autoTable styles  → font: 'helvetica'  (renders Latin text correctly)
 *   - headStyles        → font: 'helvetica'
 *   - footStyles        → font: 'helvetica'
 *   - NotoGujarati stays in doc.setFont() calls for header/footer text blocks
 *
 * Also fix ₹ symbol: replace \u20B9 literal with 'Rs.' in autoTable cells
 * since helvetica also lacks the Rupee glyph; the unicode will render as
 * a blank square or missing. We keep \u20B9 only in the header/footer where
 * NotoGujarati is active and handles it correctly. 
 * Actually helvetica DOES support ₹ in modern jsPDF builds, so we just switch
 * the font and keep the symbol — the key fix is just changing the table font.
 */

const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/pages/AccountMaster.jsx',
  'frontend/src/pages/ItemMaster.jsx',
  'frontend/src/pages/DangarMaster.jsx',
  'frontend/src/pages/DangarRateMaster.jsx',
  'frontend/src/pages/DangarEntry.jsx',
  'frontend/src/pages/SabhasadLedgerSummary.jsx',
  'frontend/src/pages/BardanPortfolio.jsx',
  'frontend/src/pages/Rojmel.jsx',
  'frontend/src/pages/InterestCalculator.jsx',
  'frontend/src/pages/Sale.jsx',
  'frontend/src/pages/ItemRate.jsx',
  'frontend/src/pages/SaleReport.jsx',
  'frontend/src/pages/AccountLedger.jsx',
];

let totalFixed = 0;

for (const rel of files) {
  const fp = path.resolve(rel);
  if (!fs.existsSync(fp)) { console.log('SKIP (not found):', rel); continue; }

  let src = fs.readFileSync(fp, 'utf8');
  let changed = false;

  // ── Replace font:'NotoGujarati' inside autoTable style objects ──────────
  // Match patterns like:  font: 'NotoGujarati'  or  font:'NotoGujarati'
  // but NOT inside doc.setFont() calls (those are fine as-is for page header/footer)
  
  // We target only the autoTable config objects by replacing the pattern
  // within autoTable call blocks. A safe approach: replace all occurrences
  // of font: 'NotoGujarati' (with spaces) that are NOT preceded by setFont(
  
  const before = src;
  
  // Pattern inside styles/headStyles/footStyles objects:
  // These look like:  styles: { font: 'NotoGujarati', ...
  //                   headStyles: { font: 'NotoGujarati', ...
  //                   footStyles: { font: 'NotoGujarati', ...
  
  // Replace font property in object literals (not function calls)
  // We look for the pattern: font: 'NotoGujarati' preceded by { or ,
  src = src.replace(/(\{\s*font\s*:\s*)'NotoGujarati'/g, "$1'helvetica'");
  src = src.replace(/(,\s*font\s*:\s*)'NotoGujarati'/g, "$1'helvetica'");
  
  // Also catch:  font:'NotoGujarati' (no space after colon)
  src = src.replace(/font:\s*'NotoGujarati'(\s*[,}])/g, "font: 'helvetica'$1");

  if (src !== before) {
    changed = true;
    totalFixed++;
  }

  // ── Fix ₹ (Rupee) rendering in autoTable body rows ─────────────────────
  // In autoTable body arrays, \\u20B9 (escaped in template literals/strings)
  // and '\u20B9' (actual unicode char) should render fine with helvetica.
  // No change needed here - helvetica in modern jsPDF supports ₹.

  if (changed) {
    fs.writeFileSync(fp, src, 'utf8');
    console.log('✓ Fixed table fonts in:', rel);
  } else {
    console.log('· No autoTable font fix needed:', rel);
  }
}

// ── Special fix for AccountMaster: the total amount uses toLocaleString ───
// The issue `'30,98,076.93` is caused by \u20B9 not rendering in the font.
// With helvetica now applied, ₹ should render. But also fix the escape:
{
  const fp = path.resolve('frontend/src/pages/AccountMaster.jsx');
  let src = fs.readFileSync(fp, 'utf8');
  
  // Replace escaped unicode \u20B9 in string literals with actual ₹ char
  // so it's not double-escaped
  const before = src;
  src = src.replace(/'\\u20B9'/g, "'₹'");
  src = src.replace(/"\\u20B9"/g, '"₹"');
  // Also fix template literals with \\u20B9
  src = src.replace(/`\\u20B9/g, '`₹');
  
  if (src !== before) {
    fs.writeFileSync(fp, src, 'utf8');
    console.log('✓ Fixed ₹ symbol escaping in AccountMaster');
  }
}

// ── Same fix for ItemMaster ───────────────────────────────────────────────
{
  const fp = path.resolve('frontend/src/pages/ItemMaster.jsx');
  let src = fs.readFileSync(fp, 'utf8');
  const before = src;
  src = src.replace(/'\\u20B9'/g, "'₹'");
  src = src.replace(/"\\u20B9"/g, '"₹"');
  if (src !== before) {
    fs.writeFileSync(fp, src, 'utf8');
    console.log('✓ Fixed ₹ symbol in ItemMaster');
  }
}

// ── Same fix for DangarMaster & DangarRateMaster ─────────────────────────
for (const rel of ['frontend/src/pages/DangarMaster.jsx', 'frontend/src/pages/DangarRateMaster.jsx', 'frontend/src/pages/DangarEntry.jsx']) {
  const fp = path.resolve(rel);
  if (!fs.existsSync(fp)) continue;
  let src = fs.readFileSync(fp, 'utf8');
  const before = src;
  src = src.replace(/'\\u20B9'/g, "'₹'");
  src = src.replace(/"\\u20B9"/g, '"₹"');
  src = src.replace(/`\\u20B9/g, '`₹');
  if (src !== before) {
    fs.writeFileSync(fp, src, 'utf8');
    console.log('✓ Fixed ₹ symbol in', rel);
  }
}

console.log(`\nDone! Fixed table fonts in ${totalFixed} files.`);
console.log('autoTable now uses helvetica → Latin text will be fully visible.');
console.log('NotoGujarati is still used in page header/footer text blocks.');
