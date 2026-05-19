const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'AccountLedger.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix line 774
content = content.replace(
  /className=\{\`px-2 py-1.5 text-right font-bold italic border-r border-zinc-100 text-\[10px\] \$\{parseFloat\(row\.opening_balance \|\| 0\) \>= 0 \? 'text-zinc-800' : 'text-rose-600'\`\}\>/g,
  'className={`px-2 py-1.5 text-right font-bold italic border-r border-zinc-100 text-[10px] ${parseFloat(row.opening_balance || 0) >= 0 ? \'text-zinc-800\' : \'text-rose-600\'}`}>'
);

// Fix line 775
content = content.replace(
  /className=\{\`px-2 py-1.5 text-right font-bold italic border-r border-zinc-100 text-\[10px\] \$\{parseFloat\(row\.ledger_balance \|\| 0\) \>= 0 \? 'text-zinc-800' : 'text-rose-600'\`\}\>/g,
  'className={`px-2 py-1.5 text-right font-bold italic border-r border-zinc-100 text-[10px] ${parseFloat(row.ledger_balance || 0) >= 0 ? \'text-zinc-800\' : \'text-rose-600\'}`}>'
);

// Fix line 779
content = content.replace(
  /className=\{\`px-2 py-1.5 text-right font-bold text-\[10px\] \$\{parseFloat\(row\.net_position\) \>= 0 \? 'text-zinc-800' : 'text-rose-600'\`\}\>/g,
  'className={`px-2 py-1.5 text-right font-bold text-[10px] ${parseFloat(row.net_position) >= 0 ? \'text-zinc-800\' : \'text-rose-600\'}`}>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("SYNTAX ERROR CORRECTION SUCCEEDED VIA SCRIPT 8");
