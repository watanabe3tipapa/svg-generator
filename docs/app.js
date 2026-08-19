// Craft Desk: 入力を即時に成果物へ反映し、技術設定は必要なときだけ判断できるようにする。
// Requires opentype.js (loaded in index.html).
const form = document.getElementById("form");
const previewWrap = document.getElementById("preview");
const downloadBtn = document.getElementById("downloadBtn");
const copyBtn = document.getElementById("copyBtn");
const resetBtn = document.getElementById("resetBtn");
const statusMessage = document.getElementById("statusMessage");
const previewState = document.getElementById("previewState");
const fontFileInput = document.getElementById("fontFile");
const fontSelect = document.getElementById("fontSelect");
const outlineCheck = document.getElementById("outlineCheck");
const embedCheck = document.getElementById("embedCheck");

let uploadedFont = null; // {name, arrayBuffer, postScriptName, fileName}
let uploadedFontBlobUrl = null;
let loadedFontFace = null;
let renderedSvg = "";
let renderTimer = null;
let renderVersion = 0;

const presetValues = {
  simple: {
    text: "YourBrand",
    font: "Noto Sans JP",
    size: 56,
    color: "#111827",
    bg: "#ffffff",
    stroke: 0,
    icon: "none",
    layout: "center",
    width: 1200,
    height: 300,
    outline: false,
    embedFont: false,
  },
  badge: {
    text: "YourBrand",
    font: "Noto Sans JP",
    size: 64,
    color: "#E4572E",
    bg: "#FFF8F2",
    stroke: 0,
    icon: "circle",
    layout: "left",
    width: 1200,
    height: 300,
    outline: false,
    embedFont: false,
  },
  wide: {
    text: "YourBrand",
    font: "Inter",
    size: 80,
    color: "#111827",
    bg: "#ffffff",
    stroke: 0,
    icon: "none",
    layout: "center",
    width: 1600,
    height: 320,
    outline: false,
    embedFont: false,
  },
};

function setStatus(message, tone = "neutral") {
  statusMessage.textContent = message;
  statusMessage.dataset.tone = tone;
  previewState.classList.toggle("is-updating", tone === "updating");
}

function escapeXml(unsafe) {
  return String(unsafe).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character],
  );
}

function numberInRange(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function readForm() {
  const fd = new FormData(form);
  const text = String(fd.get("text") || "").replace(/[\r\n]+/g, " ").trim();
  return {
    text: text || "Logo",
    font: fd.get("font") || "Noto Sans JP",
    size: numberInRange(fd.get("size"), 56, 8, 512),
    color: fd.get("color") || "#111827",
    bg: fd.get("bg") || "#ffffff",
    stroke: numberInRange(fd.get("stroke"), 0, 0, 10),
    icon: fd.get("icon") || "none",
    layout: fd.get("layout") || "center",
    width: numberInRange(fd.get("width"), 1200, 64, 4096),
    height: numberInRange(fd.get("height"), 300, 32, 4096),
    outline: outlineCheck.checked,
    embedFont: embedCheck.checked,
  };
}

function updateControlOutputs() {
  document.getElementById("sizeOutput").textContent = form.elements.size.value;
  document.getElementById("strokeOutput").textContent = form.elements.stroke.value;
  document.getElementById("colorOutput").textContent = form.elements.color.value.toUpperCase();
  document.getElementById("bgOutput").textContent = form.elements.bg.value.toUpperCase();
}

function applyPreset(name) {
  const values = presetValues[name];
  if (!values) return;
  Object.entries(values).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (!field) return;
    if (field.type === "checkbox") field.checked = value;
    else field.value = value;
  });
  updateControlOutputs();
  setStatus(`「${document.querySelector(`[data-preset="${name}"]`).textContent}」を適用しました。`, "updating");
  scheduleRender();
}

fontFileInput.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  setStatus("フォントを読み込んでいます…", "updating");
  try {
    const arrayBuffer = await file.arrayBuffer();
    const font = opentype.parse(arrayBuffer);
    const name =
      (font.names &&
        font.names.fullName &&
        (font.names.fullName.en || Object.values(font.names.fullName)[0])) ||
      file.name ||
      "UploadedFont";
    const postScriptName =
      (font.names &&
        font.names.postScriptName &&
        (font.names.postScriptName.en || Object.values(font.names.postScriptName)[0])) ||
      name.replace(/\s+/g, "_");

    uploadedFont = { name, arrayBuffer, postScriptName, fileName: file.name };
    const option = Array.from(fontSelect.options).find((item) => item.value === "uploaded");
    option.text = `${name}（アップロード済み）`;
    fontSelect.value = "uploaded";

    if (uploadedFontBlobUrl) URL.revokeObjectURL(uploadedFontBlobUrl);
    if (loadedFontFace) {
      try {
        document.fonts.delete(loadedFontFace);
      } catch (error) {
        console.warn("Failed to remove previous FontFace", error);
      }
    }

    const blob = new Blob([arrayBuffer], { type: "font/otf" });
    uploadedFontBlobUrl = URL.createObjectURL(blob);
    try {
      const fontFace = new FontFace(postScriptName, `url(${uploadedFontBlobUrl})`);
      await fontFace.load();
      document.fonts.add(fontFace);
      loadedFontFace = fontFace;
    } catch (error) {
      console.warn("FontFace load failed:", error);
    }

    setStatus(`「${name}」を追加しました。プレビューに反映しています。`, "updating");
    scheduleRender();
  } catch (error) {
    console.error("Font parsing error:", error);
    setStatus("フォントを読み込めませんでした。対応する .ttf / .otf / .woff / .woff2 を選んでください。", "error");
  }
});

async function buildSVG(values) {
  const width = Math.max(1, Math.round(values.width));
  const height = Math.max(1, Math.round(values.height));
  const viewBox = `0 0 ${width} ${height}`;
  const padding = Math.min(24, Math.floor(height * 0.12));
  const maxIcon = Math.min(height - padding * 2, 96);
  const iconSize = values.icon === "none" ? 0 : Math.round(Math.min(maxIcon, height * 0.6));
  const safeText = escapeXml(values.text);

  let embedStyle = "";
  if (values.embedFont && uploadedFont) {
    try {
      const bytes = new Uint8Array(uploadedFont.arrayBuffer);
      let binary = "";
      for (let index = 0; index < bytes.byteLength; index += 1) binary += String.fromCharCode(bytes[index]);
      const encodedFont = btoa(binary);
      const fileName = uploadedFont.fileName.toLowerCase();
      let fontMime = "font/otf";
      let fontFormat = "opentype";
      if (fileName.endsWith(".woff2")) {
        fontMime = "font/woff2";
        fontFormat = "woff2";
      } else if (fileName.endsWith(".woff")) {
        fontMime = "font/woff";
        fontFormat = "woff";
      } else if (fileName.endsWith(".ttf")) {
        fontMime = "font/ttf";
        fontFormat = "truetype";
      }
      const family = uploadedFont.postScriptName || uploadedFont.name.replace(/\s+/g, "_");
      embedStyle = `@font-face{font-family:"${family}";src:url("data:${fontMime};base64,${encodedFont}") format("${fontFormat}");font-weight:normal;font-style:normal;font-display:swap;}`;
    } catch (error) {
      console.error("Font embedding failed:", error);
    }
  }

  let iconMarkup = "";
  if (values.icon === "circle") {
    const cx = padding + iconSize / 2;
    iconMarkup = `<circle cx="${cx}" cy="${height / 2}" r="${iconSize / 2}" fill="${values.color}" />`;
  } else if (values.icon === "square") {
    const y = Math.round((height - iconSize) / 2);
    iconMarkup = `<rect x="${padding}" y="${y}" width="${iconSize}" height="${iconSize}" rx="${Math.round(iconSize * 0.12)}" fill="${values.color}" />`;
  }

  const anchor = values.layout === "center" ? "middle" : values.layout === "left" ? "start" : "end";
  let textX = width / 2;
  if (values.layout === "left") textX = padding + iconSize + (iconSize ? 12 : 0);
  if (values.layout === "right") textX = width - padding - (iconSize ? iconSize + 12 : 0);
  const strokeAttribute = values.stroke > 0
    ? `stroke="${values.color}" stroke-width="${values.stroke}" paint-order="stroke"`
    : "";
  const fontFamily = uploadedFont && fontSelect.value === "uploaded"
    ? uploadedFont.postScriptName || uploadedFont.name.replace(/\s+/g, "_")
    : values.font;
  const baseline = Math.round(height / 2 + values.size * 0.35);
  let textFragment = "";

  if (values.outline) {
    let fontObject = null;
    if (uploadedFont) {
      try {
        fontObject = opentype.parse(uploadedFont.arrayBuffer);
      } catch (error) {
        console.warn("Could not parse uploaded font for outline:", error);
      }
    }
    if (!fontObject && values.font === "Inter") {
      try {
        const response = await fetch("https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3i9w2k.woff");
        fontObject = opentype.parse(await response.arrayBuffer());
      } catch (error) {
        console.warn("Could not load Inter for outline:", error);
      }
    }

    if (fontObject) {
      const glyphs = fontObject.stringToGlyphs(values.text);
      const fontScale = values.size / fontObject.unitsPerEm;
      const totalAdvance = glyphs.reduce((sum, glyph) => sum + (glyph.advanceWidth || fontObject.unitsPerEm), 0) * fontScale;
      let cursorX = values.layout === "center"
        ? (width - totalAdvance) / 2
        : values.layout === "left"
          ? padding + iconSize + (iconSize ? 12 : 0)
          : width - padding - totalAdvance - (iconSize ? iconSize + 12 : 0);
      let pathData = "";
      glyphs.forEach((glyph) => {
        pathData += glyph.getPath(cursorX, baseline, values.size).toPathData();
        cursorX += (glyph.advanceWidth || fontObject.unitsPerEm) * fontScale;
      });
      textFragment = `${embedStyle ? `<style>${embedStyle}</style>` : ""}<path d="${pathData}" fill="${values.color}" ${strokeAttribute} />`;
    } else {
      textFragment = `${embedStyle ? `<style>${embedStyle}</style>` : ""}<text x="${textX}" y="${baseline}" text-anchor="${anchor}" ${strokeAttribute} style="font-family:'${fontFamily}',sans-serif;font-size:${values.size}px;fill:${values.color};">${safeText}</text>`;
    }
  } else {
    textFragment = `${embedStyle ? `<style>${embedStyle}</style>` : ""}<text x="${textX}" y="${baseline}" text-anchor="${anchor}" ${strokeAttribute} style="font-family:'${fontFamily}',sans-serif;font-size:${values.size}px;fill:${values.color};">${safeText}</text>`;
  }

  const group = values.layout === "right" && iconSize
    ? `<g>${textFragment}${iconMarkup}</g>`
    : `<g>${iconMarkup}${textFragment}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}"><rect width="100%" height="100%" fill="${values.bg}" />${group}</svg>`;
}

async function renderPreview() {
  const version = ++renderVersion;
  const values = readForm();
  try {
    const svg = await buildSVG(values);
    if (version !== renderVersion) return;
    renderedSvg = svg;
    previewWrap.innerHTML = values.outline ? "" : svg;

    if (values.outline) {
      const image = document.createElement("img");
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      image.src = url;
      image.alt = "作成中のSVGプレビュー";
      image.onload = () => URL.revokeObjectURL(url);
      previewWrap.appendChild(image);
    }
    setStatus("プレビューに反映しました。", "success");
  } catch (error) {
    console.error("Preview render failed:", error);
    previewWrap.textContent = "プレビューを更新できませんでした。設定を見直してもう一度お試しください。";
    setStatus("プレビューを更新できませんでした。", "error");
  }
}

function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(renderPreview, 120);
}

async function copySvg() {
  try {
    const svg = await buildSVG(readForm());
    renderedSvg = svg;
    await navigator.clipboard.writeText(svg);
    setStatus("SVGコードをコピーしました。", "success");
    copyBtn.textContent = "コピーしました";
    window.setTimeout(() => { copyBtn.textContent = "SVGコードをコピー"; }, 1800);
  } catch (error) {
    console.error("Could not copy SVG:", error);
    setStatus("コピーできませんでした。HTTPS環境で再度お試しください。", "error");
  }
}

async function downloadSvg() {
  const values = readForm();
  const svg = await buildSVG(values);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  const fileName = (values.text || "logo")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[\\/:*?"<>|]/g, "") || "logo";
  anchor.download = `${fileName}.svg`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1500);
  setStatus(`「${anchor.download}」を書き出しました。`, "success");
}

form.addEventListener("input", () => {
  updateControlOutputs();
  setStatus("プレビューを更新しています…", "updating");
  scheduleRender();
});
form.addEventListener("change", () => {
  updateControlOutputs();
  setStatus("プレビューを更新しています…", "updating");
  scheduleRender();
});
document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});
downloadBtn.addEventListener("click", downloadSvg);
copyBtn.addEventListener("click", copySvg);
resetBtn.addEventListener("click", () => {
  form.reset();
  form.elements.font.value = "Noto Sans JP";
  updateControlOutputs();
  setStatus("初期値に戻しました。", "updating");
  scheduleRender();
});

updateControlOutputs();
renderPreview();
