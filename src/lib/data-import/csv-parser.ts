/**
 * Robust RFC 4180 compliant CSV parser and serializer.
 * Supports UTF-8 (and BOM stripping), quoted fields with escaped quotes (""),
 * embedded newlines, embedded commas, and whitespace trimming.
 */

export interface CsvParseResult {
  headers: string[];
  rows: Array<{ rowIndex: number; raw: Record<string, string> }>;
  parseErrors: string[];
}

/**
 * Strips UTF-8 Byte Order Mark (BOM) if present.
 */
export function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

/**
 * Parse CSV string into an array of string arrays (rows).
 */
export function parseCsvRows(csvText: string): string[][] {
  const cleanText = stripBom(csvText);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = cleanText.length;

  while (i < len) {
    const char = cleanText[i];

    if (inQuotes) {
      if (char === '"') {
        // Look ahead for escaped double quote ("")
        if (i + 1 < len && cleanText[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        // Check for \r\n
        if (i + 1 < len && cleanText[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push last field & row if anything left
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Parses full CSV text into structured headers and records with 1-based row index.
 */
export function parseCsv(csvText: string): CsvParseResult {
  const allRows = parseCsvRows(csvText);
  const parseErrors: string[] = [];

  // Filter out completely empty lines
  const nonEmptyRows = allRows.filter((row) => row.some((cell) => cell.length > 0));

  if (nonEmptyRows.length === 0) {
    return {
      headers: [],
      rows: [],
      parseErrors: ['The CSV file is empty.'],
    };
  }

  const rawHeaders = nonEmptyRows[0];
  const headers = rawHeaders.map((h) => h.trim());

  // Check for duplicate headers
  const seenHeaders = new Set<string>();
  for (const h of headers) {
    if (seenHeaders.has(h)) {
      parseErrors.push(`Duplicate header found in CSV: "${h}".`);
    }
    seenHeaders.add(h);
  }

  const rows: Array<{ rowIndex: number; raw: Record<string, string> }> = [];

  for (let r = 1; r < nonEmptyRows.length; r++) {
    const rowValues = nonEmptyRows[r];
    const raw: Record<string, string> = {};

    headers.forEach((header, index) => {
      raw[header] = rowValues[index] !== undefined ? rowValues[index].trim() : '';
    });

    rows.push({
      rowIndex: r, // 1-based data row number
      raw,
    });
  }

  return {
    headers,
    rows,
    parseErrors,
  };
}

/**
 * Converts array of column names and sample row data to a downloadable CSV string.
 */
export function generateCsv(headers: string[], sampleRows: Record<string, string>[] = []): string {
  const escapeCell = (val: string | undefined | null): string => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [];
  lines.push(headers.map(escapeCell).join(','));

  for (const row of sampleRows) {
    const line = headers.map((h) => escapeCell(row[h] ?? '')).join(',');
    lines.push(line);
  }

  return lines.join('\r\n') + '\r\n';
}
