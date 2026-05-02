const fs = require('fs');
const path = require('path');

const applyBoldFix = (filePath) => {
    let src = fs.readFileSync(filePath, 'utf8');
    src = src.replace(/doc.setFont\('NotoGujarati','bold'\)/g, "doc.setFont('NotoGujarati','normal')");
    src = src.replace(/fontStyle:\s*'bold'/g, "fontStyle: 'normal'");
    src = src.replace(/fontStyle:'bold'/g, "fontStyle:'normal'");
    fs.writeFileSync(filePath, src, 'utf8');
    console.log('Fixed bold font in:', filePath);
};

applyBoldFix(path.resolve('frontend/src/pages/SabhasadLedgerSummary.jsx'));
applyBoldFix(path.resolve('frontend/src/pages/BardanPortfolio.jsx'));
applyBoldFix(path.resolve('frontend/src/pages/Rojmel.jsx'));
