const NS = "http://www.w3.org/2000/svg";
const widthEl = document.getElementById("width");
const heightEl = document.getElementById("height");
const bgEl = document.getElementById("bg");
const addRectBtn = document.getElementById("addRect");
const addCircleBtn = document.getElementById("addCircle");
const downloadBtn = document.getElementById("download");
const svgContainer = document.getElementById("svgContainer");
const layersEl = document.getElementById("layers");
const bringForwardBtn = document.getElementById("bringForward");
const sendBackwardBtn = document.getElementById("sendBackward");

let elements = []; // {id, type, attrs, visible}
let selectedId = null;
let mode = null; // 'move' | 'resize' | null
let dragStart = null;
let activeHandle = null;

function uid() {
  return "id" + Math.random().toString(36).slice(2, 9);
}

function createSVGRoot() {
  const w = String(widthEl.value);
  const h = String(heightEl.value);
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("xmlns", NS);
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.style.touchAction = "none";
  return svg;
}

function svgPoint(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function addElement(type) {
  const w = parseInt(widthEl.value);
  const h = parseInt(heightEl.value);
  if (type === "rect") {
    const id = uid();
    const el = {
      id,
      type,
      attrs: {
        x: 50,
        y: 50,
        width: 150,
        height: 100,
        fill: "#f6b26b",
        stroke: "#333",
        "stroke-width": 1,
      },
      visible: true,
    };
    elements.push(el);
    selectedId = id;
    render();
  } else if (type === "circle") {
    const id = uid();
    const el = {
      id,
      type,
      attrs: {
        cx: 150,
        cy: 150,
        r: 50,
        fill: "#9fc5e8",
        stroke: "#333",
        "stroke-width": 1,
      },
      visible: true,
    };
    elements.push(el);
    selectedId = id;
    render();
  }
}

function buildSVGDom() {
  svgContainer.innerHTML = "";
  const svg = createSVGRoot();

  // background rect
  const bg = document.createElementNS(NS, "rect");
  bg.setAttribute("x", 0);
  bg.setAttribute("y", 0);
  bg.setAttribute("width", widthEl.value);
  bg.setAttribute("height", heightEl.value);
  bg.setAttribute("fill", bgEl.value);
  svg.appendChild(bg);

  // group for shapes
  elements.forEach((obj) => {
    if (!obj.visible) return;
    const el = document.createElementNS(NS, obj.type);
    el.dataset.id = obj.id;
    for (const [k, v] of Object.entries(obj.attrs))
      el.setAttribute(k, String(v));
    el.addEventListener("mousedown", shapeMouseDown);
    el.addEventListener("click", shapeClick);
    if (obj.id === selectedId) el.classList.add("selected");
    svg.appendChild(el);
  });

  // selection handles
  if (selectedId) {
    const sel = elements.find((e) => e.id === selectedId);
    if (sel && sel.visible) {
      const bbox = getBBoxForElement(sel);
      addHandles(svg, bbox);
    }
  }

  // attach overall listeners
  svg.addEventListener("mousedown", svgMouseDown);
  svg.addEventListener("mousemove", svgMouseMove);
  window.addEventListener("mouseup", svgMouseUp);

  svgContainer.appendChild(svg);
}

function getBBoxForElement(obj) {
  if (obj.type === "rect") {
    return {
      x: obj.attrs.x,
      y: obj.attrs.y,
      width: obj.attrs.width,
      height: obj.attrs.height,
    };
  } else if (obj.type === "circle") {
    const r = obj.attrs.r;
    return {
      x: obj.attrs.cx - r,
      y: obj.attrs.cy - r,
      width: r * 2,
      height: r * 2,
    };
  }
  return { x: 0, y: 0, width: 0, height: 0 };
}

function addHandles(svg, bbox) {
  const pad = 0;
  const coords = [
    { x: bbox.x - pad, y: bbox.y - pad, cursor: "nwse-resize", name: "nw" },
    {
      x: bbox.x + bbox.width + pad,
      y: bbox.y - pad,
      cursor: "nesw-resize",
      name: "ne",
    },
    {
      x: bbox.x - pad,
      y: bbox.y + bbox.height + pad,
      cursor: "nesw-resize",
      name: "sw",
    },
    {
      x: bbox.x + bbox.width + pad,
      y: bbox.y + bbox.height + pad,
      cursor: "nwse-resize",
      name: "se",
    },
  ];
  coords.forEach((c) => {
    const h = document.createElementNS(NS, "rect");
    h.setAttribute("x", c.x - 6);
    h.setAttribute("y", c.y - 6);
    h.setAttribute("width", 12);
    h.setAttribute("height", 12);
    h.setAttribute("class", "handle");
    h.style.cursor = c.cursor;
    h.dataset.handle = c.name;
    h.addEventListener("mousedown", handleMouseDown);
    svg.appendChild(h);
  });
}

function renderLayersPanel() {
  layersEl.innerHTML = "";
  // reverse order for top-first in UI
  [...elements]
    .slice()
    .reverse()
    .forEach((obj) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = `${obj.type} ${obj.id}`;
      name.className = "layer-name";
      const vis = document.createElement("button");
      vis.textContent = obj.visible ? "👁" : "🚫";
      vis.className = "layer-visible";
      vis.addEventListener("click", (e) => {
        e.stopPropagation();
        obj.visible = !obj.visible;
        render();
      });
      li.appendChild(name);
      li.appendChild(vis);
      li.addEventListener("click", () => {
        selectedId = obj.id;
        render();
      });
      layersEl.appendChild(li);
    });
}

function render() {
  buildSVGDom();
  renderLayersPanel();
}

function shapeClick(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  selectedId = id;
  render();
}

function shapeMouseDown(e) {
  e.stopPropagation();
  const svg = svgContainer.querySelector("svg");
  const pt = svgPoint(svg, e.clientX, e.clientY);
  const id = e.currentTarget.dataset.id;
  selectedId = id;
  mode = "move";
  dragStart = { x: pt.x, y: pt.y };
  const obj = elements.find((o) => o.id === id);
  dragStart.orig = JSON.parse(JSON.stringify(obj.attrs));
  render(); // show selection
}

function handleMouseDown(e) {
  e.stopPropagation();
  const svg = svgContainer.querySelector("svg");
  const pt = svgPoint(svg, e.clientX, e.clientY);
  activeHandle = e.currentTarget.dataset.handle;
  mode = "resize";
  dragStart = {
    x: pt.x,
    y: pt.y,
    origId: selectedId,
    origAttrs: JSON.parse(
      JSON.stringify(elements.find((o) => o.id === selectedId).attrs),
    ),
  };
}

function svgMouseDown(e) {
  // click on empty area: deselect
  if (e.target === svgContainer.querySelector("svg")) {
    selectedId = null;
    render();
  }
}

function svgMouseMove(e) {
  if (!mode) return;
  const svg = svgContainer.querySelector("svg");
  const pt = svgPoint(svg, e.clientX, e.clientY);

  if (mode === "move" && selectedId && dragStart) {
    const obj = elements.find((o) => o.id === selectedId);
    const dx = pt.x - dragStart.x;
    const dy = pt.y - dragStart.y;
    if (obj.type === "rect") {
      obj.attrs.x = dragStart.orig.x + dx;
      obj.attrs.y = dragStart.orig.y + dy;
    } else if (obj.type === "circle") {
      obj.attrs.cx = dragStart.orig.cx + dx;
      obj.attrs.cy = dragStart.orig.cy + dy;
    }
    // live render
    updateShapeDOM(obj);
  }

  if (mode === "resize" && selectedId && dragStart) {
    const obj = elements.find((o) => o.id === selectedId);
    const ox = dragStart.x,
      oy = dragStart.y;
    const nx = pt.x,
      ny = pt.y;
    const dx = nx - ox,
      dy = ny - oy;
    const a = dragStart.origAttrs;

    if (obj.type === "rect") {
      // handle: nw, ne, sw, se
      if (activeHandle === "se") {
        obj.attrs.width = Math.max(4, a.width + dx);
        obj.attrs.height = Math.max(4, a.height + dy);
      } else if (activeHandle === "nw") {
        obj.attrs.x = a.x + dx;
        obj.attrs.y = a.y + dy;
        obj.attrs.width = Math.max(4, a.width - dx);
        obj.attrs.height = Math.max(4, a.height - dy);
      } else if (activeHandle === "ne") {
        obj.attrs.y = a.y + dy;
        obj.attrs.width = Math.max(4, a.width + dx);
        obj.attrs.height = Math.max(4, a.height - dy);
      } else if (activeHandle === "sw") {
        obj.attrs.x = a.x + dx;
        obj.attrs.width = Math.max(4, a.width - dx);
        obj.attrs.height = Math.max(4, a.height + dy);
      }
    } else if (obj.type === "circle") {
      // scale radius by dx/dy (use max)
      const startCenter = { cx: a.cx, cy: a.cy };
      let newR = Math.max(2, a.r + Math.max(dx, dy));
      if (activeHandle === "nw" || activeHandle === "ne") {
        newR = Math.max(2, a.r - Math.max(-dx, -dy));
      }
      obj.attrs.r = newR;
    }
    updateShapeDOM(obj);
  }
}

function svgMouseUp() {
  mode = null;
  activeHandle = null;
  dragStart = null;
}

function updateShapeDOM(obj) {
  const svg = svgContainer.querySelector("svg");
  if (!svg) return;
  const dom = svg.querySelector(`[data-id="${obj.id}"]`);
  if (!dom) {
    render();
    return;
  }
  for (const [k, v] of Object.entries(obj.attrs))
    dom.setAttribute(k, String(v));
  // update handles by re-rendering selection overlay
  // lightweight: remove and re-add handles by rebuilding selection (not whole svg)
  render();
}

addRectBtn.addEventListener("click", () => addElement("rect"));
addCircleBtn.addEventListener("click", () => addElement("circle"));

downloadBtn.addEventListener("click", () => {
  const svg = createSVGRoot();
  // background
  const bg = document.createElementNS(NS, "rect");
  bg.setAttribute("x", 0);
  bg.setAttribute("y", 0);
  bg.setAttribute("width", widthEl.value);
  bg.setAttribute("height", heightEl.value);
  bg.setAttribute("fill", bgEl.value);
  svg.appendChild(bg);

  elements.forEach((obj) => {
    if (!obj.visible) return;
    const el = document.createElementNS(NS, obj.type);
    for (const [k, v] of Object.entries(obj.attrs))
      el.setAttribute(k, String(v));
    svg.appendChild(el);
  });

  const serializer = new XMLSerializer();
  let str = serializer.serializeToString(svg);
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

// layer move buttons
bringForwardBtn.addEventListener("click", () => {
  if (!selectedId) return;
  const idx = elements.findIndex((e) => e.id === selectedId);
  if (idx < elements.length - 1) {
    const [it] = elements.splice(idx, 1);
    elements.splice(idx + 1, 0, it);
    render();
  }
});
sendBackwardBtn.addEventListener("click", () => {
  if (!selectedId) return;
  const idx = elements.findIndex((e) => e.id === selectedId);
  if (idx > 0) {
    const [it] = elements.splice(idx, 1);
    elements.splice(idx - 1, 0, it);
    render();
  }
});

// initial
render();
