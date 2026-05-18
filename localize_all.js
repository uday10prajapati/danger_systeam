const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('d:\\Danger Systeam\\frontend\\src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    const replacements = [
        [/>\s*PRINT\s*</gi, ">{t('common.print')}<"],
        [/>\s*PDF\s*</gi, ">{t('common.pdf')}<"],
        [/>\s*EXCEL\s*</gi, ">{t('common.excel')}<"],
        [/>\s*TXT\s*</gi, ">{t('common.txt')}<"],
        [/title="Refresh Registry"/gi, "title={t('common.refreshRegistry')}"],
        [/Retry Connection/g, "{t('common.retryConnection')}"],
        [/Refresh Registry/g, "{t('common.refreshRegistry')}"],
        [/>\s*Print Bill\s*</gi, ">{t('common.printBill')}<"],
        [/>\s*Bill Number\s*</gi, ">{t('common.billNumber')}<"],
        [/>\s*P[- ]Code\s*</gi, ">{t('common.pCode')}<"]
    ];

    replacements.forEach(([regex, repl]) => {
        if (regex.test(content)) {
            content = content.replace(regex, repl);
            changed = true;
        }
    });

    if (changed) {
        if (!content.includes('useTranslation()')) {
            // Very basic injection, might need manual check if it fails
            if (content.includes('import {')) {
               content = content.replace('import {', "import { useTranslation } from 'react-i18next';\nimport {");
            }
            content = content.replace(/export default function (\w+)\(\w*\) \{/, "$& \n  const { t } = useTranslation();");
        }
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
});
