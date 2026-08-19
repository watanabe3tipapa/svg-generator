/** Core SVG Studio model and deterministic SVG/PNG helpers shared by the editor UI. */
export type IconName = "none" | "circle" | "square" | "star" | "spark" | "leaf" | "custom";
export type LayoutName = "center" | "left" | "right";
export type TextMode = "straight" | "arc";
export type SourceMode = "generated" | "code";

export type StudioSettings = {
  projectName: string;
  text: string;
  subtext: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  textColor: string;
  accentColor: string;
  backgroundColor: string;
  transparent: boolean;
  width: number;
  height: number;
  icon: IconName;
  layout: LayoutName;
  textMode: TextMode;
  arcHeight: number;
  iconScale: number;
  iconRotation: number;
  pathOffsetX: number;
  pathOffsetY: number;
  customPath: string;
  sourceMode: SourceMode;
  rawSvgCode: string;
};

export const defaultSettings: StudioSettings = {
  projectName: "Untitled SVG",
  text: "YourBrand",
  subtext: "あなたのスタイルを、SVGへ",
  fontFamily: "Noto Sans JP",
  fontWeight: 700,
  fontSize: 96,
  letterSpacing: 0,
  lineHeight: 1.2,
  textColor: "#1C282C",
  accentColor: "#E4572E",
  backgroundColor: "#FFFDF9",
  transparent: false,
  width: 1200,
  height: 360,
  icon: "circle",
  layout: "left",
  textMode: "straight",
  arcHeight: 56,
  iconScale: 1,
  iconRotation: 0,
  pathOffsetX: 0,
  pathOffsetY: 0,
  customPath: "M10 50 C25 8 72 8 90 50 C72 92 25 92 10 50 Z",
  sourceMode: "generated",
  rawSvgCode: "",
};

export const canvasPresets = [
  { id: "logo", label: "横長ロゴ", width: 1200, height: 360 },
  { id: "square", label: "正方形投稿", width: 1080, height: 1080 },
  { id: "profile", label: "プロフィール", width: 800, height: 800 },
  { id: "header", label: "Webヘッダー", width: 1600, height: 500 },
  { id: "card", label: "名刺横", width: 1050, height: 600 },
] as const;

export const palettes = [
  { name: "Craft Desk", textColor: "#1C282C", accentColor: "#E4572E", backgroundColor: "#FFFDF9" },
  { name: "Night Signal", textColor: "#F8F4EA", accentColor: "#FFB000", backgroundColor: "#10272D" },
  { name: "Forest Note", textColor: "#163B35", accentColor: "#5E8C6A", backgroundColor: "#F3F2E9" },
  { name: "Indigo Edit", textColor: "#20223E", accentColor: "#5865C5", backgroundColor: "#F0F1FF" },
  { name: "Mono Print", textColor: "#161616", accentColor: "#161616", backgroundColor: "#FFFFFF" },
] as const;

const iconPaths: Record<Exclude<IconName, "none" | "custom">, string> = {
  circle: "M50 5 A45 45 0 1 0 50.001 5 Z",
  square: "M18 18 H82 V82 H18 Z",
  star: "M50 7 L60.8 35.2 L91 36.4 L67.4 55.6 L75.8 85 L50 68 L24.2 85 L32.6 55.6 L9 36.4 L39.2 35.2 Z",
  spark: "M50 4 L58 39 L96 50 L58 61 L50 96 L42 61 L4 50 L42 39 Z",
  leaf: "M14 79 C18 32 50 9 88 12 C84 53 62 84 21 88 C42 66 56 49 74 26 C46 39 29 57 14 79 Z",
};

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ?? character);
}

function cleanColor(value: string, fallback: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : fallback;
}

export function sanitizeSvgCode(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:href|xlink:href)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, "")
    .trim();
}

function createTextMarkup(settings: StudioSettings, x: number, y: number, anchor: "start" | "middle" | "end") {
  const lines = settings.text.split(/\r?\n/).filter(Boolean).slice(0, 4);
  const safeLines = (lines.length ? lines : ["Logo"]).map(escapeXml);
  const textStyle = `font-family=&quot;${escapeXml(settings.fontFamily)}&quot;, sans-serif;font-size:${settings.fontSize}px;font-weight:${settings.fontWeight};letter-spacing:${settings.letterSpacing}px;fill:${cleanColor(settings.textColor, "#1C282C")};`;
  const lineGap = Math.round(settings.fontSize * settings.lineHeight);
  const startY = y - ((safeLines.length - 1) * lineGap) / 2;

  if (settings.textMode === "arc") {
    const arc = Math.max(10, Math.min(settings.arcHeight, settings.height * 0.42));
    const left = Math.round(settings.width * 0.16);
    const right = Math.round(settings.width * 0.84);
    const text = escapeXml(safeLines.join(" "));
    return `<defs><path id="studioArc" d="M ${left} ${y + arc} Q ${settings.width / 2} ${y - arc} ${right} ${y + arc}" fill="none" /></defs><text style="${textStyle}"><textPath href="#studioArc" startOffset="50%" text-anchor="middle">${text}</textPath></text>`;
  }

  return `<text x="${x}" y="${startY}" text-anchor="${anchor}" style="${textStyle}">${safeLines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineGap}">${line}</tspan>`).join("")}</text>`;
}

function createIconMarkup(settings: StudioSettings, centerX: number, centerY: number, size: number) {
  if (settings.icon === "none") return "";
  const path = settings.icon === "custom" ? settings.customPath : iconPaths[settings.icon];
  if (!path) return "";
  const scale = (size / 100) * Math.max(0.25, Math.min(settings.iconScale, 2.5));
  const transform = `translate(${centerX + settings.pathOffsetX} ${centerY + settings.pathOffsetY}) rotate(${settings.iconRotation}) scale(${scale}) translate(-50 -50)`;
  return `<g transform="${transform}"><path d="${escapeXml(path)}" fill="${cleanColor(settings.accentColor, "#E4572E")}" /></g>`;
}

export function createSvgMarkup(settings: StudioSettings) {
  if (settings.sourceMode === "code" && settings.rawSvgCode.trim()) return sanitizeSvgCode(settings.rawSvgCode);

  const width = Math.max(64, Math.min(Math.round(settings.width), 4096));
  const height = Math.max(64, Math.min(Math.round(settings.height), 4096));
  const padding = Math.max(28, Math.round(Math.min(width, height) * 0.08));
  const iconSize = Math.min(height * 0.42, 170);
  const hasIcon = settings.icon !== "none";
  const textAnchor = settings.layout === "center" ? "middle" : settings.layout === "left" ? "start" : "end";
  const textX = settings.layout === "center" ? width / 2 : settings.layout === "left" ? padding + (hasIcon ? iconSize + 24 : 0) : width - padding - (hasIcon ? iconSize + 24 : 0);
  const iconX = settings.layout === "right" ? width - padding - iconSize / 2 : padding + iconSize / 2;
  const baseline = height / 2 - (settings.subtext.trim() ? 12 : 0);
  const background = settings.transparent ? "" : `<rect width="100%" height="100%" fill="${cleanColor(settings.backgroundColor, "#FFFFFF")}" />`;
  const icon = hasIcon ? createIconMarkup(settings, iconX, height / 2, iconSize) : "";
  const text = createTextMarkup(settings, textX, baseline, textAnchor);
  const subtext = settings.subtext.trim()
    ? `<text x="${textX}" y="${Math.min(height - padding, baseline + settings.fontSize * 0.82)}" text-anchor="${textAnchor}" style="font-family:&quot;${escapeXml(settings.fontFamily)}&quot;,sans-serif;font-size:${Math.max(12, Math.round(settings.fontSize * 0.18))}px;font-weight:700;letter-spacing:${Math.max(1, settings.letterSpacing + 2)}px;fill:${cleanColor(settings.accentColor, "#E4572E")};">${escapeXml(settings.subtext.trim())}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(settings.projectName || settings.text)}">${background}${icon}${text}${subtext}</svg>`;
}

export function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function downloadPng(svg: string, filename: string) {
  const image = new Image();
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("PNG変換に失敗しました。"));
    image.src = objectUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || 1200;
  canvas.height = image.naturalHeight || 360;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PNG変換を開始できませんでした。");
  context.drawImage(image, 0, 0);
  URL.revokeObjectURL(objectUrl);
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${filename || "svg-logo"}.png`;
  link.click();
}

export function downloadSvg(svg: string, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  link.download = `${filename || "svg-logo"}.svg`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export function encodeSettings(settings: StudioSettings) {
  const bytes = new TextEncoder().encode(JSON.stringify(settings));
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSettings(encoded: string): Partial<StudioSettings> | null {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((encoded.length + 3) % 4);
    const bytes = Uint8Array.from(atob(padded), character => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
