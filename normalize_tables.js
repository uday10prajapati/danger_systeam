const fs = require('fs');

const files = [
  'd:\\Danger Systeam\\frontend\\src\\pages\\AccountLedger.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\SabhasadLedgerSummary.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\Village.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\UserMaster.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\ItemMaster.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\ItemRate.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\DangarRateMaster.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\DangarSummaryReport.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\Sale.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\Rojmel.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\CashBook.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\LedgerReport.jsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove restrictive styles from table tags
  // 1. Remove 'uppercase' from th and td and spans within them
  content = content.replace(/(<(th|td|span)[^>]*class(?:name)?="[^"]*)\buppercase\b/gi, '$1');
  
  // 2. Remove 'italic' from th and td and spans within them
  content = content.replace(/(<(th|td|span)[^>]*class(?:name)?="[^"]*)\bitalic\b/gi, '$1');
  
  // 3. Upgrade font size: replace text-[9px], text-[10px], text-xs with text-sm
  content = content.replace(/(<(th|td|span)[^>]*class(?:name)?="[^"]*)\btext-\[([89]|10)px\]/gi, '$1text-sm');
  content = content.replace(/(<(th|td|span)[^>]*class(?:name)?="[^"]*)\btext-xs\b/gi, '$1text-sm');
  
  // 4. Prefer font-sans over font-mono for Gujarati
  content = content.replace(/(<(th|td|span)[^>]*class(?:name)?="[^"]*)\bfont-mono\b/gi, '$1font-sans');
  
  // 5. Remove 'tracking-widest' or 'tracking-wider' as it breaks Gujarati clusters
  content = content.replace(/(<(th|td|span)[^>]*class(?:name)?="[^"]*)\btracking-wide(st|r)\b/gi, '$1');

  fs.writeFileSync(file, content);
  console.log('Normalized tables in ' + file);
});
