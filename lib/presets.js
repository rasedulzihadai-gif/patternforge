export const SIZE_PRESETS = [
  { label: "Phone wallpaper", width: 1080, height: 1920 },
  { label: "Desktop wallpaper", width: 1920, height: 1080 },
  { label: "Square (social)", width: 2048, height: 2048 },
  { label: "Instagram story", width: 1080, height: 1920 },
  { label: "A4 print (300dpi)", width: 2480, height: 3508 },
  { label: "Stock 8K landscape", width: 7680, height: 4320 },
  { label: "Custom", width: null, height: null },
];

// Generates N harmonious colors by rotating hue around a random base,
// with a bit of controlled variance in saturation/lightness so a batch
// doesn't look mechanically identical.
export function generateHarmoniousPalette(count = 6) {
  const baseHue = Math.floor(Math.random() * 360);
  const scheme = ["analogous", "complementary", "triadic"][Math.floor(Math.random() * 3)];
  const colors = [];
  for (let i = 0; i < count; i++) {
    let hue;
    if (scheme === "analogous") hue = (baseHue + i * (30 / count) * 6) % 360;
    else if (scheme === "complementary") hue = (baseHue + (i % 2) * 180 + i * 8) % 360;
    else hue = (baseHue + (i % 3) * 120 + i * 5) % 360;
    const sat = 45 + Math.random() * 35;
    const light = 30 + Math.random() * 40;
    colors.push(hslToHex(hue, sat, light));
  }
  return colors;
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
