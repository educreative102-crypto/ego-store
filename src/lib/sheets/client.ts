import { google, type sheets_v4 } from "googleapis";
import { prisma } from "../prisma";
import { getSettingsMap, setSetting } from "../settings";

const DB_CREDENTIALS_KEY = "googleServiceAccountJson";
let warnedAboutDbFallback = false;

export function sheetIdFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return trimmed;
}

async function serviceAccountJson(): Promise<string> {
  const fromEnv = (process.env.GOOGLE_SA_JSON ?? "").trim();
  if (fromEnv) return fromEnv;

  const row = await prisma.setting.findUnique({ where: { key: DB_CREDENTIALS_KEY } });
  const fromDb = (row?.value ?? "").trim();
  if (fromDb) {
    if (!warnedAboutDbFallback) {
      warnedAboutDbFallback = true;
      console.warn(
        `[sheets] GOOGLE_SA_JSON غير معرّف — يُستخدم المفتاح المخزّن في جدول Setting. انقله إلى متغير البيئة ثم احذف الصف ${DB_CREDENTIALS_KEY}.`
      );
    }
    return fromDb;
  }
  return "";
}

export async function sheetsConfigured(): Promise<boolean> {
  if (!(await serviceAccountJson())) return false;
  const map = await getSettingsMap();
  return Boolean((map.googleSheetId ?? "").trim());
}

interface SheetsApi {
  client: sheets_v4.Sheets;
  spreadsheetId: string;
}

export async function getSheetsApi(): Promise<SheetsApi | null> {
  const json = await serviceAccountJson();
  if (!json) return null;
  const map = await getSettingsMap();
  const spreadsheetId = sheetIdFromInput(map.googleSheetId ?? "");
  if (!spreadsheetId) return null;
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(json),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return { client: google.sheets({ version: "v4", auth }), spreadsheetId };
  } catch (error) {
    console.error("[sheets] تعذّر قراءة مفتاح الخدمة:", error);
    await setSetting("googleSheetStatus", "مفتاح الخدمة غير صالح");
    return null;
  }
}

export const TAB_NAMES = {
  inventory: "الجرد",
  sales: "المبيعات",
  invoices: "الفواتير",
  profit: "الأرباح",
} as const;

// نضيف التبويب الناقص فقط: addSheet يفشل بـ 400 إن كان الاسم موجودًا، فإرسال
// الأربعة دائمًا كان يُفشل كل مزامنة على أي جدول مُهيّأ مسبقًا.
export async function ensureTabs(
  client: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<void> {
  const meta = await client.spreadsheets.get({ spreadsheetId });
  const existing = new Set((meta.data.sheets ?? []).map((s) => s.properties?.title));
  const missing = Object.values(TAB_NAMES).filter((title) => !existing.has(title));
  if (missing.length === 0) return;
  await client.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
    },
  });
}

// كتابة ذرّية: نداء HTTP واحد بدل clear ثم update (النداءان كانا يتركان التبويب فارغًا
// لو قُتلت العملية بينهما، وهو الخطر الحقيقي في بيئة serverless).
// داخل النداء الواحد: نكتب البيانات أولًا ثم نمسح الذيل، فأسوأ حالة هي بقاء
// سطور قديمة تحت البيانات — عيب تجميلي — بدل فقدان بيانات.
export async function writeSheet(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string,
  rows: (string | number)[][]
): Promise<void> {
  const data: sheets_v4.Schema$ValueRange[] = [
    { range: `${title}!A1:Z${Math.max(1, rows.length)}`, values: rows },
    { range: `${title}!A${Math.max(2, rows.length + 1)}:Z`, values: [] },
  ];
  await client.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data },
  });
}