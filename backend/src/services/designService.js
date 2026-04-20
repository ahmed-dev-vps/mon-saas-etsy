const { readJson, writeJson } = require("../utils/fileStore");

function buildDefaultZone(canvas) {
  if (!canvas) {
    return { width: 320, height: 240 };
  }
  return {
    width: canvas.printableArea?.width || canvas.width || 320,
    height: canvas.printableArea?.height || canvas.height || 240,
  };
}

const emptyDesign = {
  zone: buildDefaultZone(null),
  text: "",
  imageUrl: "",
  scene: null,
};

async function getDesign(orderId, canvas) {
  const designs = await readJson("designs.json", {});
  if (designs[orderId]) {
    return designs[orderId];
  }
  return {
    zone: buildDefaultZone(canvas),
    text: "",
    imageUrl: "",
    scene: null,
  };
}

async function saveDesign(orderId, design) {
  const designs = await readJson("designs.json", {});
  designs[orderId] = {
    zone: design.zone || emptyDesign.zone,
    text: design.text || "",
    imageUrl: design.imageUrl || "",
    scene: design.scene || null,
  };
  await writeJson("designs.json", designs);
  return designs[orderId];
}

function buildMockup(design) {
  return {
    product: "Classic POD Mockup",
    backgroundColor: "#f3f4f6",
    overlay: {
      text: design.text || "",
      imageUrl: design.imageUrl || "",
      zone: design.zone || emptyDesign.zone,
    },
  };
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildExportSvg(orderId, design) {
  const text = escapeXml(design.text || "");
  const imageUrl = escapeXml(design.imageUrl || "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="40" y="70" font-size="28" font-family="Arial" fill="#111827">Design export for ${escapeXml(orderId)}</text>
  <rect x="40" y="110" width="720" height="430" fill="#f3f4f6" stroke="#d1d5db" />
  <text x="60" y="165" font-size="24" font-family="Arial" fill="#1f2937">${text}</text>
  <text x="60" y="210" font-size="14" font-family="Arial" fill="#6b7280">Image URL: ${imageUrl}</text>
</svg>`;
}

module.exports = {
  getDesign,
  saveDesign,
  buildMockup,
  buildExportSvg,
};
