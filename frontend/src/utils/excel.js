// Excel / CSV: exports and the lead sheet reader (SheetJS, same version the HTML portal loads).
// SheetJS is loaded on first use, so it stays out of the main bundle.
import { last10 } from './format';
import { notify } from './notify';

let xlsxPromise = null;
function loadXlsx() {
  if (!xlsxPromise) xlsxPromise = import('xlsx').catch((e) => { xlsxPromise = null; throw e; });
  return xlsxPromise;
}

export async function exportRows(rows, sheetName, fileName) {
  if (!rows.length) { notify('NOTHING TO EXPORT'); return; }
  let XLSX;
  try { XLSX = await loadXlsx(); } catch { notify('⚠️ EXPORT LIBRARY NOT LOADED'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
  notify(`EXPORTED ${rows.length} ROWS`);
}

export async function downloadLeadTemplate() {
  let XLSX;
  try { XLSX = await loadXlsx(); } catch { notify('⚠️ EXCEL LIBRARY NOT LOADED'); return; }
  const ws = XLSX.utils.aoa_to_sheet([['Name', 'Phone', 'Notes']]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  XLSX.writeFile(wb, 'lead-upload-template.xlsx');
}

function pickColumn(row, patterns) {
  const keys = Object.keys(row);
  for (const re of patterns) {
    const k = keys.find(key => re.test(key.trim()));
    if (k !== undefined && String(row[k]).trim() !== '') return String(row[k]).trim();
  }
  return '';
}

function firstPersonValue(row) {
  for (const key of Object.keys(row)) {
    const header = key.trim().toLowerCase();
    const value = String(row[key] || '').trim();
    if (value && !/phone|mobile|number|contact\s*no|notes?|remark|comment/i.test(header) && !last10(value)) return value;
  }
  return '';
}

function parseHeaderlessSheet(XLSX, sheet) {
  return XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '', header: 1 })
    .map(values => {
      const cells = values.map(value => String(value || '').trim()).filter(Boolean);
      const phone = cells.find(value => last10(value)) || '';
      const name = cells.find(value => value !== phone && !last10(value)) || '';
      const details = cells.filter(value => value !== name && value !== phone).join(' · ');
      return { name, phone, notes: details };
    })
    .filter(row => row.name || row.phone || row.notes);
}

// Resolves to [{ name, phone, notes }] — rejects when the file cannot be parsed
export async function readLeadSheet(file) {
  let XLSX;
  try { XLSX = await loadXlsx(); } catch (e) { notify('⚠️ EXCEL LIBRARY NOT LOADED'); throw e; }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        // raw:false keeps phone numbers as the text shown in the sheet (no 9.8E+09 / lost leading digits)
        const json = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
        const headers = Object.keys(json[0] || {});
        const hasKnownHeader = headers.some(key => /name|phone|mobile|number|contact\s*no|notes?|remark|comment/i.test(key.trim()));
        resolve(hasKnownHeader ? json.map(r => ({
          name: pickColumn(r, [/^name$/i, /lead\s*name/i, /company/i, /contact\s*name/i, /^contact$/i, /name/i]) || firstPersonValue(r),
          phone: pickColumn(r, [/^phone$/i, /mobile/i, /phone/i, /number/i, /contact\s*no/i]),
          notes: pickColumn(r, [/^notes?$/i, /remark/i, /comment/i]),
        })) : parseHeaderlessSheet(XLSX, sheet));
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
