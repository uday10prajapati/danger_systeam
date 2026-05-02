const fs = require('fs');
const path = require('path');

const target = path.resolve('frontend/src/pages/Rojmel.jsx');
let src = fs.readFileSync(target, 'utf8');

const fontLoaderFunc = `
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
   };
`;

const handleExportReplacement = `const handleDownloadPDF = async () => {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      await addGujaratiFont(doc);
      
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 32;
      const cName = company ? (company.company_name || 'Company') : 'Company';

      const navy=[15,23,42], white=[255,255,255], gray=[100,116,139], dark=[30,41,59];
      const emerald=[5,150,105], blue=[37,99,235];

      const hdr = () => {
         doc.setFillColor(...navy); doc.rect(0,0,W,26,'F');
         doc.setFont('NotoGujarati','normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
         doc.text(cName.toUpperCase(), M, 17);
         doc.setFontSize(7); doc.setTextColor(148,163,184);
         doc.text('DAILY FINANCIAL LEDGER (ROJMEL)', W/2, 17, {align:'center'});
         doc.setFontSize(7); doc.setTextColor(239,68,68);
         doc.text('CONFIDENTIAL', W-M, 17, {align:'right'});
      };

      const ftr = (pg, tot) => {
         doc.setDrawColor(226,232,240); doc.setLineWidth(0.4); doc.line(M, H-18, W-M, H-18);
         doc.setFont('NotoGujarati','normal'); doc.setFontSize(7); doc.setTextColor(...gray);
         doc.text(cName + ' - Rojmel', M, H-9);
         doc.text(date, W/2, H-9, {align:'center'});
         doc.text('Page ' + pg + ' of ' + tot, W-M, H-9, {align:'right'});
      };

      hdr();
      let y = 40;
      doc.setFont('NotoGujarati','normal'); doc.setFontSize(14); doc.setTextColor(...navy);
      doc.text('Daily Financial Ledger', M, y);
      doc.setFontSize(7.5); doc.setTextColor(...gray);
      doc.text('Date: ' + date, M, y+13);
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W-M, y+13, {align:'right'});
      doc.setDrawColor(226,232,240); doc.setLineWidth(0.4); doc.line(M, y+18, W-M, y+18);
      y += 28;

      const body = [];
      const maxLen = Math.max(normalizedJama.length, normalizedUdhar.length);
      for(let i=0; i<maxLen; i++) {
          const j = normalizedJama[i] || {details:'', amount:''};
          const u = normalizedUdhar[i] || {details:'', amount:''};
          body.push([
              j.details || '',
              j.amount ? parseFloat(j.amount).toFixed(2) : '',
              u.details || '',
              u.amount ? parseFloat(u.amount).toFixed(2) : ''
          ]);
      }

      autoTable(doc, {
         startY: y,
         head: [
            [{content: 'JAMA (RECEIPTS)', colSpan: 2, styles: {fillColor: emerald, textColor: white}},
             {content: 'UDHAR (PAYMENTS)', colSpan: 2, styles: {fillColor: blue, textColor: white}}],
            ['Details', 'Amount (Rs)', 'Details', 'Amount (Rs)']
         ],
         body: body,
         styles: { font: 'NotoGujarati', fontSize:7, cellPadding:[3,4], textColor:dark, lineColor:[226,232,240], lineWidth:0.3 },
         headStyles: { font: 'NotoGujarati', fontSize:7, cellPadding:[4,4] },
         theme: 'grid',
         margin: { left:M, right:M },
         columnStyles: {
            0: { cellWidth: (W - M*2)/2 - 50 },
            1: { cellWidth: 50, halign:'right', textColor:emerald },
            2: { cellWidth: (W - M*2)/2 - 50 },
            3: { cellWidth: 50, halign:'right', textColor:blue }
         },
      });

      const tot = doc.internal.getNumberOfPages();
      for (let i=1; i<=tot; i++) { doc.setPage(i); ftr(i,tot); }
      doc.save('Rojmel_' + date + '.pdf');
   };`;

// replace handleDownloadPDF
const oldFuncRegex = /const handleDownloadPDF = \(\) => \{[\s\S]*?\n   \};/;
src = src.replace(oldFuncRegex, fontLoaderFunc + '\n   ' + handleExportReplacement);

fs.writeFileSync(target, src, 'utf8');
console.log('OK - patched Rojmel.jsx');
