const fs = require('fs');
const path = require('path');

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
   };
`;

const getBasePdfFunc = (title, generateBodyLogic, columns, useLandscape = false) => `
  const handlePrint = () => { window.print(); };

  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: '${useLandscape ? 'landscape' : 'portrait'}', unit: 'pt', format: 'a4' });
    await addGujaratiFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [15,23,42], white = [255,255,255], gray = [100,116,139], dark = [30,41,59], stripe = [241,245,249];

    let cName = 'Company';
    try {
        const u = JSON.parse(localStorage.getItem('user'));
        if (u && u.company_name) cName = u.company_name;
    } catch(e) {}

    const hdr = () => {
       doc.setFillColor(...navy); doc.rect(0,0,W,26,'F');
       doc.setFont('NotoGujarati','normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
       doc.text(cName.toUpperCase(), M, 17);
       doc.setFontSize(7); doc.setTextColor(148,163,184);
       doc.text('${title}', W/2, 17, {align:'center'});
       doc.setFontSize(7); doc.setTextColor(239,68,68);
       doc.text('CONFIDENTIAL', W-M, 17, {align:'right'});
    };

    const ftr = (pg, tot) => {
       doc.setDrawColor(226,232,240); doc.setLineWidth(0.4); doc.line(M, H-18, W-M, H-18);
       doc.setFont('NotoGujarati','normal'); doc.setFontSize(7); doc.setTextColor(...gray);
       doc.text(cName + ' - ${title}', M, H-9);
       doc.text('Generated: ' + new Date().toLocaleDateString(), W/2, H-9, {align:'center'});
       doc.text('Page ' + pg + ' of ' + tot, W-M, H-9, {align:'right'});
    };

    hdr();
    let y = 40;
    doc.setFont('NotoGujarati','normal'); doc.setFontSize(14); doc.setTextColor(...navy);
    doc.text('${title}', M, y);
    doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Date: ' + new Date().toLocaleString('en-IN'), M, y+13);
    doc.setDrawColor(226,232,240); doc.setLineWidth(0.4); doc.line(M, y+18, W-M, y+18);
    y += 28;

    ${generateBodyLogic}

    autoTable(doc, {
       startY: y,
       head: [${columns}],
       body: bodyRows,
       styles: { font: 'NotoGujarati', fontSize:8, cellPadding:[4,5], textColor:dark, lineColor:[226,232,240], lineWidth:0.3 },
       headStyles: { font: 'NotoGujarati', fillColor:navy, textColor:white, fontStyle:'bold' },
       alternateRowStyles: { fillColor:stripe },
       theme: 'grid',
       margin: { left:M, right:M }
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i=1; i<=tot; i++) { doc.setPage(i); ftr(i,tot); }
    doc.save('${title.replace(/ /g, '_')}.pdf');
  };
`;

function injectJsPdfAndButtons(filePath, findButtonStr, replacementButtons, title, generateBodyLogic, columns, useLandscape = false, markerFuncStr) {
    let src = fs.readFileSync(filePath, 'utf8');
    if (src.includes('handleExportPDF')) {
        console.log('Skipping', filePath, 'already has handleExportPDF');
        return;
    }

    if (!src.includes("import jsPDF from 'jspdf';")) {
        src = src.replace(/import \{.*?\} from 'lucide-react';/, (match) => match + "\nimport jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';");
    }

    // Include the FileText icon if missing
    if (src.includes('lucide-react') && !src.includes('FileText')) {
        src = src.replace('Printer,', 'Printer, FileText,');
    }

    const idx = src.indexOf(markerFuncStr);
    if (idx !== -1) {
        const fullFunc = fontLoader + getBasePdfFunc(title, generateBodyLogic, columns, useLandscape);
        src = src.slice(0, idx) + fullFunc + '\n  ' + src.slice(idx);
    } else {
        console.warn('Marker not found in', filePath);
    }

    src = src.replace(findButtonStr, replacementButtons);

    fs.writeFileSync(filePath, src, 'utf8');
    console.log('Patched', filePath);
}

// 1. InterestCalculator
injectJsPdfAndButtons(
    path.resolve('frontend/src/pages/InterestCalculator.jsx'),
    '<button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">\n                <Download size={14} /> Export Manifest\n              </button>',
    `<button onClick={handleExportPDF} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"><FileText size={14} /> PDF</button>
     <button onClick={handlePrint} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"><Printer size={14} /> Print</button>`,
    'Interest Computation Manifest',
    `const bodyRows = filteredResults.map(row => [
        row.member_name || '-',
        row.reference_no || '-',
        parseFloat(row.debit || 0).toFixed(2),
        parseFloat(row.credit || 0).toFixed(2),
        parseFloat(row.principal || 0).toFixed(2),
        row.elapsedDays + ' D',
        isComputed ? (parseFloat(globalRate) || row.interest_percent) + '%' : '-',
        calculateYield(row),
        (parseFloat(row.principal) + parseFloat(calculateYield(row))).toFixed(2)
    ]);`,
    `['Entity', 'Reference', 'Debit', 'Credit', 'Principal', 'Days', 'Rate', 'Yield', 'Total']`,
    true,
    'const filteredResults ='
);

// 2. Sale
injectJsPdfAndButtons(
    path.resolve('frontend/src/pages/Sale.jsx'),
    '<button className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Download size={18} /></button>',
    `<button onClick={handleExportPDF} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><FileText size={18} /></button>
     <button onClick={handlePrint} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Printer size={18} /></button>`,
    'Revenue Manifest',
    `const bodyRows = filteredSales.map(sale => [
        sale.invoice_no || '-',
        sale.customer_name || '-',
        sale.item_count + ' Nodes',
        parseFloat(sale.net_amount || 0).toFixed(2),
        sale.payment_type || '-',
        sale.invoice_date || '-'
    ]);`,
    `['Invoice', 'Identity', 'Density', 'Gross Yield', 'Settlement', 'Date']`,
    false,
    'const applyFilters ='
);

// 3. ItemRate
injectJsPdfAndButtons(
    path.resolve('frontend/src/pages/ItemRate.jsx'),
    '<button className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Download size={18} /></button>',
    `<button onClick={handleExportPDF} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><FileText size={18} /></button>
     <button onClick={handlePrint} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Printer size={18} /></button>`,
    'Item Rate Control List',
    `const bodyRows = filteredRates.map(rate => [
        rate.item_name || '-',
        rate.item_code || '-',
        parseFloat(rate.purchase_rate || 0).toFixed(2),
        parseFloat(rate.sale_rate || 0).toFixed(2),
        rate.status === 'active' ? 'Active' : 'Archived',
        rate.last_updated_at ? new Date(rate.last_updated_at).toLocaleDateString() : '-'
    ]);`,
    `['Nomenclature', 'Code', 'Procurement Rate', 'Retail Rate', 'Status', 'Updated']`,
    false,
    'const filteredRates ='
);

// 4. SaleReport
injectJsPdfAndButtons(
    path.resolve('frontend/src/pages/SaleReport.jsx'),
    `<button onClick={exportToExcel} className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all shadow-sm active:scale-95">
                  <Download size={18} />
                </button>`,
    `<button onClick={handleExportPDF} className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all shadow-sm active:scale-95"><FileText size={18} /></button>
     <button onClick={handlePrint} className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all shadow-sm active:scale-95"><Printer size={18} /></button>
     <button onClick={exportToExcel} className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all shadow-sm active:scale-95">
                  <Download size={18} />
                </button>`,
    'Sale Report / Analytics',
    `const bodyRows = filteredReports.map(s => [
        s.customer_name || 'COUNTER SALE',
        new Date(s.invoice_date).toLocaleDateString('en-GB'),
        s.invoice_no,
        s.item_count,
        parseFloat(s.total_amount).toFixed(2),
        parseFloat(s.discount_amount || 0).toFixed(2),
        parseFloat(s.net_amount).toFixed(2),
        s.payment_type
    ]);`,
    `['Client', 'Date', 'Invoice ID', 'Density', 'Gross Amt', 'Discount', 'Net Amt', 'Mode']`,
    true,
    'const exportToExcel ='
);

console.log('Done!');
