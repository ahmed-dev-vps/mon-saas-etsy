const {
  getDesign,
  saveDesign,
  buildMockup,
  buildExportSvg,
} = require("../services/designService");
const { updateOrderStatus, findOrderById } = require("../services/orderService");

function isOrderMatching(req) {
  const orderId = req.params.orderId;
  return req.orderAccess && req.orderAccess.orderId === orderId;
}

async function getOrderDesign(req, res) {
  if (!isOrderMatching(req)) {
    return res.status(403).json({ message: "Token does not match order" });
  }

  const order = await findOrderById(req.params.orderId);
  const design = await getDesign(req.params.orderId, order?.canvas);
  return res.json({
    orderId: req.params.orderId,
    design,
    canvas: order?.canvas || null,
  });
}

async function saveOrderDesign(req, res) {
  if (!isOrderMatching(req)) {
    return res.status(403).json({ message: "Token does not match order" });
  }

  const design = await saveDesign(req.params.orderId, req.body || {});
  const hasSceneObjects = Boolean(design.scene && Array.isArray(design.scene.objects) && design.scene.objects.length > 0);
  const hasContent = Boolean((design.text || "").trim() || (design.imageUrl || "").trim() || hasSceneObjects);
  await updateOrderStatus(req.params.orderId, hasContent ? "completed" : "pending");
  return res.json({ orderId: req.params.orderId, design });
}

async function getMockupPreview(req, res) {
  if (!isOrderMatching(req)) {
    return res.status(403).json({ message: "Token does not match order" });
  }

  const order = await findOrderById(req.params.orderId);
  const design = await getDesign(req.params.orderId, order?.canvas);
  return res.json({ orderId: req.params.orderId, mockup: buildMockup(design) });
}

async function exportDesignImage(req, res) {
  if (!isOrderMatching(req)) {
    return res.status(403).json({ message: "Token does not match order" });
  }

  const order = await findOrderById(req.params.orderId);
  const design = await getDesign(req.params.orderId, order?.canvas);
  const svg = buildExportSvg(req.params.orderId, design);
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.orderId}-design.svg"`);
  return res.send(svg);
}

module.exports = {
  getOrderDesign,
  saveOrderDesign,
  getMockupPreview,
  exportDesignImage,
};
