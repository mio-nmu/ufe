import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("transliterates Mongolian Cyrillic", () => {
    expect(slugify("Номчбаатар Наранбаатар")).toBe("nomchbaatar-naranbaatar");
    expect(slugify("Өнөөдрийн үр дүн")).toBe("unuudriin-ur-dun");
  });

  it("keeps latin and digits, collapses punctuation", () => {
    expect(slugify("2026–2027 оны улирал: ШИНЭ!")).toBe(
      "2026-2027-ony-uliral-shine",
    );
    expect(slugify("  NUM Falcons  ")).toBe("num-falcons");
  });

  it("caps the length without a trailing dash", () => {
    const slug = slugify("а ".repeat(100));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});
