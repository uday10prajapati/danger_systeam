const fs = require('fs');
const path = 'd:\\Danger Systeam\\frontend\\src\\pages\\Login.jsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("const { t } = useTranslation()")) {
    content = content.replace("const navigate = useNavigate()", "const { t } = useTranslation()\n   const navigate = useNavigate()");
}

const reps = [
  ['System Login', "{t('login.title')}"],
  ['Verify your credentials to enter', "{t('login.subtitle')}"],
  ['Identity Node (Email)', "{t('login.identityLabel')}"],
  ['Fiscal Cycle', "{t('login.fiscalCycle')}"],
  ['Security Key', "{t('login.securityKey')}"],
  ['Recover Access', "{t('login.recoverAccess')}"],
  ['Authenticating...', "{t('login.authenticating')}"],
  ['ENTER SYSTEM', "{t('login.enterSystem')}"],
  ['System Integrity', "{t('login.integrity')}"],
  ['Audit Certified Logs', "{t('login.auditLogs')}"],
  ['Zero-Latency Sync', "{t('login.zeroLatency')}"],
  ['Encrypted Data Vault', "{t('login.dataVault')}"],
  ['Authorized Personnel Only', "{t('login.authorizedOnly')}"],
  ['Enterprise Accounting & Industrial Ledger Management System', "{t('login.systemDescription')}"],
  ['Danger Systeam', "{t('login.brandName')}"]
];

reps.forEach(([oldS, newS]) => {
  content = content.split(oldS).join(newS);
});

fs.writeFileSync(path, content);
console.log('Successfully localized Login.jsx');
