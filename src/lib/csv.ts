export type CSVRow = Record<string, string>;

export type CSVParseResult = {
  headers: string[];
  rows: CSVRow[];
};

export function parseCSV(input: string): CSVParseResult {
  const text = input.replace(/^\uFEFF/, "");
  const cells = tokenize(text);
  if (cells.length === 0) return { headers: [], rows: [] };

  const [headerRow, ...dataRows] = cells;
  const headers = headerRow.map((h) => h.trim());

  const rows: CSVRow[] = dataRows
    .filter((r) => r.some((cell) => cell.trim().length > 0))
    .map((r) => {
      const row: CSVRow = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i]] = (r[i] ?? "").trim();
      }
      return row;
    });

  return { headers, rows };
}

export function serializeCSV(headers: string[], rows: CSVRow[]): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCell).join(","));
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h] ?? "")).join(","));
  }
  return lines.join("\r\n");
}

function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function tokenize(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    cell += ch;
    i++;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}
