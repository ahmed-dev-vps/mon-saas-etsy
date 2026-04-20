const { readJson, writeJson } = require("../utils/fileStore");
const { normalizeCanvas } = require("../services/canvasService");

function buildGlobalCanvas({ id, name, type, width, height, printableArea, mockupUrl }) {
  return normalizeCanvas({
    id,
    name,
    type,
    width,
    height,
    printableArea,
    mockupUrl: mockupUrl || "",
    isGlobal: true,
    userId: null,
    createdAt: new Date().toISOString(),
  });
}

async function createGlobalCanvases() {
  const existing = (await readJson("canvases.json", [])).map(normalizeCanvas);
  const byId = new Map(existing.map((c) => [c.id, c]));

  const templates = [
    buildGlobalCanvas({
      id: "gbl_mug",
      name: "Mug",
      type: "mug",
      width: 1200,
      height: 900,
      printableArea: { x: 140, y: 160, width: 920, height: 520 },
    }),
    buildGlobalCanvas({
      id: "gbl_tshirt",
      name: "T-shirt",
      type: "tshirt",
      width: 1800,
      height: 2000,
      printableArea: { x: 300, y: 320, width: 1200, height: 1400 },
    }),
    buildGlobalCanvas({
      id: "gbl_totebag",
      name: "Tote bag",
      type: "totebag",
      width: 1600,
      height: 2000,
      printableArea: { x: 250, y: 400, width: 1100, height: 1200 },
    }),
    buildGlobalCanvas({
      id: "gbl_poster",
      name: "Poster",
      type: "poster",
      width: 2000,
      height: 2800,
      printableArea: { x: 150, y: 150, width: 1700, height: 2500 },
    }),
    buildGlobalCanvas({
      id: "gbl_hoodie",
      name: "Hoodie",
      type: "hoodie",
      width: 2000,
      height: 2200,
      printableArea: { x: 380, y: 420, width: 1240, height: 1300 },
    }),
  ];

  let changed = false;
  for (const tpl of templates) {
    if (!byId.has(tpl.id)) {
      byId.set(tpl.id, tpl);
      changed = true;
    } else {
      const current = byId.get(tpl.id);
      if (!current.isGlobal || current.userId !== null) {
        byId.set(tpl.id, tpl);
        changed = true;
      }
    }
  }

  // Migrate old fields once (mockup -> mockupUrl, missing isGlobal/userId)
  const normalizedAll = Array.from(byId.values()).map(normalizeCanvas);
  if (changed) {
    await writeJson("canvases.json", normalizedAll);
    return { created: templates.length, total: normalizedAll.length };
  }

  // Still ensure file is normalized if legacy shapes exist
  const legacyDetected = JSON.stringify(existing) !== JSON.stringify(normalizedAll);
  if (legacyDetected) {
    await writeJson("canvases.json", normalizedAll);
  }
  return { created: 0, total: normalizedAll.length };
}

module.exports = {
  createGlobalCanvases,
};

