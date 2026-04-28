const fs = require('fs');
const file = 'c:/Users/aryan/Documents/SandJ/danger_systeam/frontend/src/pages/DangarPaymentReport.jsx';
let c = fs.readFileSync(file, 'utf8');

// Fix corrupted rupee symbol: â€š + Â¹ or â‚ + ¹ variants -> â‚¹ -> â‚¹
// The rupee â‚¹ (U+20B9) got split as: U+201A (â€š/‚) + U+00B9 (Â¹/¹)
c = c.replace(/\u201a\u00b9/g, '\u20B9');  // ‚¹ -> â‚¹
c = c.replace(/â€š\u00b9/g, '\u20B9');
c = c.replace(/â‚¹/g, '\u20B9');
// Also fix emoji corruption (ð + Ÿ + chars) from warning icon in alert
c = c.replace(/\uF0\u0178\u0160/g, '');
c = c.replace(/[\uF000-\uF0FF][\u0100-\u017F][\u0160\u0161]/g, '');

// Remove remaining non-ASCII except â‚¹ from JSX (safe strip for known bad sequences)
// Fix comment lines - strip all non-ASCII
c = c.split('\n').map(line => {
  const t = line.trimStart();
  if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) {
    return line.replace(/[^\x20-\x7E\t\r]/g, '');
  }
  // In code lines, only fix known bad chars, preserve â‚¹
  return line
    .replace(/\u00a0/g, ' ')   // non-breaking space -> space
    .replace(/\u0160\u00a0/g, '') // š + nbsp leftover
    .replace(/\u0161/g, '')     // stray š
    .replace(/\u0160/g, '')     // stray Š
    .replace(/\u0178/g, '')     // stray Ÿ
    .replace(/[\uF000-\uFFFF]/g, ''); // private use / garbage
}).join('\n');

// Update format: acct = 12, msg = 67, total = 102
c = c.replace(/const LINE = 101;/g, 'const LINE = 102;');
c = c.replace(/const LINE = 100;/g, 'const LINE = 102;');

// Ensure acct is capped at 12 chars (no padding)
c = c.replace(
  "var acct  = String(row.full_ac_number || '');",
  "var acct  = String(row.full_ac_number || '').slice(0, 12);"
);
// If it still has old slice(0,13)
c = c.replace(
  "var acct  = String(row.full_ac_number || '').slice(0, 13);",
  "var acct  = String(row.full_ac_number || '').slice(0, 12);"
);

// msg = 67 chars
c = c.replace(
  'const msg = fw(narration, 66, \' \', true);',
  'const msg = fw(narration, 67, \' \', true);'
);
c = c.replace(
  "fw(narration, 66, ' ', true)",
  "fw(narration, 67, ' ', true)"
);

// Update comment
c = c.replace(
  /\/\/ Credit: .*= 10[12]/,
  '// Credit: 2+5+12+16+67 = 102'
);

// Update modal display
c = c.replace(/>101</g, '>102<');
c = c.replace(/101 chars\)/g, '102 chars)');

fs.writeFileSync(file, c, 'utf8');
console.log('Done.');
const remaining = (c.match(/[^\x00-\x7F]/g) || []).filter(ch => ch !== '\u20B9');
console.log('Non-ASCII remaining (excl rupee):', remaining.length);
if (remaining.length > 0) console.log('Sample:', JSON.stringify(remaining.slice(0,5)));
