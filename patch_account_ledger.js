const fs = require('fs');
const path = require('path');

const target = path.resolve('frontend/src/pages/AccountLedger.jsx');
let src = fs.readFileSync(target, 'utf8');

// Fix Gujarati Font rendering by removing 'bold' calls
src = src.replace(/doc.setFont\('NotoGujarati','bold'\)/g, "doc.setFont('NotoGujarati','normal')");
src = src.replace(/fontStyle:\s*'bold'/g, "fontStyle: 'normal'");
// In case the autoTable headStyles also has 'bold'
src = src.replace(/fontStyle:'bold'/g, "fontStyle:'normal'");

// Add Total Row to UI table
const tbodyEndRegex = /<\/tbody>\s*<\/table>/;

const tfootString = `
                                 </tbody>
                                 <tfoot className="bg-slate-50 font-black text-slate-800 text-[11px] uppercase tracking-widest border-t-2 border-slate-200">
                                    <tr>
                                       <td colSpan="2" className="px-10 py-6 text-right">GROSS TOTALS:</td>
                                       <td className="px-10 py-6 text-right text-rose-600 italic">
                                          ₹{parseFloat(accountBalance.total_debit || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                       </td>
                                       <td className="px-10 py-6 text-right text-emerald-600 italic">
                                          ₹{parseFloat(accountBalance.total_credit || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                       </td>
                                       {selectedAccount?.account_code === 'BS0001' && (
                                          <td className="px-10 py-6 text-right text-emerald-500 italic">
                                            —
                                          </td>
                                       )}
                                       <td className="px-10 py-6 text-right text-slate-900 italic">
                                          ₹{Math.abs(parseFloat(accountBalance.running_balance || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})} {parseFloat(accountBalance.running_balance) >= 0 ? 'D' : 'C'}
                                       </td>
                                    </tr>
                                 </tfoot>
                              </table>`;

src = src.replace(tbodyEndRegex, tfootString);

fs.writeFileSync(target, src, 'utf8');
console.log('AccountLedger patched with bold fix and totals row');
