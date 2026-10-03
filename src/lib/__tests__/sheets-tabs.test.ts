import { describe, expect, it, vi } from "vitest";
import { ensureTabs, TAB_NAMES } from "../sheets/client";

const ALL_TITLES = Object.values(TAB_NAMES);

interface AddSheetRequest {
  addSheet: { properties: { title: string } };
}
interface BatchUpdateArg {
  spreadsheetId: string;
  requestBody: { requests: AddSheetRequest[] };
}

function fakeClient(existingTitles: string[]) {
  const calls: BatchUpdateArg[] = [];
  const batchUpdate = vi.fn(async (arg: BatchUpdateArg) => {
    calls.push(arg);
    return {};
  });
  const get = vi.fn(async (arg: { spreadsheetId: string }) => {
    void arg;
    return {
      data: { sheets: existingTitles.map((title) => ({ properties: { title } })) },
    };
  });
  const requestedTitles = (): string[] =>
    calls.flatMap((call) => call.requestBody.requests.map((r) => r.addSheet.properties.title));
  return { client: { spreadsheets: { get, batchUpdate } } as never, batchUpdate, requestedTitles };
}

describe("ensureTabs", () => {
  it("ينشئ التبويبات الأربعة في جدول فارغ", async () => {
    const { client, batchUpdate, requestedTitles } = fakeClient([]);
    await ensureTabs(client, "sheet-1");

    expect(batchUpdate).toHaveBeenCalledTimes(1);
    expect(requestedTitles()).toEqual(ALL_TITLES);
  });

  it("لا يرسل batchUpdate إطلاقًا إن كانت كل التبويبات موجودة", async () => {
    const { client, batchUpdate } = fakeClient(ALL_TITLES);
    await ensureTabs(client, "sheet-1");

    expect(batchUpdate).not.toHaveBeenCalled();
  });

  it("يضيف الناقص فقط (addSheet يفشل بـ 400 على اسم موجود)", async () => {
    const { client, requestedTitles } = fakeClient([TAB_NAMES.sales, TAB_NAMES.profit]);
    await ensureTabs(client, "sheet-1");

    expect(requestedTitles()).toEqual([TAB_NAMES.inventory, TAB_NAMES.invoices]);
  });
});
