const fs = require('fs');

function processFile(path, replacements) {
    let content = fs.readFileSync(path, 'utf8');
    replacements.forEach(([oldS, newS]) => {
        content = content.split(oldS).join(newS);
    });
    fs.writeFileSync(path, content);
    console.log('Processed ' + path);
}

// AccountLedger.jsx
processFile('d:\\Danger Systeam\\frontend\\src\\pages\\AccountLedger.jsx', [
    ['text-[11px]', 'text-sm'],
    ['uppercase tracking-tight', ''],
    ['font-sans font-bold italic', 'font-sans font-bold'],
    ['font-black text-xs italic', 'font-bold text-sm'],
    ['text-xs font-bold text-zinc-700 uppercase tracking-wider', 'text-sm font-bold text-zinc-700'],
    ['font-bold text-zinc-700 text-xs', 'font-bold text-zinc-700 text-sm']
]);

// SabhasadLedgerSummary.jsx
processFile('d:\\Danger Systeam\\frontend\\src\\pages\\SabhasadLedgerSummary.jsx', [
    ['text-[10px]', 'text-sm'],
    ['text-[9px] font-bold text-zinc-500 uppercase tracking-widest', 'text-[11px] font-bold text-zinc-500'],
    ['font-bold text-zinc-700 group-hover:text-blue-600 transition-colors uppercase', 'font-bold text-zinc-700 group-hover:text-blue-600 transition-colors']
]);

// Village.jsx
processFile('d:\\Danger Systeam\\frontend\\src\\pages\\Village.jsx', [
    ['text-xs', 'text-sm'],
    ['font-sans font-bold tracking-tight text-zinc-800 uppercase', 'font-sans font-bold text-zinc-800']
]);

// UserMaster.jsx
processFile('d:\\Danger Systeam\\frontend\\src\\pages\\UserMaster.jsx', [
    ['text-[11px]', 'text-sm'],
    ['text-xs', 'text-sm'],
    ['font-bold text-zinc-800 uppercase tracking-tight mb-2', 'font-bold text-zinc-800 mb-2'],
    ['font-bold text-zinc-800', 'font-bold text-zinc-800'] // Already exists, just to be sure
]);

console.log('All tables updated for clarity.');
