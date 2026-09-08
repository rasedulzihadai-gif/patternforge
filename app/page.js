"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { PATTERN_TYPES, renderPattern, canvasToBlob, patternToSVG } from "../lib/patterns";
import { SIZE_PRESETS, generateHarmoniousPalette } from "../lib/presets";

const DEFAULTS = {
  type: "grid",
  width: 1080,
  height: 1920,
  bgMode: "solid",
  bgColor: "#0f4d3a",
  bgColor2: "#0a2e22",
  gradientType: "linear",
  gradientAngle: 45,
  lineColor: "#e8e6e0",
  spacing: 40,
  thickness: 1,
  opacity: 0.5,
  majorLines: true,
  majorEvery: 5,
  transparent: false,
};

function randomHex() {
  return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
}

export default function Home() {
  const [opts, setOpts] = useState(DEFAULTS);
  const [presetIdx, setPresetIdx] = useState(0);
  const previewRef = useRef(null);

  const [batchColors, setBatchColors] = useState([]);
  const [batchSizes, setBatchSizes] = useState([{ label: "Phone wallpaper", width: 1080, height: 1920 }]);
  const [batchFormat, setBatchFormat] = useState("png");
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  const update = (patch) => setOpts((prev) => ({ ...prev, ...patch }));

  const draw = useCallback(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const maxPreview = 480;
    const scale = Math.min(1, maxPreview / Math.max(opts.width, opts.height));
    renderPattern(canvas, {
      ...opts,
      width: Math.round(opts.width * scale),
      height: Math.round(opts.height * scale),
      spacing: Math.max(4, opts.spacing * scale),
    });
  }, [opts]);

  useEffect(() => { draw(); }, [draw]);

  function applyPreset(idx) {
    setPresetIdx(idx);
    const p = SIZE_PRESETS[idx];
    if (p.width) update({ width: p.width, height: p.height });
  }

  function randomizeAll() {
    const type = PATTERN_TYPES[Math.floor(Math.random() * PATTERN_TYPES.length)].key;
    const bgMode = Math.random() > 0.4 ? "gradient" : "solid";
    update({
      type,
      bgMode,
      bgColor: randomHex(),
      bgColor2: randomHex(),
      gradientType: Math.random() > 0.5 ? "linear" : "radial",
      gradientAngle: Math.floor(Math.random() * 360),
      lineColor: randomHex(),
      spacing: 20 + Math.floor(Math.random() * 100),
      thickness: [0.5, 1, 1.5, 2][Math.floor(Math.random() * 4)],
      opacity: 0.2 + Math.random() * 0.7,
      majorLines: Math.random() > 0.3,
      majorEvery: 3 + Math.floor(Math.random() * 5),
      transparent: false,
    });
  }

  async function exportSingle(format) {
    const canvas = document.createElement("canvas");
    renderPattern(canvas, opts);
    if (format === "svg") {
      let rasterDataUrl = "";
      if (opts.type === "isometric" || opts.type === "herringbone") {
        rasterDataUrl = canvas.toDataURL("image/png");
      }
      const svg = patternToSVG(opts, rasterDataUrl);
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `pattern-${opts.type}.svg`);
      return;
    }
    const blob = await canvasToBlob(canvas, format);
    downloadBlob(blob, `pattern-${opts.type}.${format === "jpg" ? "jpg" : "png"}`);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function randomizePalette() {
    setBatchColors(generateHarmoniousPalette(6));
  }

  function toggleBatchSize(preset) {
    setBatchSizes((prev) => {
      const exists = prev.find((s) => s.label === preset.label);
      if (exists) return prev.filter((s) => s.label !== preset.label);
      return [...prev, preset];
    });
  }

  async function runBatchZip() {
    if (batchColors.length === 0 || batchSizes.length === 0) return;
    setZipping(true);
    setZipProgress(0);
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const total = batchColors.length * batchSizes.length;
    let done = 0;

    for (const color of batchColors) {
      for (const size of batchSizes) {
        const canvas = document.createElement("canvas");
        // Batch always renders solid, opaque colors from the palette —
        // "transparent" from the live-preview panel is intentionally
        // ignored here, otherwise every file in the ZIP comes out blank
        // regardless of which palette color it was supposed to use.
        const combo = { ...opts, bgColor: color, bgMode: "solid", transparent: false, width: size.width, height: size.height };
        renderPattern(canvas, combo);
        const blob = await canvasToBlob(canvas, batchFormat);
        const name = `${opts.type}-${color.replace("#", "")}-${size.width}x${size.height}.${batchFormat}`;
        zip.file(name, blob);
        done++;
        setZipProgress(Math.round((done / total) * 100));
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `patterns-batch-${opts.type}.zip`);
    setZipping(false);
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Controls */}
      <aside style={{ width: 340, borderRight: "1px solid var(--border-soft)", overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, letterSpacing: -0.3 }}>
                Pattern Forge
              </div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>background generator</div>
            </div>
            <button className="pf-btn" onClick={randomizeAll} title="Randomize everything">🎲</button>
          </div>
        </div>

        <div className="pf-card">
          <label style={label}>Pattern type</label>
          <select style={select} value={opts.type} onChange={(e) => update({ type: e.target.value })}>
            {PATTERN_TYPES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>

          <label style={label}>Size preset</label>
          <select style={select} value={presetIdx} onChange={(e) => applyPreset(Number(e.target.value))}>
            {SIZE_PRESETS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input type="number" style={numInput} value={opts.width} onChange={(e) => update({ width: Number(e.target.value) })} placeholder="Width" />
            <input type="number" style={numInput} value={opts.height} onChange={(e) => update({ height: Number(e.target.value) })} placeholder="Height" />
          </div>
        </div>

        <div className="pf-card">
          <label style={{ ...label, marginTop: 0 }}>Background</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button className={`pf-tab ${opts.bgMode === "solid" ? "active" : ""}`} onClick={() => update({ bgMode: "solid" })}>Solid</button>
            <button className={`pf-tab ${opts.bgMode === "gradient" ? "active" : ""}`} onClick={() => update({ bgMode: "gradient" })}>Gradient</button>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input type="color" value={opts.bgColor} onChange={(e) => update({ bgColor: e.target.value })} style={swatch} />
            {opts.bgMode === "gradient" && (
              <input type="color" value={opts.bgColor2} onChange={(e) => update({ bgColor2: e.target.value })} style={swatch} />
            )}
            <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: "var(--text-dim)" }}>
              <input type="checkbox" checked={opts.transparent} onChange={(e) => update({ transparent: e.target.checked })} />
              Transparent
            </label>
          </div>

          {opts.bgMode === "gradient" && (
            <>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button className={`pf-tab ${opts.gradientType === "linear" ? "active" : ""}`} onClick={() => update({ gradientType: "linear" })}>Linear</button>
                <button className={`pf-tab ${opts.gradientType === "radial" ? "active" : ""}`} onClick={() => update({ gradientType: "radial" })}>Radial</button>
              </div>
              {opts.gradientType === "linear" && (
                <>
                  <label style={label}>Angle: {opts.gradientAngle}°</label>
                  <input type="range" min="0" max="360" value={opts.gradientAngle} onChange={(e) => update({ gradientAngle: Number(e.target.value) })} />
                </>
              )}
            </>
          )}

          <label style={label}>Line / mark color</label>
          <input type="color" value={opts.lineColor} onChange={(e) => update({ lineColor: e.target.value })} style={swatch} />
        </div>

        <div className="pf-card">
          <label style={{ ...label, marginTop: 0 }}>Spacing: {opts.spacing}px</label>
          <input type="range" min="10" max="200" value={opts.spacing} onChange={(e) => update({ spacing: Number(e.target.value) })} />

          <label style={label}>Line thickness: {opts.thickness}px</label>
          <input type="range" min="0.5" max="6" step="0.5" value={opts.thickness} onChange={(e) => update({ thickness: Number(e.target.value) })} />

          <label style={label}>Opacity: {Math.round(opts.opacity * 100)}%</label>
          <input type="range" min="0.05" max="1" step="0.05" value={opts.opacity} onChange={(e) => update({ opacity: Number(e.target.value) })} />

          {(opts.type === "grid" || opts.type === "cross") && (
            <>
              <label style={{ ...label, display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={opts.majorLines} onChange={(e) => update({ majorLines: e.target.checked })} />
                Major accent every N lines
              </label>
              {opts.majorLines && (
                <input type="number" style={numInput} value={opts.majorEvery} onChange={(e) => update({ majorEvery: Number(e.target.value) })} />
              )}
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="pf-btn" onClick={() => exportSingle("png")}>Download PNG</button>
          <button className="pf-btn" onClick={() => exportSingle("jpg")}>Download JPG</button>
          <button className="pf-btn" onClick={() => exportSingle("svg")}>Download SVG</button>
        </div>
      </aside>

      {/* Preview + batch */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{
            borderRadius: 12, overflow: "hidden",
            boxShadow: "0 20px 60px -20px rgba(0,0,0,0.6)",
            border: "1px solid var(--border-soft)",
            backgroundImage: opts.transparent
              ? "repeating-conic-gradient(#3a3d48 0% 25%, #24272f 0% 50%) 50% / 16px 16px"
              : "none",
          }}>
            <canvas ref={previewRef} style={{ display: "block", maxWidth: "68vw", maxHeight: "58vh" }} />
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-soft)", padding: "20px 24px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
            Bulk / batch export
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div className="pf-card" style={{ flex: "1 1 220px" }}>
              <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
                Color palette ({batchColors.length})
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, minHeight: 26 }}>
                {batchColors.length === 0 && (
                  <span style={{ fontSize: 12, color: "var(--text-faint)" }}>No colors yet — generate one below.</span>
                )}
                {batchColors.map((c, i) => (
                  <span key={i} style={{ width: 24, height: 24, borderRadius: 6, background: c, border: "1px solid var(--border)" }} title={c} />
                ))}
              </div>
              <button className="pf-btn" onClick={randomizePalette}>🎲 Random harmonious palette</button>
            </div>

            <div className="pf-card" style={{ flex: "1 1 220px" }}>
              <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
                Sizes to include
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SIZE_PRESETS.filter((p) => p.width).map((p) => (
                  <label key={p.label} style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 8, color: "var(--text-dim)" }}>
                    <input
                      type="checkbox"
                      checked={!!batchSizes.find((s) => s.label === p.label)}
                      onChange={() => toggleBatchSize(p)}
                    />
                    {p.label} <span style={{ color: "var(--text-faint)" }}>({p.width}×{p.height})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pf-card" style={{ flex: "1 1 220px" }}>
              <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
                Format
              </div>
              <select style={select} value={batchFormat} onChange={(e) => setBatchFormat(e.target.value)}>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 12 }}>
                Will generate <strong style={{ color: "var(--text)" }}>{batchColors.length * batchSizes.length}</strong> files
              </div>
              <button
                className="pf-btn-primary"
                style={{ marginTop: 10, width: "100%" }}
                disabled={zipping || batchColors.length === 0 || batchSizes.length === 0}
                onClick={runBatchZip}
              >
                {zipping ? `Zipping… ${zipProgress}%` : "Generate & download ZIP"}
              </button>
              {opts.transparent && (
                <div style={{ fontSize: 11, color: "var(--amber)", marginTop: 8 }}>
                  Note: batch always uses solid palette colors — the "Transparent" toggle above only affects the single-image preview/export.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const label = { display: "block", fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 16, marginBottom: 8 };
const select = { width: "100%", padding: "9px 11px", background: "var(--panel-raised)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text)", fontSize: 13 };
const numInput = { width: "100%", padding: "8px 11px", background: "var(--panel-raised)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text)", fontSize: 13 };
const swatch = { width: 42, height: 34, border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer" };
