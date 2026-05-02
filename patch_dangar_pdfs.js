const fs = require('fs');
const path = require('path');

// ─── shared helpers ───────────────────────────────────────────────────────────
const addGujaratiBody = `
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
    } catch (e) { console.warn('Gujarati font load failed', e); }
  };
`;

const pdfImports = `import jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';\n`;

// ─── 1. DangarMaster ─────────────────────────────────────────────────────────
{
  const fp = path.resolve('frontend/src/pages/DangarMaster.jsx');
  let src = fs.readFileSync(fp, 'utf8');

  if (!src.includes('handleExportPDF')) {
    // imports
    src = src.replace("import api from '../api';", pdfImports + "import api from '../api';");
    src = src.replace("import { useTranslation } from 'react-i18next';", "import { useTranslation } from 'react-i18next';");
    // add FileText to lucide imports
    src = src.replace('Eye, RefreshCcw, Layout, FileText,', 'Eye, RefreshCcw, Layout, FileText, Printer,');

    const pdfFn = `
  ${addGujaratiBody}
  const handleExportPDF = async () => {
    const cName = company ? (company.company_name || 'Company') : 'Company';
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    await addGujaratiFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [15,23,42], white = [255,255,255], gray = [100,116,139];
    const dark = [30,41,59], stripe = [241,245,249];

    const hdr = () => {
      doc.setFillColor(...navy); doc.rect(0,0,W,26,'F');
      doc.setFont('NotoGujarati','normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
      doc.text(cName.toUpperCase(), M, 17);
      doc.setFontSize(7); doc.setTextColor(148,163,184);
      doc.text('DANGAR ENTRY REGISTRY', W/2, 17, {align:'center'});
      doc.setFontSize(7); doc.setTextColor(239,68,68);
      doc.text('CONFIDENTIAL', W-M, 17, {align:'right'});
    };
    const ftr = (pg, tot) => {
      doc.setDrawColor(226,232,240); doc.setLineWidth(0.4);
      doc.line(M, H-18, W-M, H-18);
      doc.setFont('NotoGujarati','normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Dangar Entry Registry', M, H-9);
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W/2, H-9, {align:'center'});
      doc.text('Page ' + pg + ' of ' + tot, W-M, H-9, {align:'right'});
    };

    hdr();
    let y = 40;
    doc.setFont('NotoGujarati','normal'); doc.setFontSize(14); doc.setTextColor(...navy);
    doc.text('Dangar Entry Registry', M, y);
    doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Period: ' + (dateRange.start || '--') + ' to ' + (dateRange.end || '--') + '  |  Season: ' + (season || 'All') + '  |  Generated: ' + new Date().toLocaleString('en-IN'), M, y+13);
    doc.setDrawColor(226,232,240); doc.setLineWidth(0.4); doc.line(M, y+18, W-M, y+18);
    y += 28;

    const totalQtl = filteredEntries.reduce((a,c) => a + parseFloat(c.net_quintal||0), 0);
    const totalAmt = filteredEntries.reduce((a,c) => a + parseFloat(c.amount||0), 0);

    autoTable(doc, {
      startY: y,
      head: [['Date','SR #','Member','Item','Vehicle','Net Quintal','Rate (Qt)','Amount']],
      body: filteredEntries.map(r => [
        new Date(r.entry_date).toLocaleDateString('en-GB'),
        '#' + r.sr_no,
        r.member_name + (r.member_code ? ' [' + r.member_code + ']' : ''),
        r.item_name,
        r.vehicle_no || '-',
        parseFloat(r.net_quintal).toFixed(2) + ' Qt',
        '\\u20B9' + parseFloat(r.rate).toFixed(2),
        '\\u20B9' + parseFloat(r.amount).toLocaleString('en-IN', {minimumFractionDigits:2})
      ]),
      foot: [['','','','','TOTALS', totalQtl.toFixed(2) + ' Qt', '', '\\u20B9' + totalAmt.toLocaleString('en-IN', {minimumFractionDigits:2})]],
      styles: { font:'NotoGujarati', fontSize:7.5, cellPadding:[4,5], textColor:dark, lineColor:[226,232,240], lineWidth:0.3 },
      headStyles: { font:'NotoGujarati', fillColor:navy, textColor:white },
      footStyles: { font:'NotoGujarati', fillColor:[30,41,59], textColor:white },
      alternateRowStyles: { fillColor:stripe },
      theme: 'grid',
      margin: { left:M, right:M }
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i=1; i<=tot; i++) { doc.setPage(i); ftr(i,tot); }
    doc.save('Dangar_Entry_Registry_' + new Date().toISOString().split('T')[0] + '.pdf');
  };
`;

    src = src.replace(
      'const filteredEntries = entries.filter(',
      pdfFn + '\n  const filteredEntries = entries.filter('
    );

    // Replace existing Export button
    src = src.replace(
      `<button className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border border-slate-200 hover:border-slate-400 active:scale-95 shadow-sm">\n              <Download size={14} /> Export\n            </button>`,
      `<button onClick={handleExportPDF} className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border border-slate-200 hover:border-slate-400 active:scale-95 shadow-sm">\n              <FileText size={14} /> Export PDF\n            </button>`
    );

    fs.writeFileSync(fp, src, 'utf8');
    console.log('DangarMaster patched');
  } else {
    console.log('DangarMaster already patched');
  }
}

// ─── 2. DangarRateMaster ─────────────────────────────────────────────────────
{
  const fp = path.resolve('frontend/src/pages/DangarRateMaster.jsx');
  let src = fs.readFileSync(fp, 'utf8');

  if (!src.includes('handleExportPDF')) {
    src = src.replace("import api from '../api';", pdfImports + "import api from '../api';");
    src = src.replace(
      'Shield, Search, Plus, Save, RefreshCcw,\n   AlertCircle, CheckCircle, Database, Calendar,\n   TrendingUp, Scale, Box, Loader, Info, Edit3, X',
      'Shield, Search, Plus, Save, RefreshCcw,\n   AlertCircle, CheckCircle, Database, Calendar,\n   TrendingUp, Scale, Box, Loader, Info, Edit3, X, FileText, Download'
    );

    const pdfFn = `
  ${addGujaratiBody}
  const handleExportPDF = async () => {
    const cName = companyName || 'Company';
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    await addGujaratiFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [15,23,42], white = [255,255,255], gray = [100,116,139];
    const dark = [30,41,59], stripe = [241,245,249];

    const hdr = () => {
      doc.setFillColor(...navy); doc.rect(0,0,W,26,'F');
      doc.setFont('NotoGujarati','normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
      doc.text(cName.toUpperCase(), M, 17);
      doc.setFontSize(7); doc.setTextColor(148,163,184);
      doc.text('DANGAR RATE MASTER', W/2, 17, {align:'center'});
      doc.setFontSize(7); doc.setTextColor(239,68,68);
      doc.text('CONFIDENTIAL', W-M, 17, {align:'right'});
    };
    const ftr = (pg, tot) => {
      doc.setDrawColor(226,232,240); doc.setLineWidth(0.4);
      doc.line(M, H-18, W-M, H-18);
      doc.setFont('NotoGujarati','normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Dangar Rate Master', M, H-9);
      doc.text('FY: ' + financialYear + '  |  Generated: ' + new Date().toLocaleString('en-IN'), W/2, H-9, {align:'center'});
      doc.text('Page ' + pg + ' of ' + tot, W-M, H-9, {align:'right'});
    };

    hdr();
    let y = 40;
    doc.setFont('NotoGujarati','normal'); doc.setFontSize(14); doc.setTextColor(...navy);
    doc.text('Year-Wise Dangar Rate Master', M, y);
    doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Financial Year: ' + financialYear + '  |  Items: ' + filteredItems.length + '  |  Generated: ' + new Date().toLocaleString('en-IN'), M, y+13);
    doc.setDrawColor(226,232,240); doc.setLineWidth(0.4); doc.line(M, y+18, W-M, y+18);
    y += 28;

    autoTable(doc, {
      startY: y,
      head: [['Item Name','SKU / Code','1st Class Rate','2nd Class Rate','3rd Class Rate']],
      body: filteredItems.map(item => {
        const rateObj = rates.find(r => r.item_id === item.id);
        return [
          item.item_name,
          item.item_code || '-',
          rateObj ? '\\u20B9' + parseFloat(rateObj.rate||0).toFixed(2) : '0.00',
          rateObj ? '\\u20B9' + parseFloat(rateObj.winter_rate||0).toFixed(2) : '0.00',
          rateObj ? '\\u20B9' + parseFloat(rateObj.summer_rate||0).toFixed(2) : '0.00'
        ];
      }),
      foot: [['', 'TOTAL ITEMS', filteredItems.length + ' Commodities', '', '']],
      styles: { font:'NotoGujarati', fontSize:7.5, cellPadding:[5,6], textColor:dark, lineColor:[226,232,240], lineWidth:0.3 },
      headStyles: { font:'NotoGujarati', fillColor:navy, textColor:white },
      footStyles: { font:'NotoGujarati', fillColor:[30,41,59], textColor:white },
      alternateRowStyles: { fillColor:stripe },
      theme: 'grid',
      margin: { left:M, right:M }
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i=1; i<=tot; i++) { doc.setPage(i); ftr(i,tot); }
    doc.save('Dangar_Rate_Master_FY' + financialYear.replace('-','_') + '.pdf');
  };
`;

    src = src.replace(
      'const filteredItems = items.filter(item =>',
      pdfFn + '\n   const filteredItems = items.filter(item =>'
    );

    // Add PDF button to PageHeader children - right before the search input div closing
    src = src.replace(
      `<div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2.5">
                   <Search size={15} className="text-slate-400" />`,
      `<button
               onClick={handleExportPDF}
               className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:border-slate-400 transition-all active:scale-95 shadow-sm"
            >
               <FileText size={15} /> Export PDF
            </button>
               <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2.5">
                   <Search size={15} className="text-slate-400" />`
    );

    fs.writeFileSync(fp, src, 'utf8');
    console.log('DangarRateMaster patched');
  } else {
    console.log('DangarRateMaster already patched');
  }
}

// ─── 3. DangarEntry — Add PDF export for the current entry slip ──────────────
{
  const fp = path.resolve('frontend/src/pages/DangarEntry.jsx');
  let src = fs.readFileSync(fp, 'utf8');

  if (!src.includes('handleExportSlipPDF')) {
    src = src.replace("import { useTranslation } from 'react-i18next';", pdfImports + "import { useTranslation } from 'react-i18next';");

    const pdfFn = `
  ${addGujaratiBody}
  const handleExportSlipPDF = async () => {
    const cName = company ? (company.company_name || 'Company') : 'Company';
    if (!formData.member_id || !formData.item_id) {
      alert('Please fill in the member and item first.');
      return;
    }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    await addGujaratiFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 40;
    const navy = [15,23,42], white = [255,255,255], gray = [100,116,139], dark = [30,41,59];

    // Header bar
    doc.setFillColor(...navy); doc.rect(0,0,W,30,'F');
    doc.setFont('NotoGujarati','normal'); doc.setFontSize(9); doc.setTextColor(...white);
    doc.text(cName.toUpperCase(), M, 20);
    doc.setFontSize(7.5); doc.setTextColor(148,163,184);
    doc.text('DANGAR ENTRY SLIP', W/2, 20, {align:'center'});
    doc.setFontSize(7); doc.setTextColor(239,68,68);
    doc.text('CONFIDENTIAL', W-M, 20, {align:'right'});

    // Title
    let y = 50;
    doc.setFont('NotoGujarati','normal'); doc.setFontSize(16); doc.setTextColor(...navy);
    doc.text('Dangar Entry Slip', M, y);
    doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text('SR: ' + (formData.srNo === 'AUTO' ? 'Auto-Generate' : '#' + formData.srNo) + '   |   Date: ' + new Date(formData.date).toLocaleDateString('en-GB') + '   |   Generated: ' + new Date().toLocaleString('en-IN'), M, y+14);
    doc.setDrawColor(226,232,240); doc.setLineWidth(0.5); doc.line(M, y+20, W-M, y+20);
    y += 32;

    const member = members.find(m => m.id === parseInt(formData.member_id));
    const item = items.find(i => i.id === parseInt(formData.item_id));

    // Member/Item Info row
    autoTable(doc, {
      startY: y,
      head: [['Field','Details','Field','Details']],
      body: [
        ['Member', member ? member.member_name + ' [' + member.member_code + ']' : '-', 'Item', item ? item.item_name : '-'],
        ['Book Type', formData.bookType, 'Quality Class', formData.quality_class + ' Class'],
        ['Vehicle No', formData.vehicleNo || '-', 'Season', (formData.season||'').toUpperCase()],
        ['Remark', formData.remark || '-', 'Date', new Date(formData.date).toLocaleDateString('en-GB')]
      ],
      styles: { font:'NotoGujarati', fontSize:8, cellPadding:[5,8], textColor:dark, lineColor:[226,232,240], lineWidth:0.3 },
      headStyles: { font:'NotoGujarati', fillColor:navy, textColor:white },
      alternateRowStyles: { fillColor:[248,250,252] },
      theme: 'grid', margin: { left:M, right:M }
    });

    y = doc.lastAutoTable.finalY + 16;

    // Weight/Calculation summary
    autoTable(doc, {
      startY: y,
      head: [['Measurement','Value']],
      body: [
        ['Total Gross KG', parseFloat(formData.total_kg||0).toFixed(2) + ' kg'],
        ['Bardan Bags', formData.returned_bags || 0],
        ['Gun Weight Deduction', parseFloat(formData.less_bardan||0).toFixed(2) + ' kg'],
        ['Net Quintal', parseFloat(formData.net_quintal||0).toFixed(2) + ' Qt'],
        ['Rate per Quintal', '\\u20B9' + parseFloat(formData.rate||0).toFixed(2)],
        ['Gross Amount', '\\u20B9' + parseFloat(formData.gross_amount||0).toLocaleString('en-IN', {minimumFractionDigits:2})],
        ['Total Deduction (Kapat)', '- \\u20B9' + parseFloat(formData.total_deduction||0).toLocaleString('en-IN', {minimumFractionDigits:2})],
        ['NET PAYABLE', '\\u20B9' + parseFloat(formData.amount||0).toLocaleString('en-IN', {minimumFractionDigits:2})]
      ],
      styles: { font:'NotoGujarati', fontSize:8, cellPadding:[5,8], textColor:dark, lineColor:[226,232,240], lineWidth:0.3 },
      headStyles: { font:'NotoGujarati', fillColor:navy, textColor:white },
      alternateRowStyles: { fillColor:[248,250,252] },
      bodyStyles: {},
      didParseCell: (data) => {
        if (data.row.index === 7) {
          data.cell.styles.fontStyle = 'normal';
          data.cell.styles.fillColor = navy;
          data.cell.styles.textColor = white;
        }
      },
      theme: 'grid', columnStyles: { 0: { cellWidth: 200 } },
      margin: { left:M, right:M }
    });

    // Footer
    const totPg = doc.internal.getNumberOfPages();
    for (let i=1; i<=totPg; i++) {
      doc.setPage(i);
      doc.setDrawColor(226,232,240); doc.setLineWidth(0.4);
      doc.line(M, H-18, W-M, H-18);
      doc.setFont('NotoGujarati','normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Dangar Entry', M, H-9);
      doc.text('Page ' + i + ' of ' + totPg, W-M, H-9, {align:'right'});
    }

    doc.save('Dangar_Slip_' + (formData.srNo !== 'AUTO' ? formData.srNo + '_' : '') + new Date().toISOString().split('T')[0] + '.pdf');
  };
`;

    src = src.replace(
      'const handleAddRow = () => {',
      pdfFn + '\n  const handleAddRow = () => {'
    );

    // Add button in the PageHeader (after the Reset button, before Save)
    src = src.replace(
      `<button
            onClick={resetForm}
            className="flex items-center gap-2 bg-white text-slate-600 px-5 py-3.5 rounded-lg text-xs font-black uppercase tracking-widest border border-slate-200 hover:border-slate-400 transition-all shadow-sm active:scale-95"
          >
            <X size={16} /> Reset
          </button>
          <button
            onClick={handleSave}`,
      `<button
            onClick={resetForm}
            className="flex items-center gap-2 bg-white text-slate-600 px-5 py-3.5 rounded-lg text-xs font-black uppercase tracking-widest border border-slate-200 hover:border-slate-400 transition-all shadow-sm active:scale-95"
          >
            <X size={16} /> Reset
          </button>
          <button
            onClick={handleExportSlipPDF}
            className="flex items-center gap-2 bg-white text-slate-600 px-5 py-3.5 rounded-lg text-xs font-black uppercase tracking-widest border border-slate-200 hover:border-slate-400 transition-all shadow-sm active:scale-95"
          >
            <FileText size={16} /> Export PDF
          </button>
          <button
            onClick={handleSave}`
    );

    fs.writeFileSync(fp, src, 'utf8');
    console.log('DangarEntry patched');
  } else {
    console.log('DangarEntry already patched');
  }
}

// ─── 4. ItemMaster — add report heading block before the table ───────────────
{
  const fp = path.resolve('frontend/src/pages/ItemMaster.jsx');
  let src = fs.readFileSync(fp, 'utf8');

  // Fix: add a styled section heading before the table card
  if (!src.includes('ITEM_MASTER_HEADING_INJECTED')) {
    src = src.replace(
      `{/* Table View */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6 min-h-[500px] flex flex-col">`,
      `{/* Table View */}
        {/* ITEM_MASTER_HEADING_INJECTED */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-0.5 flex items-center gap-1.5">
              <Shield size={10} /> Management / Inventory
            </p>
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase italic">Item Master Registry</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{filteredItems.length} Nomenclature Nodes · Status: {statusFilter.toUpperCase()}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6 min-h-[500px] flex flex-col">`
    );
    fs.writeFileSync(fp, src, 'utf8');
    console.log('ItemMaster heading injected');
  } else {
    console.log('ItemMaster heading already present');
  }
}

console.log('\nAll patches complete!');
