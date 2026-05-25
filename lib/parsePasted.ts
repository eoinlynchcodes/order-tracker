export type ParsedItem = {
  quantity: number;
  code: string | null;
  name: string;
};

export type ParseResult = {
  items: ParsedItem[];
  warnings: string[];
};

const HEADER_PATTERNS = {
  qty: /^(qty|quantity|qnty)$/i,
  code: /^(product\s*id|product\s*code|code|sku|item\s*id|item\s*code|item\s*#?|ref|reference)$/i,
  name: /^(product\s*name|description|product|item\s*description|item|name|details)$/i,
  price: /^(unit\s*price|price|each|rate)$/i,
  total: /^(total|total\s*price|line\s*total|amount|net|sub-?total)$/i,
};

type Role = "qty" | "code" | "name" | "price" | "total" | "other";

function classifyHeader(cell: string): Role {
  if (HEADER_PATTERNS.qty.test(cell)) return "qty";
  if (HEADER_PATTERNS.code.test(cell)) return "code";
  if (HEADER_PATTERNS.name.test(cell)) return "name";
  if (HEADER_PATTERNS.price.test(cell)) return "price";
  if (HEADER_PATTERNS.total.test(cell)) return "total";
  return "other";
}

function isStopRow(cell: string): boolean {
  return /^(sub-?total|total|grand\s*total|vat|tax|shipping|delivery\s*charge|discount)\b[:\s]?/i.test(
    cell.trim(),
  );
}

function isHeaderCell(cell: string): boolean {
  return classifyHeader(cell) !== "other";
}

export function parsePasted(text: string): ParseResult {
  const cells: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    if (rawLine.includes("\t")) {
      for (const c of rawLine.split("\t")) {
        const v = c.trim();
        if (v) cells.push(v);
      }
    } else {
      cells.push(rawLine.trim());
    }
  }

  if (cells.length === 0) {
    return { items: [], warnings: ["Nothing to parse."] };
  }

  let headerStart = -1;
  for (let i = 0; i < cells.length; i++) {
    if (HEADER_PATTERNS.qty.test(cells[i])) {
      headerStart = i;
      break;
    }
  }

  if (headerStart === -1) {
    return {
      items: [],
      warnings: [
        "Could not find a header row containing 'Qty'. Expected columns like: Qty, Product ID, Product name, Price, Total.",
      ],
    };
  }

  let headerEnd = headerStart;
  for (let i = headerStart; i < cells.length; i++) {
    if (isHeaderCell(cells[i])) {
      headerEnd = i;
    } else {
      break;
    }
  }

  const headerCells = cells.slice(headerStart, headerEnd + 1);
  const roles = headerCells.map(classifyHeader);
  const columnCount = roles.length;

  if (!roles.includes("name")) {
    return {
      items: [],
      warnings: [
        `Header was detected (${headerCells.join(", ")}) but no product name / description column was found.`,
      ],
    };
  }

  const items: ParsedItem[] = [];
  const warnings: string[] = [];
  let cursor = headerEnd + 1;

  while (cursor + columnCount <= cells.length) {
    const row = cells.slice(cursor, cursor + columnCount);
    if (row.some(isStopRow)) break;

    let qtyStr = "";
    let codeStr: string | null = null;
    let nameStr = "";
    for (let i = 0; i < columnCount; i++) {
      const role = roles[i];
      const val = row[i];
      if (role === "qty") qtyStr = val;
      else if (role === "code") codeStr = val || null;
      else if (role === "name") nameStr = val;
    }

    const qty = Number(qtyStr.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(qty) && qty > 0 && nameStr) {
      items.push({ quantity: qty, code: codeStr, name: nameStr });
    } else {
      warnings.push(`Skipped row: ${row.join(" | ")}`);
    }

    cursor += columnCount;
  }

  if (items.length === 0 && warnings.length === 0) {
    warnings.push("Header was detected but no item rows followed it.");
  }

  return { items, warnings };
}
