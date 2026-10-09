/**
 * A .xlsx writer with no dependencies.
 *
 * Why hand-rolled: this app ships as ONE self-contained HTML file (see
 * `vite-plugin-singlefile` in vite.config.ts) and is opened straight off a disk with
 * no server behind it. Pulling in a sheet library would add a few hundred kilobytes
 * to that file for a feature used once a week, and pulling one from a CDN would break
 * the app's one hard promise — that nothing leaves the machine.
 *
 * An .xlsx is a ZIP of XML parts, and the ZIP spec allows entries to be STORED
 * (uncompressed). So the whole format is reachable in ~200 lines: build the six XML
 * parts, wrap them in a stored zip, hand the browser a Blob. Excel, Numbers, Google
 * Sheets and LibreOffice all open it.
 *
 * What is supported, deliberately: text, numbers, booleans, blank cells, a frozen
 * header row, an auto-filter, column widths, wrapped body text, and a styled header.
 * That is every shape this app's data has. Formulas, charts and multi-format cells are
 * not here because nothing in the export needs them.
 */

export type CellValue = string | number | boolean | null | undefined;

export interface SheetColumn {
  header: string;
  /** Character width. Excel's own default is 8.43. */
  width?: number;
}

export interface Sheet {
  /** Excel caps sheet names at 31 characters and forbids []:*?/\ — both are handled. */
  name: string;
  columns: SheetColumn[];
  rows: CellValue[][];
}

/* ------------------------------------------------------------------ xml ----- */

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Control characters are illegal in XML 1.0 and Excel refuses the whole file if
    // one survives — pasted chat logs are exactly where those show up.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/** A1, B1 … Z1, AA1 — the reference Excel wants on every cell. */
function colRef(index: number): string {
  let n = index + 1;
  let ref = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    ref = String.fromCharCode(65 + rem) + ref;
    n = Math.floor((n - 1) / 26);
  }
  return ref;
}

function cellXml(value: CellValue, rowIndex: number, colIndex: number): string {
  const ref = `${colRef(colIndex)}${rowIndex}`;
  if (value === null || value === undefined || value === "") return `<c r="${ref}" s="2"/>`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}" s="2"><v>${value}</v></c>`;
  }
  if (typeof value === "boolean") {
    return `<c r="${ref}" s="2" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  // Inline strings rather than a shared-string table: one less part, and the file
  // stays readable when someone unzips it to see what the app actually exported.
  return `<c r="${ref}" s="2" t="inlineStr"><is><t xml:space="preserve">${esc(String(value))}</t></is></c>`;
}

function sheetXml(sheet: Sheet): string {
  const cols = sheet.columns
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width ?? 18}" customWidth="1"/>`)
    .join("");
  const head = sheet.columns.map((c, i) => `<c r="${colRef(i)}1" s="1" t="inlineStr"><is><t>${esc(c.header)}</t></is></c>`).join("");
  const body = sheet.rows
    .map((row, r) => `<row r="${r + 2}">${row.map((v, c) => cellXml(v, r + 2, c)).join("")}</row>`)
    .join("");
  const lastCol = colRef(Math.max(0, sheet.columns.length - 1));
  const lastRow = sheet.rows.length + 1;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData><row r="1" ht="22">${head}</row>${body}</sheetData>
<autoFilter ref="A1:${lastCol}${Math.max(lastRow, 1)}"/>
</worksheet>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
<font><sz val="11"/><color rgb="FF121118"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF4C1D95"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD7D4DE"/></left><right style="thin"><color rgb="FFD7D4DE"/></right><top style="thin"><color rgb="FFD7D4DE"/></top><bottom style="thin"><color rgb="FFD7D4DE"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const RELS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const DOC_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

/** Excel's own rules, enforced rather than trusted: bad names reject the file. */
function safeSheetName(raw: string, taken: Set<string>): string {
  let name = String(raw || "Sheet")
    .replace(/[[\]:*?/\\]/g, " ")
    .trim()
    .slice(0, 31);
  if (!name) name = "Sheet";
  let candidate = name;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    const suffix = ` (${n++})`;
    candidate = name.slice(0, 31 - suffix.length) + suffix;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

function workbookXml(names: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${DOC_REL}">
<sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>
</workbook>`;
}

function workbookRelsXml(count: number): string {
  const sheets = Array.from({ length: count }, (_, i) => `<Relationship Id="rId${i + 1}" Type="${DOC_REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${RELS_NS}">${sheets}<Relationship Id="rId${count + 1}" Type="${DOC_REL}/styles" Target="styles.xml"/></Relationships>`;
}

function contentTypesXml(count: number): string {
  const sheets = Array.from(
    { length: count },
    (_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheets}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${DOC_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

/* ------------------------------------------------------------------ zip ----- */

let crcTable: Int32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[i] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function dosStamp(date = new Date()): { time: number; date: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

class ByteSink {
  private chunks: Uint8Array[] = [];
  length = 0;
  push(bytes: Uint8Array) {
    this.chunks.push(bytes);
    this.length += bytes.length;
  }
  u16(value: number) {
    this.push(new Uint8Array([value & 0xff, (value >>> 8) & 0xff]));
  }
  u32(value: number) {
    this.push(new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]));
  }
  bytes(value: Uint8Array) {
    this.push(value);
  }
  toBlob(type: string): Blob {
    return new Blob(this.chunks as BlobPart[], { type });
  }
}

const encoder = new TextEncoder();

/** Method 0 (stored): no compressor needed, and Excel reads it happily. */
function zipEntries(files: { name: string; data: Uint8Array }[]): Blob {
  const stamp = dosStamp();
  const out = new ByteSink();
  const central: { name: Uint8Array; crc: number; size: number; offset: number }[] = [];

  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const offset = out.length;
    out.u32(0x04034b50);
    out.u16(20);
    out.u16(0x0800); // UTF-8 names
    out.u16(0); // stored
    out.u16(stamp.time);
    out.u16(stamp.date);
    out.u32(crc);
    out.u32(file.data.length);
    out.u32(file.data.length);
    out.u16(name.length);
    out.u16(0);
    out.bytes(name);
    out.bytes(file.data);
    central.push({ name, crc, size: file.data.length, offset });
  }

  const centralStart = out.length;
  for (const entry of central) {
    out.u32(0x02014b50);
    out.u16(20);
    out.u16(20);
    out.u16(0x0800);
    out.u16(0);
    out.u16(stamp.time);
    out.u16(stamp.date);
    out.u32(entry.crc);
    out.u32(entry.size);
    out.u32(entry.size);
    out.u16(entry.name.length);
    out.u16(0);
    out.u16(0);
    out.u16(0);
    out.u16(0);
    out.u32(0);
    out.u32(entry.offset);
    out.bytes(entry.name);
  }
  const centralSize = out.length - centralStart;

  out.u32(0x06054b50);
  out.u16(0);
  out.u16(0);
  out.u16(central.length);
  out.u16(central.length);
  out.u32(centralSize);
  out.u32(centralStart);
  out.u16(0);

  return out.toBlob("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

/* -------------------------------------------------------------- public ----- */

/**
 * Build the workbook. Sheets with no columns are dropped, and an empty workbook is
 * still written with one empty sheet, because a zip with no worksheet part is a file
 * Excel refuses to open.
 */
export function buildWorkbook(sheets: Sheet[]): Blob {
  const usable = sheets.filter((s) => s.columns.length > 0);
  const list = usable.length ? usable : [{ name: "Sheet1", columns: [{ header: "No data" }], rows: [] as CellValue[][] }];
  const taken = new Set<string>();
  const names = list.map((s) => safeSheetName(s.name, taken));

  const files = [
    { name: "[Content_Types].xml", data: encoder.encode(contentTypesXml(list.length)) },
    { name: "_rels/.rels", data: encoder.encode(ROOT_RELS_XML) },
    { name: "xl/workbook.xml", data: encoder.encode(workbookXml(names)) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(workbookRelsXml(list.length)) },
    { name: "xl/styles.xml", data: encoder.encode(STYLES_XML) },
    ...list.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: encoder.encode(sheetXml(sheet)) })),
  ];
  return zipEntries(files);
}

/** Save the workbook. Mirrors `downloadJson` so both exports feel the same. */
export function downloadWorkbook(sheets: Sheet[], filename: string): void {
  const url = URL.createObjectURL(buildWorkbook(sheets));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
