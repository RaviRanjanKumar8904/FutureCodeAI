import Papa from 'papaparse';
import toast from 'react-hot-toast';

/**
 * Shared CSV Export Function
 * Converts JSON objects to CSV, triggers browser download, and displays notification.
 */
export function exportCSV<T extends Record<string, any>>(
  filename: string,
  data: T[],
  options?: { notify?: boolean; successMessage?: string }
): void {
  if (!data || data.length === 0) {
    toast.error('No records available to export.');
    return;
  }

  try {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    a.href = url;
    a.download = cleanFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (options?.notify !== false) {
      toast.success(options?.successMessage || `${data.length} records exported successfully!`);
    }
  } catch (error) {
    console.error('[CSV Export Error]:', error);
    toast.error('Failed to export CSV file.');
  }
}

/**
 * Shared CSV Template Downloader
 */
export function downloadTemplateCSV(
  filename: string,
  headers: string[],
  sampleRows: (string | number)[][] = []
): void {
  try {
    const csv = Papa.unparse({ fields: headers, data: sampleRows });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    a.href = url;
    a.download = cleanFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV template downloaded!');
  } catch (error) {
    console.error('[CSV Template Error]:', error);
    toast.error('Failed to download template.');
  }
}

/**
 * Shared CSV Parser Function
 * Wraps PapaParse with standardized configuration and error handling.
 */
export function parseCSV<T = Record<string, any>>(
  file: File,
  onComplete: (rows: T[]) => void,
  onError?: (err: Error) => void
): void {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    transformHeader: header => header.trim(),
    complete: results => {
      const rows = (results.data as T[]) || [];
      if (rows.length === 0) {
        toast.error('The selected CSV file is empty.');
        if (onError) onError(new Error('Empty CSV file'));
        return;
      }
      onComplete(rows);
    },
    error: (err: Error) => {
      console.error('[CSV Parse Error]:', err);
      toast.error(`CSV Parsing error: ${err.message}`);
      if (onError) onError(err);
    }
  });
}

/**
 * Smart Multi-Alias Header Resolver
 * Matches fields against multiple case-insensitive header synonyms (e.g. Google Forms / Excel exports)
 */
export function resolveHeaderValue(
  row: Record<string, any>,
  aliases: string[],
  defaultValue = ''
): string {
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const normalizedAlias = alias.toLowerCase().trim();
    const matchedKey = rowKeys.find(k => k.toLowerCase().trim() === normalizedAlias);
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
      const val = String(row[matchedKey]).trim();
      if (val) return val;
    }
  }
  return defaultValue;
}
