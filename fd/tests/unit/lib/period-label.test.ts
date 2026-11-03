import { describe, expect, it } from "vitest";

import { periodLabel } from "@/hooks/use-live-game";

describe("periodLabel", () => {
  it("names quarters and overtimes", () => {
    expect(periodLabel(1)).toBe("Q1");
    expect(periodLabel(4)).toBe("Q4");
    expect(periodLabel(5)).toBe("OT1");
    expect(periodLabel(8)).toBe("OT4");
  });
});
