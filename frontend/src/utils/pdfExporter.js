import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import api from '../api';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export const toGujaratiDigits = (value) => {
  const GU = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
  return String(value ?? '').replace(/[0-9]/g, d => GU[d] || d);
};

export const safeReplaceSlash = (valStr) => {
  if (typeof valStr !== 'string') return valStr;
  return valStr.replace(/(<[^>]*>)|(\/)/g, (match, p1) =>
    p1 ? p1 : `<span style="font-family:Arial,sans-serif;font-weight:bold;">/</span>`
  );
};

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────
export const exportToPDF = async ({
  title,
  columns,
  rows,
  isGu = false,
  metaInfo = [],
  filename = 'Report.pdf',
  orientation = 'landscape',
  onStart = () => { },
  onComplete = () => { },
}) => {
  try {
    onStart();

    // ── 1. Load Gujarati font ──────────────────────────────────
    let PROMPT_FONT_BASE64 = '';
    try {
      const res = await fetch('/Prompt_base64.txt');
      if (res.ok) PROMPT_FONT_BASE64 = await res.text();
    } catch { /* silent */ }

    // ── 2. Company name ───────────────────────────────────────
    let companyName = isGu ? 'શ્રી રામદેવજી દંગાર ઉદ્યોગ' : 'SHREE RAMDEVJI DANGAR UDYOG';
    try {
      const r = await api.get('/company');
      if (r?.data?.success && r?.data?.data) {
        const c = r.data.data;
        companyName = isGu
          ? (c.company_name_gu || c.company_name || companyName)
          : (c.company_name || c.company_name_gu || companyName);
      }
    } catch { /* use default */ }

    // ── 3. Date / time ────────────────────────────────────────
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const HH = String(now.getHours()).padStart(2, '0');
    const MM = String(now.getMinutes()).padStart(2, '0');
    const SS = String(now.getSeconds()).padStart(2, '0');

    const datePlain = `${dd}/${mm}/${yyyy}`;
    const timePlain = `${HH}:${MM}:${SS}`;

    let dateDisplay = isGu
      ? safeReplaceSlash(`${toGujaratiDigits(dd)}/${toGujaratiDigits(mm)}/${toGujaratiDigits(yyyy)}`)
      : datePlain;
    let timeDisplay = isGu ? toGujaratiDigits(timePlain) : timePlain;

    const FY = localStorage.getItem('financialYear') || '2026-27';
    const fyDisplay = isGu ? toGujaratiDigits(FY) : FY;
    const fyLabel = isGu ? 'વર્ષ' : 'FY';
    const dateLabel = isGu ? 'તારીખ' : 'Date';

    // ── 4. Font stack ─────────────────────────────────────────
    const FONT_GU = `'Prompt','Noto Sans Gujarati',Arial,sans-serif`;
    const FONT_EN = `Arial,sans-serif`;
    const FONT_BODY = isGu ? FONT_GU : FONT_EN;

    const numCols = columns.length;
    const BORDER  = '1.5px solid #000000';
    const BORDER_THIN = '1px solid #dddddd';

    // ── 5. Build left meta string (e.g. "Period: ... | Total: ...") ──
    const metaParts = metaInfo.map(item => {
      let val = (item.value === undefined || item.value === null) ? '' : String(item.value);
      if (isGu) val = safeReplaceSlash(toGujaratiDigits(val));
      return `${item.label}: <strong>${val}</strong>`;
    });
    const metaLeftHTML = metaParts.join(`&nbsp;&nbsp;<span style="color:#aaa;">|</span>&nbsp;&nbsp;`);

    // ── 6. Column headers ─────────────────────────────────────
    const thHTML = columns.map(col => {
      const align = col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left';
      const w = col.width ? `width:${col.width};` : '';
      return `
        <td style="padding:0; border-right:${BORDER_THIN}; border-bottom:${BORDER}; ${w}">
          <div style="
            background:#f7f7f7;
            padding:9px 10px;
            font-family:${FONT_BODY};
            font-size:12px;
            font-weight:700;
            color:#111111;
            text-align:${align};
          ">${col.header}</div>
        </td>`;
    }).join('');

    // ── 7. Data rows ──────────────────────────────────────────
    const tdHTML = rows.map((row, idx) => {
      const cells = columns.map(col => {
        let val = '';
        if (col.render) val = col.render(row, idx);
        else if (col.key) val = row[col.key];
        else if (col.field) val = row[col.field];
        let display = (val === undefined || val === null) ? '' : String(val);
        if (isGu) display = safeReplaceSlash(display);

        const align = col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left';
        const cellFm = (col.usePromptFont && isGu) ? FONT_GU : FONT_BODY;

        return `
          <td style="padding:0; border-right:${BORDER_THIN}; border-bottom:${BORDER_THIN};">
            <div style="
              background:#ffffff;
              padding:8px 10px;
              font-family:${cellFm};
              font-size:12px;
              color:#222222;
              text-align:${align};
              line-height:1.4;
            ">${display}</div>
          </td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    // ── 8. Full HTML — matches the reference image layout ─────
    const html = `
      <table style="
        width:1200px;
        border-collapse:collapse;
        border:${BORDER};
        background:#ffffff;
        font-family:${FONT_BODY};
      ">
        <tbody>

          <!-- ══ ROW 1: Company Name ══ -->
          <tr>
            <td colspan="${numCols}" style="padding:0; border-bottom:${BORDER};">
              <div style="
                background:#ffffff;
                padding:18px 20px 14px 20px;
                text-align:center;
              ">
                <div style="
                  font-family:${FONT_BODY};
                  font-size:22px;
                  font-weight:700;
                  color:#111111;
                  letter-spacing:0.3px;
                ">${companyName}</div>
              </div>
            </td>
          </tr>

          <!-- ══ ROW 2: Report Title ══ -->
          <tr>
            <td colspan="${numCols}" style="padding:0; border-bottom:${BORDER};">
              <div style="
                background:#ffffff;
                padding:10px 20px;
                text-align:center;
              ">
                <div style="
                  font-family:${FONT_BODY};
                  font-size:13px;
                  font-weight:700;
                  color:#111111;
                  letter-spacing:0.8px;
                  text-transform:uppercase;
                ">${title}</div>
              </div>
            </td>
          </tr>

          <!-- ══ ROW 3: Meta / Date ══ -->
          <tr>
            <td colspan="${numCols}" style="padding:0; border-bottom:${BORDER};">
              <table style="width:100%; border-collapse:collapse;">
                <tr>
                  <!-- Left: meta info -->
                  <td style="padding:0;">
                    <div style="
                      background:#ffffff;
                      padding:9px 14px;
                      font-family:${FONT_BODY};
                      font-size:12px;
                      color:#333333;
                      font-weight:600;
                    ">${metaLeftHTML || '&nbsp;'}</div>
                  </td>
                  <!-- Right: date + FY -->
                  <td style="padding:0; text-align:right;">
                    <div style="
                      background:#ffffff;
                      padding:9px 14px;
                      font-family:${FONT_BODY};
                      font-size:12px;
                      color:#333333;
                      font-weight:600;
                      text-align:right;
                    ">
                      ${dateLabel}: <strong>${dateDisplay}</strong>
                      &nbsp;&nbsp;<span style="color:#aaa;">|</span>&nbsp;&nbsp;
                      ${fyLabel}: <strong>${fyDisplay}</strong>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ══ ROW 4: Column Headers ══ -->
          <tr>${thHTML}</tr>

          <!-- ══ ROW 5+: Data ══ -->
          ${tdHTML}

          <!-- ══ Footer Row ══ -->
          <tr>
            <td colspan="${numCols}" style="padding:0; border-top:${BORDER};">
              <table style="width:100%; border-collapse:collapse;">
                <tr>
                  <td style="padding:0;">
                    <div style="
                      background:#f7f7f7;
                      padding:8px 14px;
                      font-family:${FONT_BODY};
                      font-size:9px;
                      color:#666666;
                      font-weight:600;
                    ">${companyName} &nbsp;&bull;&nbsp; ${title}</div>
                  </td>
                  <td style="padding:0; text-align:right;">
                    <div style="
                      background:#f7f7f7;
                      padding:8px 14px;
                      text-align:right;
                      font-family:${FONT_BODY};
                      font-size:9px;
                      color:#666666;
                      font-weight:600;
                    ">${dateLabel}: ${dateDisplay} &nbsp; ${timeDisplay} &nbsp;&bull;&nbsp; ${fyLabel}: ${fyDisplay}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </tbody>
      </table>
    `;

    // ── 9. Off-screen container ───────────────────────────────
    const wrap = document.createElement('div');
    wrap.style.position = 'absolute';
    wrap.style.left = '-9999px';
    wrap.style.top = '-9999px';
    wrap.style.width = '1200px';
    wrap.style.minWidth = '1200px';
    wrap.style.maxWidth = '1200px';
    wrap.style.background = '#ffffff';
    wrap.style.padding = '0';
    wrap.style.margin = '0';
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    // Wait for fonts & layout
    await new Promise(r => setTimeout(r, 500));

    // ── 10. html2canvas ───────────────────────────────────────
    const canvas = await html2canvas(wrap, {
      scale: 2.5,
      width: 1200,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
    });

    document.body.removeChild(wrap);

    // ── 11. Slice into A4 pages ───────────────────────────────
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const imgW = pageW - margin * 2;
    const sliceH = ((pageH - margin * 2) * canvas.width) / imgW;

    let y = 0, page = 0;
    while (y < canvas.height) {
      const h = Math.min(sliceH, canvas.height - y);
      const pc = document.createElement('canvas');
      pc.width = canvas.width;
      pc.height = h;
      const ctx = pc.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pc.width, pc.height);
      ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);

      const imgData = pc.toDataURL('image/png');
      const imgH = (h * imgW) / canvas.width;
      if (page > 0) doc.addPage();
      doc.addImage(imgData, 'PNG', margin, margin, imgW, imgH);
      y += h;
      page++;
    }

    doc.save(filename);
    onComplete();

  } catch (err) {
    console.error('PDF export failed:', err);
    onComplete();
    throw err;
  }
};