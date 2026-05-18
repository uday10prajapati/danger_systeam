const fs = require('fs');

const files = [
  'd:\\Danger Systeam\\frontend\\src\\pages\\Rojmel.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\LedgerReport.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\ItemRate.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\ItemMaster.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\InterestCalculator.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\DangarSummaryReport.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\DangarRateMaster.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\CashBook.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\BardanPortfolio.jsx',
  'd:\\Danger Systeam\\frontend\\src\\pages\\Sale.jsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Ensure useTranslation is used
  if (!content.includes('useTranslation()')) {
     if (content.includes('import {')) {
        content = content.replace('import {', "import { useTranslation } from 'react-i18next';\nimport {");
     } else {
        content = "import { useTranslation } from 'react-i18next';\n" + content;
     }
     content = content.replace(/export default function \w+\(\) \{/, "$& \n  const { t } = useTranslation();");
  }

  // Replacements
  content = content.replace(/>\s*PRINT\s*</g, ">{t('common.print')}<");
  content = content.replace(/>\s*PDF\s*</g, ">{t('common.pdf')}<");
  content = content.replace(/>\s*Print Statement\s*</g, ">{t('common.printStatement')}<");
  content = content.replace(/title="Print \(Enter\)"/g, `title={t('common.print') + ' (Enter)'}`);

  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
});
