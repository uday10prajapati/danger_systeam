const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'AccountLedger.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove the breakdown member count badge
content = content.replace(
  /<span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-\[10px\] px-1\.5 py-1 font-bold">\{breakdownData\.length\} \{t\('accountLedger\.membersCount'\)\.toUpperCase\(\)\}<\/span>/g,
  ''
);

// Fallback search-and-replace for the badge:
content = content.replace(
  /<span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-\[10px\][^>]*>\{breakdownData\.length\}[^<]*<\/span>/g,
  ''
);

// 2. Change the breakdown table header class from text-zinc-600 to text-zinc-700 font-sans text-[10px]
content = content.replace(
  /<thead className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">/g,
  '<thead className="bg-zinc-50 border-b border-zinc-300 text-zinc-700 font-sans text-[10px]">'
);

// 3. Remove text-indigo-600, text-amber-600, text-orange-600, and text-zinc-800 from breakdown header th tags
content = content.replace(/text-indigo-600 font-bold/g, 'font-bold');
content = content.replace(/text-amber-600 font-bold/g, 'font-bold');
content = content.replace(/text-orange-600 font-bold/g, 'font-bold');
content = content.replace(/text-zinc-800 font-bold/g, 'font-bold');
content = content.replace(/text-indigo-600"\}\>/g, '"}>');
content = content.replace(/text-amber-600"\}\>/g, '"}>');
content = content.replace(/text-orange-600"\}\>/g, '"}>');
content = content.replace(/text-zinc-800"\}\>/g, '"}>');

// 4. Change table body colors to black only (text-zinc-850) and fix font sizes
content = content.replace(
  /className="px-2 py-1.5 text-zinc-400 font-sans border-r border-zinc-100 text-\[10px\]"/g,
  'className="px-2 py-1.5 text-zinc-850 font-sans border-r border-zinc-100 text-[10px]"'
);

content = content.replace(
  /\$\{parseFloat\(row\.opening_balance \|\| 0\) \>= 0 \? 'text-zinc-900' : 'text-rose-500'\}/g,
  `\${parseFloat(row.opening_balance || 0) >= 0 ? 'text-zinc-850' : 'text-rose-600'}\` + ' text-[10px]'`
);

content = content.replace(
  /\$\{parseFloat\(row\.ledger_balance \|\| 0\) \>= 0 \? 'text-zinc-900' : 'text-rose-500'\}/g,
  `\${parseFloat(row.ledger_balance || 0) >= 0 ? 'text-zinc-850' : 'text-rose-600'}\` + ' text-[10px]'`
);

content = content.replace(
  /className="px-2 py-1.5 text-right font-bold text-indigo-600 border-r border-zinc-100"/g,
  'className="px-2 py-1.5 text-right font-bold text-zinc-850 border-r border-zinc-100 text-[10px]"'
);

content = content.replace(
  /className="px-2 py-1.5 text-right font-bold text-amber-600 border-r border-zinc-100"/g,
  'className="px-2 py-1.5 text-right font-bold text-zinc-850 border-r border-zinc-100 text-[10px]"'
);

content = content.replace(
  /className="px-2 py-1.5 text-right font-bold text-orange-600 border-r border-zinc-100"/g,
  'className="px-2 py-1.5 text-right font-bold text-zinc-850 border-r border-zinc-100 text-[10px]"'
);

content = content.replace(
  /\$\{parseFloat\(row\.net_position\) \>= 0 \? 'text-emerald-700' : 'text-rose-600'\}/g,
  `\${parseFloat(row.net_position) >= 0 ? 'text-zinc-850' : 'text-rose-600'}\` + ' text-[10px]'`
);

// member name font size to text-[10px]
content = content.replace(
  /className="text-\[12px\] font-bold text-zinc-800 italic group-hover:text-blue-600 transition-colors"/g,
  'className="text-[10px] font-bold text-zinc-800 italic group-hover:text-blue-600 transition-colors"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("BREAKDOWN LAYOUT UPDATED");
