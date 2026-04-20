const {
  getCanvases,
  getCanvasById,
  createCanvasForUser,
  updateCanvasForUser,
} = require("../services/canvasService");

function isValidCanvasPayload(payload) {
  return (
    payload &&
    payload.name &&
    payload.type &&
    Number(payload.width) > 0 &&
    Number(payload.height) > 0 &&
    payload.printableArea &&
    Number(payload.printableArea.width) > 0 &&
    Number(payload.printableArea.height) > 0
  );
}

async function getSellerCanvases(req, res) {
  const canvases = await getCanvases(req.seller.userId);
  return res.json({ canvases });
}

async function createSellerCanvas(req, res) {
  if (!isValidCanvasPayload(req.body)) {
    return res.status(400).json({ message: "Canvas name, type, width, height and printableArea are required" });
  }

  const canvas = await createCanvasForUser(req.seller.userId, {
    ...req.body,
    isGlobal: false,
    userId: req.seller.userId,
  });
  return res.status(201).json({ canvas });
}

async function updateSellerCanvas(req, res) {
  const existing = await getCanvasById(req.params.canvasId);
  if (!existing) {
    return res.status(404).json({ message: "Canvas not found" });
  }
  if (existing.isGlobal) {
    return res.status(403).json({ message: "Global templates cannot be modified" });
  }

  const canvas = await updateCanvasForUser(req.seller.userId, req.params.canvasId, req.body || {});
  if (!canvas) {
    return res.status(404).json({ message: "Canvas not found" });
  }
  if (canvas.error === "GLOBAL_TEMPLATE") {
    return res.status(403).json({ message: "Global templates cannot be modified" });
  }
  return res.json({ canvas });
}

module.exports = {
  getSellerCanvases,
  createSellerCanvas,
  updateSellerCanvas,
};
