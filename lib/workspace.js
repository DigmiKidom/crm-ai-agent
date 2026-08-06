import { COLUMN_TYPES, MAX_COLUMNS } from "@/lib/models/WorkspaceItem";

export const MAX_COLUMN_NAME = 40;
export const MAX_SELECT_OPTIONS = 20;
// A single cell isn't a document — this stops one paste of a novel into a table
// cell from bloating every row read.
export const MAX_CELL_TEXT = 2000;

/**
 * Validate and normalise a client-supplied column list.
 *
 * Returns { columns } on success or { errorCode, errorData } on failure. A
 * code rather than a message because this module has no request context to
 * translate with — pass both to columnsErrorMessage(t, ...) below once you
 * have a translator.
 */
export function sanitizeColumns(input) {
  if (!Array.isArray(input)) return { errorCode: "NOT_A_LIST" };
  if (input.length > MAX_COLUMNS) {
    return { errorCode: "TOO_MANY_COLUMNS", errorData: { n: MAX_COLUMNS } };
  }

  const columns = [];
  const seenIds = new Set();

  for (const raw of input) {
    const id = String(raw?.id || "").trim();
    const name = String(raw?.name || "").trim();
    const type = String(raw?.type || "text");

    if (!id) return { errorCode: "MISSING_ID" };
    if (seenIds.has(id)) return { errorCode: "DUPLICATE_ID" };
    seenIds.add(id);

    if (!name) return { errorCode: "MISSING_NAME" };
    if (name.length > MAX_COLUMN_NAME) {
      return { errorCode: "NAME_TOO_LONG", errorData: { n: MAX_COLUMN_NAME } };
    }
    if (!COLUMN_TYPES.includes(type)) return { errorCode: "UNKNOWN_TYPE", errorData: { type } };

    // Options only mean anything for a select, and duplicates would render as
    // two identical choices, so they're collapsed here rather than in the UI.
    let options = [];
    if (type === "select") {
      const cleaned = (Array.isArray(raw?.options) ? raw.options : [])
        .map((o) => String(o).trim())
        .filter(Boolean);
      options = [...new Set(cleaned)].slice(0, MAX_SELECT_OPTIONS);
    }

    columns.push({ id, name, type, options });
  }

  return { columns };
}

/** Turns a { errorCode, errorData } from sanitizeColumns() into a localized message. */
export function columnsErrorMessage(t, errorCode, errorData) {
  switch (errorCode) {
    case "NOT_A_LIST":
      return t("api.workspace.columnsNotAList");
    case "TOO_MANY_COLUMNS":
      return t("api.workspace.tooManyColumns", errorData);
    case "MISSING_ID":
      return t("api.workspace.columnMissingId");
    case "DUPLICATE_ID":
      return t("api.workspace.duplicateColumnId");
    case "MISSING_NAME":
      return t("api.workspace.columnMissingName");
    case "NAME_TOO_LONG":
      return t("api.workspace.columnNameTooLong", errorData);
    case "UNKNOWN_TYPE":
      return t("api.workspace.unknownColumnType", errorData);
    default:
      return t("api.common.somethingWentWrong");
  }
}

/**
 * Coerce one cell value to match its column's type.
 *
 * Anything unparseable becomes the type's empty value rather than an error —
 * a half-typed number shouldn't block saving the rest of the row.
 */
export function coerceCell(value, column) {
  switch (column?.type) {
    case "number": {
      if (value === "" || value === null || value === undefined) return "";
      const n = Number(value);
      return Number.isFinite(n) ? n : "";
    }
    case "checkbox":
      return Boolean(value);
    case "date": {
      if (!value) return "";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      // Stored as YYYY-MM-DD: these are calendar dates, not instants, so a
      // full timestamp would introduce timezone drift for no benefit.
      return d.toISOString().slice(0, 10);
    }
    case "select": {
      const s = String(value ?? "");
      // A value no longer in the option list is dropped, otherwise removing an
      // option would leave rows displaying a choice that can't be re-picked.
      return column.options?.includes(s) ? s : "";
    }
    default: {
      const s = String(value ?? "");
      return s.length > MAX_CELL_TEXT ? s.slice(0, MAX_CELL_TEXT) : s;
    }
  }
}

/**
 * Coerce a whole cells object against the table's columns, dropping any key
 * that doesn't correspond to a real column.
 */
export function coerceCells(cells, columns) {
  const out = {};
  if (!cells || typeof cells !== "object") return out;

  for (const column of columns) {
    if (!(column.id in cells)) continue;
    out[column.id] = coerceCell(cells[column.id], column);
  }
  return out;
}

/** A blank value appropriate to each column type. */
export function emptyCell(column) {
  return column?.type === "checkbox" ? false : "";
}
