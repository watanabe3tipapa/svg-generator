const NS = "http://www.w3.org/2000/svg";
const widthEl = document.getElementById("width");
const heightEl = document.getElementById("height");
const bgEl = document.getElementById("bg");
const addRectBtn = document.getElementById("addRect");
const generateBtn = document.getElementById("generate");
const downloadBtn = document.getElementById("download");
const svgContainer = document.getElementById("svgContainer");

let elements = []; // 簡易オブジェクト配列：{type, attrs}

addRectBtn.addEventListener("click", () => {
  // デモ用のランダム長方形を追加
  const w = Math.floor(Math.random() * 200) + 50;
  const h = Math.floor(Math.random() * 150) + 30;
  const x = Math.floor(Math.random() * (parseInt(widthEl.value) - w));
  const y = Math.floor(Math.random() * (parseInt(heightEl.value) - h));
  const color =
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0");
  elements.push({
    type: "rect",
    attrs: {
      x,
      y,
      width: w,
      height: h,
      fill: color,
      stroke: "#000",
      "stroke-width": 1,
    },
  });
  renderPreview();
});

function createSVGDocument() {
  const w = String(widthEl.value);
  const h = String(heightEl.value);
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("xmlns", NS);
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

  // 背景用rect
  const bg = document.createElementNS(NS, "rect");
  bg.setAttribute("x", 0);
  bg.setAttribute("y", 0);
  bg.setAttribute("width", w);
  bg.setAttribute("height", h);
  bg.setAttribute("fill", bgEl.value);
  svg.appendChild(bg);

  elements.forEach((e) => {
    const el = document.createElementNS(NS, e.type);
    for (const [k, v] of Object.entries(e.attrs)) el.setAttribute(k, String(v));
    svg.appendChild(el);
  });

  return svg;
}

function renderPreview() {
  svgContainer.innerHTML = "";
  const svg = createSVGDocument();
  svgContainer.appendChild(svg);
}

generateBtn.addEventListener("click", renderPreview);

downloadBtn.addEventListener("click", () => {
  const svg = createSVGDocument();
  const serializer = new XMLSerializer();
  let str = serializer.serializeToString(svg);

  // XML prolog を付ける（互換性向上）
  if (!str.startsWith("<?xml"))
    str = '<?xml version="1.0" encoding="UTF-8"?>\n' + str;

  const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "image.svg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});
