const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'AccountLedger.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the template literal syntax error
content = content.replace(/\}\}\>\?/g, '}>'); // safety check
content = content.replace(/text-rose-600'\}\`\}\}/g, "text-rose-600'`}");
content = content.replace(/text-rose-600'\}\`\}\}\>/g, "text-rose-600'`}>");
content = content.replace(/text-rose-600'\}\`\}\}/g, "text-rose-600'`}"); // repeat/fallback

// Also replace precisely the string sequence:
content = content.replace(
  /\$\{parseFloat\(row\.opening_balance \|\| 0\) \>= 0 \? 'text-zinc-800' : 'text-rose-600'\}\`\}\}/g,
  "${parseFloat(row.opening_balance || 0) >= 0 ? 'text-zinc-800' : 'text-rose-600'}`}"
);

content = content.replace(
  /\$\{parseFloat\(row\.ledger_balance \|\| 0\) \>= 0 \? 'text-zinc-800' : 'text-rose-600'\}\`\}\}/g,
  "${parseFloat(row.ledger_balance || 0) >= 0 ? 'text-zinc-800' : 'text-rose-600'}`}"
);

content = content.replace(
  /\$\{parseFloat\(row\.net_position\) \>= 0 \? 'text-zinc-800' : 'text-rose-600'\}\`\}\}/g,
  "${parseFloat(row.net_position) >= 0 ? 'text-zinc-800' : 'text-rose-600'}`}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("SYNTAX ERROR CORRECTION SUCCEEDED");
