const fs = require('fs');
const path = require('path');

const applyFontFix = (filePath) => {
    let src = fs.readFileSync(filePath, 'utf8');

    // 1. Add addGujaratiFont function if missing
    if (!src.includes('addGujaratiFont')) {
        const fontLoader = `
   const addGujaratiFont = async (doc) => {
      try {
         const res = await fetch('/fonts/NotoSansGujarati-Regular.ttf');
         const blob = await res.blob();
         return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
               const base64 = reader.result.split(',')[1];
               doc.addFileToVFS('NotoSansGujarati.ttf', base64);
               doc.addFont('NotoSansGujarati.ttf', 'NotoGujarati', 'normal');
               resolve();
            };
            reader.readAsDataURL(blob);
         });
      } catch (e) {
         console.warn('Could not load Gujarati font', e);
      }
   };\n`;

        // insert before handleExportPDF
        src = src.replace('const handleExportPDF = () => {', fontLoader + 'const handleExportPDF = async () => {');
    }

    // 2. Ensure handleExportPDF is async
    src = src.replace('const handleExportPDF = () => {', 'const handleExportPDF = async () => {');

    // 3. Inject await addGujaratiFont(doc)
    if (!src.includes('await addGujaratiFont(doc)')) {
        src = src.replace(
            "const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });", 
            "const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });\n    await addGujaratiFont(doc);"
        );
        src = src.replace(
            "const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });", 
            "const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });\n    await addGujaratiFont(doc);"
        );
    }

    // 4. Change helvetica to NotoGujarati
    src = src.replace(/setFont\('helvetica'/g, "setFont('NotoGujarati'");
    
    // 5. Add font to autoTable styles
    src = src.replace(/styles: \{/g, "styles: { font: 'NotoGujarati',");
    src = src.replace(/headStyles: \{/g, "headStyles: { font: 'NotoGujarati',");

    fs.writeFileSync(filePath, src, 'utf8');
    console.log('Fixed fonts in:', filePath);
};

applyFontFix(path.resolve('frontend/src/pages/AccountLedger.jsx'));
applyFontFix(path.resolve('frontend/src/pages/SabhasadLedgerSummary.jsx'));
applyFontFix(path.resolve('frontend/src/pages/BardanPortfolio.jsx'));

