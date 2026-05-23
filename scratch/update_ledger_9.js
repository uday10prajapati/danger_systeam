const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'AccountLedger.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove the Tab Switches shifted to registry bar
const tabSwitchesRegex = /\{\/\* Tab Switches shifted to registry bar \*\/\}\s*<div[^>]*>[\s\S]*?<\/div>/g;
content = content.replace(tabSwitchesRegex, '');

// Also search and replace tab switches specifically if the comment is different
const tabSwitchesRegex2 = /<div className="flex items-center gap-0\.5 bg-zinc-200 p-0\.5 border border-zinc-350 bg-zinc-200 p-0\.5 border border-zinc-300 ml-2">[\s\S]*?<\/div>/g;
content = content.replace(tabSwitchesRegex2, '');

// Standard fallback replace for the exact code:
const exactTabSwitches = `<div className="flex items-center gap-0.5 bg-zinc-200 p-0.5 border border-zinc-300 ml-2">
                                    <button
                                       onClick={() => setView('ledger')}
                                       className={\`px-2 py-1.5 text-[12px] font-black uppercase tracking-wider transition-all flex items-center gap-1 \${view === 'ledger' ? 'bg-white text-zinc-800 border border-zinc-300 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}\`}
                                    >
                                       <Activity size={10} /> {t('accountLedger.transactions').split(' ')[0]}
                                    </button>
                                    <button
                                       onClick={() => { setView('breakdown'); fetchAccountBreakdown(selectedAccount.id); }}
                                       className={\`px-2 py-1.5 text-[12px] font-black uppercase tracking-wider transition-all flex items-center gap-1 \${view === 'breakdown' ? 'bg-white text-zinc-800 border border-zinc-300 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}\`}
                                    >
                                       <Users size={10} /> {t('accountLedger.breakdown').split(' ')[0]}
                                    </button>
                                 </div>`;
content = content.replace(exactTabSwitches, '');

// 2. Remove the breakdown JSX block:
// {selectedAccount && view === 'breakdown' && ( ... )}
// Let's replace lines from {selectedAccount && view === 'breakdown' && ( to the matching closing bracket
const startStr = "{selectedAccount && view === 'breakdown' && (";
const startIndex = content.indexOf(startStr);
if (startIndex !== -1) {
  // Let's find the matching closing parenthesized block
  let bracketCount = 1;
  let endIndex = -1;
  for (let i = startIndex + startStr.length; i < content.length; i++) {
    if (content[i] === '(') bracketCount++;
    if (content[i] === ')') {
      bracketCount--;
      if (bracketCount === 0) {
        endIndex = i;
        break;
      }
    }
  }
  if (endIndex !== -1) {
    // Find the enclosing curly brace after )
    let trailingBraceIndex = content.indexOf('}', endIndex);
    if (trailingBraceIndex !== -1) {
      content = content.slice(0, startIndex) + content.slice(trailingBraceIndex + 1);
      console.log("REMOVED BREAKDOWN JSX BLOCK SUCCESSFULLY");
    }
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCEEDED SCRIP 9");
