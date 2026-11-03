import { describe, expect, it } from "vitest";

import { isHexColor, readableOn } from "@/lib/color";

describe("isHexColor", () => {
  it("accepts only #RRGGBB", () => {
    expect(isHexColor("#A01C2B")).toBe(true);
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("#A01C2B; background:url(x)")).toBe(false);
    expect(isHexColor(null)).toBe(false);
  });
});

describe("readableOn", () => {
  it("puts white text on dark team colours", () => {
    expect(readableOn("#0b2a5b")).toBe("light");
    expect(readableOn("#a01c2b")).toBe("light");
  });

  it("puts dark text on light team colours", () => {
    expect(readableOn("#ffd400")).toBe("dark");
    expect(readableOn("#ffffff")).toBe("dark");
  });
});
