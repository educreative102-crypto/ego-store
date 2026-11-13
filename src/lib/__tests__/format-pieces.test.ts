import { describe, expect, it } from "vitest";
import { availablePiecesLabel } from "../format";

describe("availablePiecesLabel", () => {
  it("يعالج صيغ الجمع العربية", () => {
    expect(availablePiecesLabel(0)).toBe("لا قطع متوفرة");
    expect(availablePiecesLabel(1)).toBe("قطعة واحدة متوفرة");
    expect(availablePiecesLabel(2)).toBe("قطعتان متوفرتان");
    expect(availablePiecesLabel(3)).toBe("3 قطع متوفرة");
    expect(availablePiecesLabel(10)).toBe("10 قطع متوفرة");
    expect(availablePiecesLabel(11)).toBe("11 قطعة متوفرة");
  });
});
