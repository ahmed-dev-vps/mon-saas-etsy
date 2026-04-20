const crypto = require("crypto");
const { readJson, writeJson } = require("../utils/fileStore");

function normalizeCanvas(raw) {
  const isGlobal =
    raw.isGlobal !== undefined
      ? Boolean(raw.isGlobal)
      : raw.userId
        ? false
        : true;

  return {
    id: raw.id,
    name: raw.name,
    type: raw.type || (isGlobal ? (raw.name || "template").toLowerCase().replaceAll(" ", "_") : "custom"),
    width: Number(raw.width),
    height: Number(raw.height),
    printableArea: {
      x: Number(raw.printableArea?.x || 0),
      y: Number(raw.printableArea?.y || 0),
      width: Number(raw.printableArea?.width || raw.width || 0),
      height: Number(raw.printableArea?.height || raw.height || 0),
    },
    mockupUrl: raw.mockupUrl ?? raw.mockup ?? "",
    isGlobal,
    userId: isGlobal ? null : raw.userId || null,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

async function readAllCanvases() {
  const canvases = await readJson("canvases.json", []);
  return canvases.map(normalizeCanvas);
}

async function writeAllCanvases(canvases) {
  await writeJson("canvases.json", canvases);
}

async function getCanvasById(canvasId) {
  const canvases = await readAllCanvases();
  return canvases.find((canvas) => canvas.id === canvasId) || null;
}

async function getCanvases(userId) {
  const canvases = await readAllCanvases();
  return canvases.filter((canvas) => canvas.isGlobal === true || canvas.userId === userId);
}

async function createCanvasForUser(userId, payload) {
  const canvases = await readAllCanvases();
  const canvas = {
    id: `cnv_${crypto.randomBytes(6).toString("hex")}`,
    name: payload.name,
    type: payload.type || "custom",
    width: Number(payload.width),
    height: Number(payload.height),
    printableArea: {
      x: Number(payload.printableArea?.x || 0),
      y: Number(payload.printableArea?.y || 0),
      width: Number(payload.printableArea?.width || payload.width || 0),
      height: Number(payload.printableArea?.height || payload.height || 0),
    },
    mockupUrl: payload.mockupUrl || "",
    isGlobal: false,
    userId,
    createdAt: new Date().toISOString(),
  };
  canvases.push(canvas);
  await writeAllCanvases(canvases);
  return canvas;
}

async function updateCanvasForUser(userId, canvasId, payload) {
  const canvases = await readAllCanvases();
  const target = canvases.find((canvas) => canvas.id === canvasId);
  if (!target) {
    return null;
  }
  if (target.isGlobal) {
    return { error: "GLOBAL_TEMPLATE" };
  }
  if (target.userId !== userId) {
    return null;
  }

  target.name = payload.name ?? target.name;
  target.type = payload.type ?? target.type;
  target.width = payload.width !== undefined ? Number(payload.width) : target.width;
  target.height = payload.height !== undefined ? Number(payload.height) : target.height;
  target.printableArea = {
    x: payload.printableArea?.x !== undefined ? Number(payload.printableArea.x) : target.printableArea.x,
    y: payload.printableArea?.y !== undefined ? Number(payload.printableArea.y) : target.printableArea.y,
    width:
      payload.printableArea?.width !== undefined
        ? Number(payload.printableArea.width)
        : target.printableArea.width,
    height:
      payload.printableArea?.height !== undefined
        ? Number(payload.printableArea.height)
        : target.printableArea.height,
  };
  target.mockupUrl = payload.mockupUrl !== undefined ? payload.mockupUrl : target.mockupUrl;

  await writeAllCanvases(canvases);
  return target;
}

module.exports = {
  getCanvases,
  getCanvasById,
  createCanvasForUser,
  updateCanvasForUser,
  normalizeCanvas,
};
