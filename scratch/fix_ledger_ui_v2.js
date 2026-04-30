
const fs = require('fs');
const path = 'd:/Danger Systeam/frontend/src/pages/AccountLedger.jsx';
let content = fs.readFileSync(path, 'utf8');

// Update Credit column logic
content = content.replace(
    /\(row\.description\?\.includes\('\[SELF\]'\) \? '—' : parseFloat\(row\.credit\)\.toLocaleString\('en-IN'\)\)/g,
    "parseFloat(row.company_credit || 0) > 0 ? parseFloat(row.company_credit).toLocaleString('en-IN') : '—'"
);

// Update Self Jama column logic
content = content.replace(
    /\{row\.description\?\.includes\('\[SELF\]'\) \? parseFloat\(row\.credit\)\.toLocaleString\('en-IN'\) : '—'\}/g,
    "{parseFloat(row.self_credit || 0) > 0 ? parseFloat(row.self_credit).toLocaleString('en-IN') : '—'}"
);

fs.writeFileSync(path, content);
console.log('AccountLedger.jsx updated successfully with separated credit logic.');
