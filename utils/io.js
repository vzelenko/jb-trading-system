import fs from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeCsv(filePath, rows, headers) {
  await ensureDir(path.dirname(filePath));
  const escaped = [headers.join(",")];

  for (const row of rows) {
    escaped.push(headers.map((header) => escapeCsv(row[header])).join(","));
  }

  await fs.writeFile(filePath, `${escaped.join("\n")}\n`, "utf8");
}

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);
  if (/[,"\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll("\"", "\"\"")}"`;
  }

  return stringValue;
}
