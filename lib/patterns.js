// Every pattern function draws into a Canvas 2D context given the same
// shape of options, so the UI, single export, and batch export all share
// one source of truth for what a pattern looks like.

export const PATTERN_TYPES = [
  { key: "grid", label: "Grid / graph paper" },
  { key: "dotgrid", label: "Dot grid" },
  { key: "cross", label: "Cross / plus marks" },
  { key: "diagonal", label: "Diagonal lines" },
  { key: "checkerboard", label: "Checkerboard" },
  { key: "isometric", label: "Isometric grid" },
  { key: "herringbone", label: "Herringbone" },
];

function fillBackground(ctx, w, h, opts) {
  if (opts.transparent) return; // leave alpha channel empty
  ctx.fillStyle = opts.bgColor;
  ctx.fillRect(0, 0, w, h);
}

function lineStyle(ctx, opts, isMajor) {
  ctx.strokeStyle = opts.lineColor;
  ctx.globalAlpha = isMajor ? Math.min(1, opts.opacity * 1.6) : opts.opacity;
  ctx.lineWidth = isMajor ? opts.thickness * 2 : opts.thickness;
}

function drawGrid(ctx, w, h, opts) {
  fillBackground(ctx, w, h, opts);
  const { spacing, majorEvery } = opts;
  let col = 0;
  for (let x = 0; x <= w; x += spacing, col++) {
    const isMajor = opts.majorLines && majorEvery > 0 && col % majorEvery === 0;
    lineStyle(ctx, opts, isMajor);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  let row = 0;
  for (let y = 0; y <= h; y += spacing, row++) {
    const isMajor = opts.majorLines && majorEvery > 0 && row % majorEvery === 0;
    lineStyle(ctx, opts, isMajor);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawDotGrid(ctx, w, h, opts) {
  fillBackground(ctx, w, h, opts);
  const { spacing, thickness, opacity } = opts;
  ctx.fillStyle = opts.lineColor;
  ctx.globalAlpha = opacity;
  const r = Math.max(0.6, thickness);
  for (let x = 0; x <= w; x += spacing) {
    for (let y = 0; y <= h; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawCross(ctx, w, h, opts) {
  fillBackground(ctx, w, h, opts);
  const { spacing, thickness, majorEvery } = opts;
  const smallArm = spacing * 0.14;
  const bigArm = spacing * 0.28;
  let col = 0;
  for (let x = 0; x <= w; x += spacing, col++) {
    let row = 0;
    for (let y = 0; y <= h; y += spacing, row++) {
      const isMajor = opts.majorLines && majorEvery > 0 && col % majorEvery === 0 && row % majorEvery === 0;
      lineStyle(ctx, opts, isMajor);
      const arm = isMajor ? bigArm : smallArm;
      ctx.beginPath();
      ctx.moveTo(x - arm, y);
      ctx.lineTo(x + arm, y);
      ctx.moveTo(x, y - arm);
      ctx.lineTo(x, y + arm);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawDiagonal(ctx, w, h, opts) {
  fillBackground(ctx, w, h, opts);
  const { spacing } = opts;
  lineStyle(ctx, opts, false);
  const diag = w + h;
  for (let x = -diag; x <= diag; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h, h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawCheckerboard(ctx, w, h, opts) {
  fillBackground(ctx, w, h, opts);
  const { spacing } = opts;
  ctx.fillStyle = opts.lineColor;
  ctx.globalAlpha = opts.opacity;
  let row = 0;
  for (let y = 0; y < h; y += spacing, row++) {
    let col = 0;
    for (let x = 0; x < w; x += spacing, col++) {
      if ((row + col) % 2 === 0) {
        ctx.fillRect(x, y, spacing, spacing);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawIsometric(ctx, w, h, opts) {
  fillBackground(ctx, w, h, opts);
  const { spacing } = opts;
  lineStyle(ctx, opts, false);
  const diag = w + h;
  // Two diagonal families at +/- 30deg-ish (using 1:sqrt(3) ratio via dx/dy)
  const step = spacing;
  for (let x = -diag; x <= diag; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h * 0.577, h); // ~30deg
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - h * 0.577, h);
    ctx.stroke();
  }
  // horizontal lines completing the iso grid
  for (let y = 0; y <= h; y += step * 0.866) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawHerringbone(ctx, w, h, opts) {
  fillBackground(ctx, w, h, opts);
  const { spacing, lineColor, opacity } = opts;
  const brick = spacing;
  const half = brick / 2;
  ctx.strokeStyle = lineColor;
  ctx.globalAlpha = opacity;
  ctx.lineWidth = opts.thickness;
  for (let y = -brick; y <= h + brick; y += brick) {
    for (let x = -brick; x <= w + brick; x += brick * 2) {
      const offset = (Math.round(y / brick) % 2 === 0) ? 0 : brick;
      const bx = x + offset;
      // one brick pointing "/"
      ctx.strokeRect(bx, y, half, brick);
      ctx.save();
      ctx.translate(bx + half, y);
      ctx.rotate(Math.PI / 2);
      ctx.strokeRect(0, 0, half, brick);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

const RENDERERS = {
  grid: drawGrid,
  dotgrid: drawDotGrid,
  cross: drawCross,
  diagonal: drawDiagonal,
  checkerboard: drawCheckerboard,
  isometric: drawIsometric,
  herringbone: drawHerringbone,
};

export function renderPattern(canvas, opts) {
  const ctx = canvas.getContext("2d");
  canvas.width = opts.width;
  canvas.height = opts.height;
  ctx.clearRect(0, 0, opts.width, opts.height);
  const fn = RENDERERS[opts.type] || drawGrid;
  fn(ctx, opts.width, opts.height, opts);
}

export function canvasToBlob(canvas, format = "png", quality = 0.92) {
  return new Promise((resolve) => {
    const mime = format === "jpg" ? "image/jpeg" : "image/png";
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

// Lightweight SVG export: only implements the line/dot/checker-based
// patterns as true vector primitives (grid, dotgrid, cross, diagonal,
// checkerboard). Isometric/herringbone SVG export falls back to an
// embedded raster (PNG data URI) inside the SVG, since expressing their
// exact tessellation as clean vector paths is a lot more code for a
// pattern that's rarely needed as an editable vector anyway.
export function patternToSVG(opts, rasterDataUrl) {
  const { width: w, height: h, bgColor, lineColor, spacing, thickness, opacity, transparent } = opts;
  const bg = transparent ? "" : `<rect width="${w}" height="${h}" fill="${bgColor}"/>`;

  if (opts.type === "isometric" || opts.type === "herringbone") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${bg}
<image href="${rasterDataUrl}" width="${w}" height="${h}"/>
</svg>`;
  }

  let shapes = "";
  if (opts.type === "grid") {
    for (let x = 0; x <= w; x += spacing) {
      shapes += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${lineColor}" stroke-width="${thickness}" stroke-opacity="${opacity}"/>`;
    }
    for (let y = 0; y <= h; y += spacing) {
      shapes += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${lineColor}" stroke-width="${thickness}" stroke-opacity="${opacity}"/>`;
    }
  } else if (opts.type === "dotgrid") {
    const r = Math.max(0.6, thickness);
    for (let x = 0; x <= w; x += spacing) {
      for (let y = 0; y <= h; y += spacing) {
        shapes += `<circle cx="${x}" cy="${y}" r="${r}" fill="${lineColor}" fill-opacity="${opacity}"/>`;
      }
    }
  } else if (opts.type === "cross") {
    const arm = spacing * 0.14;
    for (let x = 0; x <= w; x += spacing) {
      for (let y = 0; y <= h; y += spacing) {
        shapes += `<path d="M${x - arm} ${y} H${x + arm} M${x} ${y - arm} V${y + arm}" stroke="${lineColor}" stroke-width="${thickness}" stroke-opacity="${opacity}"/>`;
      }
    }
  } else if (opts.type === "diagonal") {
    const diag = w + h;
    for (let x = -diag; x <= diag; x += spacing) {
      shapes += `<line x1="${x}" y1="0" x2="${x + h}" y2="${h}" stroke="${lineColor}" stroke-width="${thickness}" stroke-opacity="${opacity}"/>`;
    }
  } else if (opts.type === "checkerboard") {
    let row = 0;
    for (let y = 0; y < h; y += spacing, row++) {
      let col = 0;
      for (let x = 0; x < w; x += spacing, col++) {
        if ((row + col) % 2 === 0) {
          shapes += `<rect x="${x}" y="${y}" width="${spacing}" height="${spacing}" fill="${lineColor}" fill-opacity="${opacity}"/>`;
        }
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${bg}${shapes}
</svg>`;
}
