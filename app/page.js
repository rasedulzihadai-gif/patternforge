"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { PATTERN_TYPES, renderPattern, canvasToBlob, patternToSVG } from "../lib/patterns";
import { SIZE_PRESETS, generateHarmoniousPalette } from "../lib/presets";

const DEFAULTS = {
  type: "grid",
  width: 1080,
  height: 1920,
  bgColor: "#0f4d3a",
  lineColor: "#e8e6e0",
  spacing: 40,
  thickness: 1,
  opacity: 0.5,
  majorLines: true,
  majorEvery: 5,
  transparent: false,
};

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

  // Live preview: render at a capped preview resolution for speed, real
  // export always re-renders at full requested resolution.
  const draw = useCallback(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const maxPreview = 480;
    const scale = Math.min(1, maxPreview / Math.max(opts.width, opts.height));
    renderPattern(canvas, { ...opts, width: Math.round(opts.width * scale), height: Math.round(opts.height * scale), spacing: Math.max(4, opts.spacing * scale) });
  }, [opts]);

  useEffect(() => { draw(); }, [draw]);

  function applyPreset(idx) {
    setPresetIdx(idx);
    const p = SIZE_PRESETS[idx];
    if (p.width) update({ width: p.width, height: p.height });
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
        const combo = { ...opts, bgColor: color, width: size.width, height: size.height };
        renderPattern(canvas, combo);
        const blob = await canvasToBlob(canvas, batchFormat);
        const name = `${opts.type}-${color.replace("#", "")}-${size.width}x${size.height}.${batchFormat}`;
        zip.file(name, blob);
        done++;
        setZipProgress(Math.round((done / total) * 100));
        // Yield to the browser between renders so the UI doesn't freeze
        // on large batches.
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
      <aside style={{ width: 320, borderRight: "1px solid var(--border-soft)", overflowY: "auto", padding: 20 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 2 }}>
          Pattern Forge
        </div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 20 }}>background generator</div>

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

        <label style={label}>Background color</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="color" value={opts.bgColor} onChange={(e) => update({ bgColor: e.target.value })} style={swatch} />
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={opts.transparent} onChange={(e) => update({ transparent: e.target.checked })} />
            Transparent (PNG only)
          </label>
        </div>

        <label style={label}>Line / mark color</label>
        <input type="color" value={opts.lineColor} onChange={(e) => update({ lineColor: e.target.value })} style={swatch} />

        <label style={label}>Spacing: {opts.spacing}px</label>
        <input type="range" min="10" max="200" value={opts.spacing} onChange={(e) => update({ spacing: Number(e.target.value) })} style={{ width: "100%" }} />

        <label style={label}>Line thickness: {opts.thickness}px</label>
        <input type="range" min="0.5" max="6" step="0.5" value={opts.thickness} onChange={(e) => update({ thickness: Number(e.target.value) })} style={{ width: "100%" }} />

        <label style={label}>Opacity: {Math.round(opts.opacity * 100)}%</label>
        <input type="range" min="0.05" max="1" step="0.05" value={opts.opacity} onChange={(e) => update({ opacity: Number(e.target.value) })} style={{ width: "100%" }} />

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

        <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={ghostBtn} onClick={() => exportSingle("png")}>Download PNG</button>
          <button style={ghostBtn} onClick={() => exportSingle("jpg")}>Download JPG</button>
          <button style={ghostBtn} onClick={() => exportSingle("svg")}>Download SVG</button>
        </div>
      </aside>

      {/* Preview */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{
            border: "1px solid var(--border-soft)", borderRadius: 8, overflow: "hidden",
            backgroundImage: opts.transparent
              ? "repeating-conic-gradient(#2a2d38 0% 25%, #1b1e27 0% 50%) 50% / 20px 20px"
              : "none",
          }}>
            <canvas ref={previewRef} style={{ display: "block", maxWidth: "70vw", maxHeight: "60vh" }} />
          </div>
        </div>

        {/* Batch panel */}
        <div style={{ borderTop: "1px solid var(--border-soft)", padding: 20 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, marginBottom: 10 }}>Bulk / batch export</div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>
                Color palette ({batchColors.length})
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6, maxWidth: 260 }}>
                {batchColors.map((c, i) => (
                  <span key={i} style={{ width: 22, height: 22, borderRadius: 4, background: c, border: "1px solid var(--border)" }} title={c} />
                ))}
              </div>
              <button style={ghostBtn} onClick={randomizePalette}>🎲 Random harmonious palette</button>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>Sizes to include</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {SIZE_PRESETS.filter((p) => p.width).map((p) => (
                  <label key={p.label} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!batchSizes.find((s) => s.label === p.label)}
                      onChange={() => toggleBatchSize(p)}
                    />
                    {p.label} ({p.width}×{p.height})
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>Format</div>
              <select style={select} value={batchFormat} onChange={(e) => setBatchFormat(e.target.value)}>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 12 }}>
                Will generate {batchColors.length * batchSizes.length} files
              </div>
              <button
                style={{ ...primaryBtn, marginTop: 8 }}
                disabled={zipping || batchColors.length === 0 || batchSizes.length === 0}
                onClick={runBatchZip}
              >
                {zipping ? `Zipping… ${zipProgress}%` : "Generate & download ZIP"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const label = { display: "block", fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 16, marginBottom: 6 };
const select = { width: "100%", padding: "8px 10px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 13 };
const numInput = { width: "100%", padding: "7px 10px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 13 };
const swatch = { width: 40, height: 32, border: "1px solid var(--border)", borderRadius: 6, background: "none", padding: 0, cursor: "pointer" };
const ghostBtn = { background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border)", borderRadius: 6, padding: "7px 12px", cursor: "pointer", fontSize: 12.5 };
const primaryBtn = { background: "var(--amber)", color: "#1a1206", border: "none", borderRadius: 6, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: 1 };
