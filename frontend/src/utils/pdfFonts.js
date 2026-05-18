import { jsPDF } from 'jspdf';

let cachedFont = null;
let cachedFontPromise = null;

const FONT_URLS = [
    'fonts/NotoSansGujarati-Regular.ttf',
    './fonts/NotoSansGujarati-Regular.ttf',
    '/fonts/NotoSansGujarati-Regular.ttf',
];

const readBlobAsBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(new Error('Failed to read font blob'));
    reader.readAsDataURL(blob);
});

const loadFontBase64 = async () => {
    for (const fontUrl of FONT_URLS) {
        try {
            const res = await fetch(fontUrl, { cache: 'force-cache' });
            if (!res.ok) continue;

            const blob = await res.blob();
            const base64 = await readBlobAsBase64(blob);
            if (base64) return base64;
        } catch (e) {
            // Try the next URL fallback
        }
    }

    throw new Error('Font file not found');
};

/**
 * Adds Prompt legacy font support to a jsPDF document
 */
export const addPromptFont = async (doc) => {
    try {
        const res = await fetch('/fonts/Prompt.ttf');
        const blob = await res.blob();
        const base64 = await readBlobAsBase64(blob);
        
        doc.addFileToVFS('Prompt.ttf', base64);
        doc.addFont('Prompt.ttf', 'Prompt', 'normal');
        doc.setFont('Prompt');
        return doc;
    } catch (e) {
        console.warn('Could not load Prompt font for PDF', e);
        return doc;
    }
};

/**
 * Adds Gujarati font support to a jsPDF document
 * @param {jsPDF} doc The jsPDF instance
 */
export const addGujaratiFont = async (doc) => {
    try {
        if (!cachedFont) {
            if (!cachedFontPromise) {
                cachedFontPromise = loadFontBase64().then((fontData) => {
                    cachedFont = fontData;
                    return fontData;
                }).finally(() => {
                    cachedFontPromise = null;
                });
            }

            await cachedFontPromise;
        }
        
        doc.addFileToVFS('NotoSansGujarati.ttf', cachedFont);
        doc.addFont('NotoSansGujarati.ttf', 'NotoGujarati', 'normal');
        doc.addFont('NotoSansGujarati.ttf', 'NotoGujarati', 'bold');
        
        // Set default font
        doc.setFont('NotoGujarati');
        
        return doc;
    } catch (e) {
        console.warn('Could not load Gujarati font for PDF', e);
        return doc;
    }
};

/**
 * Creates a new jsPDF instance pre-configured with Gujarati support
 */
export const createGujaratiPDF = async (options = { orientation: 'portrait', unit: 'pt', format: 'a4' }) => {
    const doc = new jsPDF(options);
    await addGujaratiFont(doc);
    return doc;
};
