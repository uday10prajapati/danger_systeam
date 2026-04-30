
const fs = require('fs');
const path = 'd:/Danger Systeam/frontend/src/pages/AccountLedger.jsx';
let content = fs.readFileSync(path, 'utf8');

// Update Headers
content = content.replace(
  /'Credit \(-\)', \s+'Running Balance',/g,
  "'Credit (-)', \n                                           ...(selectedAccount?.account_code === 'BS0001' ? ['Self Jama'] : []),\n                                           'Running Balance',"
);

// Update Body cells
// This is trickier, I'll use a unique enough anchor
const oldCell = `<td className="px-10 py-5 text-right font-bold text-slate-400 italic">
                                                {selectedAccount?.account_code === 'IK0001' ? (
                                                   parseFloat(row.credit || 0) > 0 ? \`₹\${parseFloat(row.credit).toLocaleString('en-IN')}\` : \`₹0.00\`
                                                ) : parseFloat(row.credit || 0) > 0 ? (
                                                   (selectedAccount?.account_code === 'BS0001' || row.description?.includes('[BARDAN]'))
                                                      ? parseFloat(row.credit).toLocaleString('en-IN')
                                                      : \`₹\${parseFloat(row.credit).toLocaleString('en-IN')}\`
                                                ) : '—'}
                                             </td>`;

const newCell = `<td className="px-10 py-5 text-right font-bold text-slate-400 italic">
                                                {selectedAccount?.account_code === 'IK0001' ? (
                                                   parseFloat(row.credit || 0) > 0 ? \`₹\${parseFloat(row.credit).toLocaleString('en-IN')}\` : \`₹0.00\`
                                                ) : parseFloat(row.credit || 0) > 0 ? (
                                                   (selectedAccount?.account_code === 'BS0001' || row.description?.includes('[BARDAN]'))
                                                      ? (row.description?.includes('[SELF]') ? '—' : parseFloat(row.credit).toLocaleString('en-IN'))
                                                      : \`₹\${parseFloat(row.credit).toLocaleString('en-IN')}\`
                                                ) : '—'}
                                             </td>
                                             {selectedAccount?.account_code === 'BS0001' && (
                                                <td className="px-10 py-5 text-right font-bold text-emerald-500 italic">
                                                   {row.description?.includes('[SELF]') ? parseFloat(row.credit).toLocaleString('en-IN') : '—'}
                                                </td>
                                             )}`;

// Simplified replacement for the body cell because of potential whitespace issues
content = content.replace(
    /parseFloat\(row\.credit\)\.toLocaleString\('en-IN'\)\s+: `₹\${parseFloat\(row\.credit\)\.toLocaleString\('en-IN'\)}`/g,
    "(row.description?.includes('[SELF]') ? '—' : parseFloat(row.credit).toLocaleString('en-IN')) : `₹${parseFloat(row.credit).toLocaleString('en-IN')}`"
);

// Manually insert the Self Jama column after the credit column
content = content.replace(
    /<\/td>\s+<td className={`px-10 py-5 text-right font-black text-sm italic \${parseFloat\(row\.running_balance\) >= 0/g,
    `</td>
                                             {selectedAccount?.account_code === 'BS0001' && (
                                                <td className="px-10 py-5 text-right font-bold text-emerald-500 italic">
                                                   {row.description?.includes('[SELF]') ? parseFloat(row.credit).toLocaleString('en-IN') : '—'}
                                                </td>
                                             )}
                                             <td className={\`px-10 py-5 text-right font-black text-sm italic \${parseFloat(row.running_balance) >= 0`
);

fs.writeFileSync(path, content);
console.log('AccountLedger.jsx updated successfully.');
