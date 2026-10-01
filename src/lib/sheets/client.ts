import { google, type sheets_v4 } from "googleapis";
import type { AppSettings } from "../settings";

export function sheetIdFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return trimmed;
}

export function sheetsConfigured(settings: AppSettings): boolean {
  return Boolean(
    settings.googleServiceAccountJson.trim() &&
      settings.googleSheetId.trim()
  );
}

interface SheetsApi {
  client: sheets_v4.Sheets;
  spreadsheetId: string;
}

export function getSheetsApi(settings: AppSettings): SheetsApi | null {
  if (!sheetsConfigured(settings)) return null;
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(settings.googleServiceAccountJson),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const client = google.sheets({ version: "v4", auth });
    const spreadsheetId = sheetIdFromInput(settings.googleSheetId);
    if (!spreadsheetId) return null;
    return { client, spreadsheetId };
  } catch {
    return null;
  }
}

export const TAB_NAMES = {
  inventory: "الجرد",
  sales: "المبيعات",
  invoices: "الفواتير",
  profit: "الأرباح",
} as const;

export async function ensureTabs(
  client: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<boolean> {
  const meta = await client.spreadsheets.get({ spreadsheetId });
  const existing = new Set((meta.data.sheets ?? []).map((s) => s.properties?.title));
  const missing = Object.values(TAB_NAMES).filter((t) => !existing.has(t));
  if (missing.length === 0) return true;
  await client.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: missing.map((title) => ({
        addSheet: { properties: { title } },
      })),
    },
  });
  return true;
}

export async function writeSheet(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string,
  rows: (string | number)[][]
): Promise<void> {
  const range = `${title}!A1:Z${Math.max(1, rows.length)}`;
  await client.spreadsheets.values.clear({
    spreadsheetId,
    range: `${title}!A:Z`,
  });
  if (rows.length > 0) {
    await client.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });
  }
}