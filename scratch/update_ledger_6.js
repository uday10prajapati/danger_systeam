const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'AccountLedger.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the syntax errors and fix the columns
content = content.replace(
  /className=\{\`px-2 py-1.5 text-right font-bold italic border-r border-zinc-100 \$\{parseFloat\(row\.opening_balance \|\| 0\) \>= 0 \? 'text-zinc-850' : 'text-rose-600'\}\` \+ ' text-\[10px\]'\`/g,
  'className={`px-2 py-1.5 text-right font-bold italic border-r border-zinc-100 text-[10px] ${parseFloat(row.opening_balance || 0) >= 0 ? \'text-zinc-800\' : \'text-rose-600\'}`}'
);

content = content.replace(
  /className=\{\`px-2 py-1.5 text-right font-bold italic border-r border-zinc-100 \$\{parseFloat\(row\.ledger_balance \|\| 0\) \>= 0 \? 'text-zinc-850' : 'text-rose-600'\}\` \+ ' text-\[10px\]'\`/g,
  'className={`px-2 py-1.5 text-right font-bold italic border-r border-zinc-100 text-[10px] ${parseFloat(row.ledger_balance || 0) >= 0 ? \'text-zinc-800\' : \'text-rose-600\'}`}'
);

content = content.replace(
  /className=\{\`px-2 py-1.5 text-right font-bold \$\{parseFloat\(row\.net_position\) \>= 0 \? 'text-zinc-850' : 'text-rose-600'\}\` \+ ' text-\[10px\]'\`/g,
  'className={`px-2 py-1.5 text-right font-bold text-[10px] ${parseFloat(row.net_position) >= 0 ? \'text-zinc-800\' : \'text-rose-600\'}`}'
);

// Fix the headers in the thead to remove text-indigo-600, text-amber-600, text-orange-600
content = content.replace(
  /className="px-2 py-1.5 font-bold text-right border-r border-zinc-200 text-indigo-600"/g,
  'className="px-2 py-1.5 font-bold text-right border-r border-zinc-200"'
);
content = content.replace(
  /className="px-2 py-1.5 font-bold text-right border-r border-zinc-200 text-amber-600"/g,
  'className="px-2 py-1.5 font-bold text-right border-r border-zinc-200"'
);
content = content.replace(
  /className="px-2 py-1.5 font-bold text-right border-r border-zinc-200 text-orange-600"/g,
  'className="px-2 py-1.5 font-bold text-right border-r border-zinc-200"'
);

// Adjust cells text-zinc-850 to text-zinc-800 or text-zinc-900 (make them black/dark)
content = content.replace(/text-zinc-850/g, 'text-zinc-800');

fs.writeFileSync(filePath, content, 'utf8');
console.log("CLEANUP SUCCEEDED");
