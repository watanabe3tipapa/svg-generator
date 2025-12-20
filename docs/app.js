// Logo SVG Generator with font upload + outline (client-side)
// Requires opentype.js (loaded in index.html)
const form = document.getElementById("form");
const previewWrap = document.getElementById("preview");
const previewBtn = document.getElementById("previewBtn");
const downloadBtn = document.getElementById("downloadBtn");
const fontFileInput = document.getElementById("fontFile");
const fontSelect = document.getElementById("fontSelect");
const outlineCheck = document.getElementById("outlineCheck");
const embedCheck = document.getElementById("embedCheck");

let uploadedFont = null; // {name, arrayBuffer, postScriptName, fileName}
let uploadedFontBlobUrl = null;
let loadedFontFace = null; // Track loaded FontFace to avoid duplicates

function escapeXml(unsafe) {
  return String(unsafe).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
}

fontFileInput.addEventListener("change", async (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const arr = await f.arrayBuffer();
  try {
    const font = opentype.parse(arr);
    const name =
      (font.names &&
        font.names.fullName &&
        (font.names.fullName.en || Object.values(font.names.fullName)[0])) ||
      f.name ||
      "UploadedFont";
    const post =
      (font.names &&
        font.names.postScriptName &&
        (font.names.postScriptName.en ||
          Object.values(font.names.postScriptName)[0])) ||
      name.replace(/\s+/g, "_");
    uploadedFont = {
      name,
      arrayBuffer: arr,
      postScriptName: post,
      fileName: f.name,
    };
    // update or add uploaded option label
    let opt = Array.from(fontSelect.options).find(
      (o) => o.value === "uploaded",
    );
    if (!opt) {
      const o = document.createElement("option");
      o.value = "uploaded";
      o.text = `${name} (uploaded)`;
      fontSelect.add(o);
    } else {
      opt.text = `${name} (uploaded)`;
    }
    fontSelect.value = "uploaded";
    // create blob URL and register FontFace for preview rendering
    if (uploadedFontBlobUrl) URL.revokeObjectURL(uploadedFontBlobUrl);
    // Remove old FontFace if exists to prevent duplicates
    if (loadedFontFace) {
      try {
        document.fonts.delete(loadedFontFace);
      } catch (e) {
        console.warn("Failed to delete old FontFace", e);
      }
    }
    const blob = new Blob([arr], { type: "font/otf" });
    uploadedFontBlobUrl = URL.createObjectURL(blob);
    try {
      const ff = new FontFace(
        uploadedFont.postScriptName,
        `url(${uploadedFontBlobUrl})`,
      );
      await ff.load();
      document.fonts.add(ff);
      loadedFontFace = ff;
      console.log("Uploaded font loaded:", uploadedFont.postScriptName);
    } catch (err) {
      console.warn("FontFace load failed:", err);
      alert("フォントの読み込みに失敗しました。ブラウザがこのフォント形式をサポートしていない可能性があります。");
    }
    renderPreview();
  } catch (err) {
    alert("フォントの解析に失敗しました: " + (err && err.message));
    console.error("Font parsing error:", err);
  }
});

function readForm() {
  const fd = new FormData(form);
  return {
    text: fd.get("text") || "Logo",
    font: fd.get("font") || "Inter",
    size: Number(fd.get("size") || 48),
    color: fd.get("color") || "#111827",
    bg: fd.get("bg") || "#ffffff",
    stroke: Number(fd.get("stroke") || 0),
    icon: fd.get("icon") || "none",
    layout: fd.get("layout") || "center",
    width: Number(fd.get("width") || 512),
    height: Number(fd.get("height") || 128),
    outline: outlineCheck.checked,
    embedFont: embedCheck.checked,
  };
}

// Build SVG: if outline requested and font available, convert glyphs to path using opentype.js
async function buildSVG(values) {
  const w = Math.max(1, Math.round(values.width));
  const h = Math.max(1, Math.round(values.height));
  const viewBox = `0 0 ${w} ${h}`;
  const padding = Math.min(24, Math.floor(h * 0.12));
  const maxIcon = Math.min(h - padding * 2, 96);
  const iconSize =
    values.icon === "none" ? 0 : Math.round(Math.min(maxIcon, h * 0.6));
  const safeText = escapeXml(values.text);

  // prepare font embedding (base64) if requested and uploadedFont present
  let embedStyle = "";
  if (values.embedFont && uploadedFont) {
    try {
      // More efficient base64 encoding using btoa with binary string
      const u8 = new Uint8Array(uploadedFont.arrayBuffer);
      let binary = '';
      const len = u8.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(u8[i]);
      }
      const b64 = btoa(binary);

      // Determine font MIME type and format based on file extension
      const fileName = uploadedFont.fileName.toLowerCase();
      let fontMime, fontFormat;
      if (fileName.endsWith(".woff2")) {
        fontMime = "font/woff2";
        fontFormat = "woff2";
      } else if (fileName.endsWith(".woff")) {
        fontMime = "font/woff";
        fontFormat = "woff";
      } else if (fileName.endsWith(".ttf")) {
        fontMime = "font/ttf";
        fontFormat = "truetype";
      } else {
        fontMime = "font/otf";
        fontFormat = "opentype";
      }

      const family =
        uploadedFont.postScriptName || uploadedFont.name.replace(/\s+/g, "_");
      embedStyle = `@font-face{font-family:"${family}";src:url("data:${fontMime};base64,${b64}") format("${fontFormat}");font-weight:normal;font-style:normal;font-display:swap;}`;
    } catch (err) {
      console.error("Font embedding failed:", err);
    }
  }

  // icon markup
  let iconMarkup = "";
  if (values.icon === "circle") {
    const cx = padding + iconSize / 2;
    const cy = h / 2;
    iconMarkup = `<circle cx="${cx}" cy="${cy}" r="${iconSize / 2}" fill="${values.color}" />`;
  } else if (values.icon === "square") {
    const x = padding;
    const y = Math.round((h - iconSize) / 2);
    const rx = Math.round(iconSize * 0.12);
    iconMarkup = `<rect x="${x}" y="${y}" width="${iconSize}" height="${iconSize}" rx="${rx}" fill="${values.color}" />`;
  }

  // text fragment
  let textFragment = "";

  if (values.outline) {
    // try to obtain opentype font object
    let fontObj = null;
    if (uploadedFont) {
      try {
        fontObj = opentype.parse(uploadedFont.arrayBuffer);
      } catch (e) {
        console.warn("opentype parse failed for uploaded font", e);
      }
    }
    if (!fontObj) {
      // best-effort fetch for Inter woff (may fail); this is optional fallback
      if (values.font === "Inter") {
        try {
          const res = await fetch(
            "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3i9w2k.woff",
          );
          const ab = await res.arrayBuffer();
          fontObj = opentype.parse(ab);
        } catch (e) {
          console.warn("fetch Inter failed", e);
        }
      }
    }

    if (!fontObj) {
      // fallback to <text> if no font available for outlines
      const anchor =
        values.layout === "center"
          ? "middle"
          : values.layout === "left"
            ? "start"
            : "end";
      let x;
      if (values.layout === "center") x = w / 2;
      else if (values.layout === "left")
        x = padding + iconSize + (iconSize ? 12 : 0);
      else x = w - padding - (iconSize ? iconSize + 12 : 0);
      const strokeAttr =
        values.stroke > 0
          ? `stroke="${values.color}" stroke-width="${values.stroke}" paint-order="stroke"`
          : "";
      const fontFamily =
        uploadedFont && fontSelect.value === "uploaded"
          ? uploadedFont.postScriptName ||
          uploadedFont.name.replace(/\s+/g, "_")
          : values.font;
      textFragment = `${embedStyle}<text x="${x}" y="${Math.round(h / 2 + values.size * 0.35)}" text-anchor="${anchor}" style="font-family:'${fontFamily}',sans-serif;font-size:${values.size}px;fill:${values.color};">${safeText}</text>`;
    } else {
      // convert string to glyph paths
      const glyphs = fontObj.stringToGlyphs(values.text);
      const fontScale = (1 / fontObj.unitsPerEm) * values.size;
      // compute total advances
      const totalAdvance =
        glyphs.reduce(
          (sum, g) => sum + (g.advanceWidth || fontObj.unitsPerEm),
          0,
        ) * fontScale;
      let startX;
      if (values.layout === "center") {
        startX = (w - totalAdvance) / 2;
      } else if (values.layout === "left") {
        startX = padding + iconSize + (iconSize ? 12 : 0);
      } else {
        // right
        startX = w - padding - totalAdvance - (iconSize ? iconSize + 12 : 0);
      }
      let curX = startX;
      let pathD = "";
      const baselineY = Math.round(h / 2 + values.size * 0.35);
      for (const g of glyphs) {
        const p = g.getPath(curX, baselineY, values.size);
        pathD += p.toPathData();
        curX += (g.advanceWidth || fontObj.unitsPerEm) * fontScale;
      }
      // Apply both fill and stroke when stroke is enabled
      const fillAttr = `fill="${values.color}"`;
      const strokeAttr =
        values.stroke > 0
          ? `stroke="${values.color}" stroke-width="${values.stroke}"`
          : "";
      textFragment = `<path d="${pathD}" ${fillAttr} ${strokeAttr} />`;
      if (embedStyle)
        textFragment = `<style>${embedStyle}</style>` + textFragment;
    }
  } else {
    const anchor =
      values.layout === "center"
        ? "middle"
        : values.layout === "left"
          ? "start"
          : "end";
    let x;
    if (values.layout === "center") x = w / 2;
    else if (values.layout === "left")
      x = padding + iconSize + (iconSize ? 12 : 0);
    else x = w - padding - (iconSize ? iconSize + 12 : 0);
    const strokeAttr =
      values.stroke > 0
        ? `stroke="${values.color}" stroke-width="${values.stroke}" paint-order="stroke"`
        : "";
    const fontFamily =
      uploadedFont && fontSelect.value === "uploaded"
        ? uploadedFont.postScriptName || uploadedFont.name.replace(/\s+/g, "_")
        : values.font;
    textFragment = `${embedStyle}<text x="${x}" y="${Math.round(h / 2 + values.size * 0.35)}" text-anchor="${anchor}" style="font-family:'${fontFamily}',sans-serif;font-size:${values.size}px;fill:${values.color};">${safeText}</text>`;
  }

  const bgRect = `<rect width="100%" height="100%" fill="${values.bg}" />`;
  const group =
    values.layout === "right" && iconSize
      ? `<g>${textFragment}${iconMarkup}</g>`
      : `<g>${iconMarkup}${textFragment}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}">${bgRect}${group}</svg>`;
  return svg;
}

async function renderPreview() {
  const v = readForm();
  previewWrap.innerHTML = "";
  const svg = await buildSVG(v);
  try {
    // create a blob and objectURL for img fallback
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    // prefer inline SVG when not outline (so fonts apply), otherwise show img
    if (!v.outline) {
      previewWrap.innerHTML = svg;
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) { }
      }, 1500);
    } else {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "SVG preview";
      img.width = Math.min(v.width, 800);
      previewWrap.appendChild(img);
      img.onload = () => {
        URL.revokeObjectURL(url);
      };
    }
  } catch (err) {
    console.error("preview render failed", err);
    previewWrap.textContent = "Preview error";
  }
}

previewBtn.addEventListener("click", renderPreview);

downloadBtn.addEventListener("click", async () => {
  const v = readForm();
  const svg = await buildSVG(v);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const name =
    (v.text || "logo")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w\-_.]/g, "") || "logo";
  a.download = `${name}.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
});

// initial render
renderPreview();
