import * as XLSX from "xlsx";

export type SheetRow = Record<string, string>;

export type XLSXParseResult = {
  headers: string[];
  rows: SheetRow[];
};

export function parseXLSX(buffer: ArrayBuffer | Uint8Array): XLSXParseResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = wb.Sheets[sheetName];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });
  if (matrix.length === 0) return { headers: [], rows: [] };

  const [headerRow, ...dataRows] = matrix;
  const headers = (headerRow as unknown[]).map((h) => String(h ?? "").trim());

  const rows: SheetRow[] = dataRows
    .filter((r) => (r as unknown[]).some((cell) => String(cell ?? "").trim().length > 0))
    .map((r) => {
      const row: SheetRow = {};
      const arr = r as unknown[];
      for (let i = 0; i < headers.length; i++) {
        row[headers[i]] = String(arr[i] ?? "").trim();
      }
      return row;
    });

  return { headers, rows };
}

export function serializeXLSX(headers: string[], rows: SheetRow[], sheetName = "Sheet1"): Uint8Array {
  const data: (string | number)[][] = [headers];
  for (const row of rows) {
    data.push(headers.map((h) => row[h] ?? ""));
  }
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(out as ArrayBuffer);
}
