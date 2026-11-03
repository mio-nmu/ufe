/** True for a #RRGGBB hex colour — the only form the API accepts. */
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

/**
 * Text colour for content on a team-coloured background: white unless the
 * background is light enough that dark ink reads better (higher WCAG
 * contrast). Uploaded opponent colours can be anything — yellow included.
 */
export function readableOn(hex: string): "dark" | "light" {
  const bg = luminance(hex);
  const contrastWhite = 1.05 / (bg + 0.05);
  const contrastInk = (bg + 0.05) / (luminance("#0b1526") + 0.05);
  return contrastInk > contrastWhite ? "dark" : "light";
}

/** WCAG relative luminance of a #RRGGBB colour (0 = black, 1 = white). */
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
