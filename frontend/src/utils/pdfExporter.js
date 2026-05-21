import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import api from '../api';


export const toGujaratiDigits = (value) => {
  const guDigits = {
    '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
    '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
  };
  return String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d);
};

export const safeReplaceSlash = (valStr) => {
  if (typeof valStr !== 'string') return valStr;
  return valStr.replace(/(<[^>]*>)|(\/)/g, (match, p1) =>
    p1 ? p1 : `<span style="font-family: Arial, sans-serif; font-weight: bold; margin: 0 1px;">/</span>`
  );
};


export const exportToPDF = async ({
  title,
  columns,
  rows,
  isGu = false,
  metaInfo = [],
  filename = 'Report.pdf',
  orientation = 'landscape',
  onStart = () => { },
  onComplete = () => { }
}) => {
  try {
    onStart();

    // Fetch the base64 font from server at runtime to avoid code bloat & token limits
    let PROMPT_FONT_BASE64 = '';
    try {
      const fontRes = await fetch('/Prompt_base64.txt');
      if (fontRes.ok) {
        PROMPT_FONT_BASE64 = await fontRes.text();
      }
    } catch (e) {
      console.warn('Failed to load Prompt base64 font from server', e);
    }

    // 1. Fetch Company Name dynamically from database with fallback to localStorage and static defaults
    let companyName = isGu ? 'શ્રી રામદેવજી દંગાર ઉદ્યોગ' : 'SHREE RAMDEVJI DANGAR UDYOG';
    try {
      const response = await api.get('/company');
      if (response?.data?.success && response?.data?.data) {
        const comp = response.data.data;
        companyName = isGu
          ? (comp.company_name_gu || comp.company_name || companyName)
          : (comp.company_name || comp.company_name_gu || companyName);
      }
    } catch (e) {
      console.warn('Failed to fetch company name from DB in PDF exporter, using fallback.', e);
      const savedCompany = localStorage.getItem('companyName');
      if (savedCompany) {
        companyName = savedCompany;
      }
    }

    const currentDate = new Date();

    // Formatting standard date & time
    const day = String(currentDate.getDate()).padStart(2, '0');
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const year = currentDate.getFullYear();
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');

    const timeStr = `${hours}:${minutes}:${seconds}`;
    const cleanDateVal = isGu
      ? `${toGujaratiDigits(day)}/${toGujaratiDigits(month)}/${toGujaratiDigits(year)} ${toGujaratiDigits(timeStr)}`
      : `${day}/${month}/${year} ${timeStr}`;

    let cleanDateStr = cleanDateVal;
    if (isGu) {
      cleanDateStr = safeReplaceSlash(cleanDateVal);
    }

    const academicYear = localStorage.getItem('financialYear') || '2026-27';
    const formattedFY = academicYear ? (isGu ? `વર્ષ: ${toGujaratiDigits(academicYear)}` : `FY: ${academicYear}`) : '';

    // Build metaInfo items HTML
    const metaInfoItems = [];
    metaInfo.forEach(item => {
      const valStr = item.value === undefined || item.value === null ? '' : item.value;
      let displayVal = valStr;

      if (isGu) {
        if (typeof valStr === 'number') {
          displayVal = toGujaratiDigits(valStr);
        } else if (typeof valStr === 'string') {
          displayVal = toGujaratiDigits(valStr);
          displayVal = safeReplaceSlash(displayVal);
        }
      }

      metaInfoItems.push(`<span>${item.label}: ${displayVal}</span>`);
    });

    const leftMetaHTML = metaInfoItems.join('<span style="margin: 0 8px; font-weight: normal; color: #000000;">|</span>');

    // Right side: Date and Financial Year
    const rightMetaItems = [];
    rightMetaItems.push(`<span>${isGu ? 'તારીખ' : 'Date'}: ${cleanDateStr}</span>`);
    if (formattedFY) {
      rightMetaItems.push(`<span>${formattedFY}</span>`);
    }
    const rightMetaHTML = rightMetaItems.join('<span style="margin: 0 8px; font-weight: normal; color: #000000;">|</span>');

    const metaRowsHTML = `
      <table class="pdf-meta-table" style="width: 100%; border-collapse: collapse; border-bottom: 1.5px solid #000000; background: #ffffff; color: #000000; margin: 0; padding: 0;">
        <tr>
          <td style="padding: 6px 12px; font-size: 11px; font-weight: bold; text-align: left; border: none !important; font-family: ${isGu ? `'Prompt', 'Noto Sans Gujarati', sans-serif` : `'Outfit', Arial, sans-serif`}; line-height: 1.4;">
            <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
              ${leftMetaHTML}
            </div>
          </td>
          <td style="padding: 6px 12px; font-size: 11px; font-weight: bold; text-align: right; border: none !important; font-family: ${isGu ? `'Prompt', 'Noto Sans Gujarati', sans-serif` : `'Outfit', Arial, sans-serif`}; line-height: 1.4;">
            <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center; justify-content: flex-end;">
              ${rightMetaHTML}
            </div>
          </td>
        </tr>
      </table>
    `;

    // Table headers mapping
    const tableHeaderHTML = columns.map(col => {
      const alignStyle = col.align === 'right' ? 'text-align: right;' : (col.align === 'center' ? 'text-align: center;' : 'text-align: left;');
      const widthStyle = col.width ? `width: ${col.width};` : '';
      const headerFontStyle = isGu ? `font-family: 'Prompt', 'Noto Sans Gujarati', sans-serif; font-size: 11px;` : `font-family: 'Outfit', Arial, sans-serif; font-size: 11.5px;`;
      return `
        <th style="padding: 6px 8px; border: 1.5px solid #000000; font-weight: bold; background-color: #ffffff; color: #000000; ${alignStyle} ${widthStyle} ${headerFontStyle}">
          ${col.header}
        </th>
      `;
    }).join('');

    // Table rows mapping
    const tableRowsHTML = rows.map((row, idx) => {
      const cellsHTML = columns.map(col => {
        let val = '';
        if (col.render) {
          val = col.render(row, idx);
        } else if (col.key) {
          val = row[col.key];
        } else if (col.field) {
          val = row[col.field];
        }

        const alignStyle = col.align === 'center' ? 'text-align: center;' : (col.align === 'right' ? 'text-align: right;' : 'text-align: left;');

        let displayVal = val === undefined || val === null ? '' : String(val);

        // Wrap date slash or metadata slash character for Gujarati date preservation
        if (isGu) {
          displayVal = safeReplaceSlash(displayVal);
        }

        const cellFontStyle = isGu ? `font-family: 'Prompt', 'Noto Sans Gujarati', sans-serif; font-size: 10px;` : `font-family: 'Outfit', Arial, sans-serif; font-size: 11px;`;

        return `
          <td style="padding: 6px 8px; border: 1.5px solid #000000; ${alignStyle} ${cellFontStyle}">
            ${displayVal}
          </td>
        `;
      }).join('');

      return `<tr>${cellsHTML}</tr>`;
    }).join('');

    // 2. Offscreen rendering element setup
    const tempWrap = document.createElement('div');
    tempWrap.style.position = 'absolute';
    tempWrap.style.left = '-9999px';
    tempWrap.style.top = '-9999px';
    tempWrap.style.width = '1200px';
    tempWrap.style.minWidth = '1200px';
    tempWrap.style.maxWidth = '1200px';
    tempWrap.style.padding = '0';
    tempWrap.style.margin = '0';
    tempWrap.style.boxSizing = 'border-box';
    const numCols = columns.length;

    // Set inside wrapper
    tempWrap.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&family=Outfit:wght@400;600;700&display=swap');
        
        @font-face {
          font-family: 'Prompt';
          src: url('data:font/ttf;base64,${PROMPT_FONT_BASE64}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }

        .pdf-report-table {
          width: 100% !important;
          min-width: 100% !important;
          max-width: 100% !important;
          border-collapse: collapse !important;
          border: 1.5px solid #000000 !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          font-family: ${isGu ? `'Prompt', 'Noto Sans Gujarati', sans-serif` : `'Outfit', Arial, sans-serif`} !important;
          box-sizing: border-box !important;
          table-layout: fixed !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .pdf-report-table tr {
          display: table-row !important;
        }

        .pdf-report-table th, 
        .pdf-report-table td {
          display: table-cell !important;
          border: 1.5px solid #000000 !important;
          box-sizing: border-box !important;
        }

        .pdf-header-company {
          text-align: center !important;
          font-size: 18px !important;
          font-weight: bold !important;
          font-family: 'Prompt', 'Noto Sans Gujarati', 'Outfit', sans-serif !important;
          padding: 10px 12px !important;
          border: 1.5px solid #000000 !important;
        }

        .pdf-header-title {
          text-align: center !important;
          font-size: 14px !important;
          font-weight: bold !important;
          font-family: ${isGu ? `'Prompt', 'Noto Sans Gujarati', sans-serif` : `'Outfit', Arial, sans-serif`} !important;
          padding: 8px 12px !important;
          border: 1.5px solid #000000 !important;
        }

        .pdf-meta-td {
          padding: 6px 12px !important;
          font-size: 11px !important;
          font-weight: bold !important;
          font-family: ${isGu ? `'Prompt', 'Noto Sans Gujarati', sans-serif` : `'Outfit', Arial, sans-serif`} !important;
          border: 1.5px solid #000000 !important;
        }
      </style>
      <table class="pdf-report-table">
        <tbody>
          <!-- Row 1: Company Header -->
          <tr>
            <td colspan="${numCols}" class="pdf-header-company">
              ${companyName}
            </td>
          </tr>
          
          <!-- Row 2: Report Title -->
          <tr>
            <td colspan="${numCols}" class="pdf-header-title">
              ${title}
            </td>
          </tr>
          
          <!-- Row 3: Metadata Info -->
          <tr>
            <td colspan="${numCols}" class="pdf-meta-td">
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
                  ${leftMetaHTML}
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center; justify-content: flex-end;">
                  ${rightMetaHTML}
                </div>
              </div>
            </td>
          </tr>

          <!-- Table Header -->
          <tr style="background-color: #ffffff;">
            ${tableHeaderHTML}
          </tr>

          <!-- Table Body Data -->
          ${tableRowsHTML}
        </tbody>
      </table>
    `;

    document.body.appendChild(tempWrap);

    // Wait for fonts to load and rendering engine to prepare
    await new Promise(resolve => setTimeout(resolve, 300));

    // 3. Render DOM wrapper to canvas
    const canvas = await html2canvas(tempWrap, {
      scale: 2.5, // 2.5x scale for high resolution print without bloating the file size
      width: 1200, // force captured canvas width to be exactly 1200px
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false
    });

    // Clean up DOM wrapper
    document.body.removeChild(tempWrap);

    // 4. Create jsPDF and slice canvas to A4 pages
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 24;
    const imgW = pageW - margin * 2;
    const pageHpx = ((pageH - margin * 2) * canvas.width) / imgW;

    let y = 0;
    let pageIndex = 0;

    while (y < canvas.height) {
      const sliceHeight = Math.min(pageHpx, canvas.height - y);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      const imgData = pageCanvas.toDataURL('image/png');
      const imgH = (sliceHeight * imgW) / canvas.width;

      if (pageIndex > 0) {
        doc.addPage();
      }
      doc.addImage(imgData, 'PNG', margin, margin, imgW, imgH);

      y += sliceHeight;
      pageIndex += 1;
    }

    // 5. Save the generated PDF file
    doc.save(filename);
    onComplete();
  } catch (error) {
    console.error('PDF export failed:', error);
    onComplete();
    throw error;
  }
};
