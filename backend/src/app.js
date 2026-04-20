const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const accessRoutes = require("./routes/accessRoutes");
const designRoutes = require("./routes/designRoutes");
const sellerAuthRoutes = require("./routes/sellerAuthRoutes");
const sellerOrderRoutes = require("./routes/sellerOrderRoutes");
const sellerCanvasRoutes = require("./routes/sellerCanvasRoutes");
const sellerProductRoutes = require("./routes/sellerProductRoutes");
const etsyAuthRoutes = require("./routes/etsyAuthRoutes");
const { testEtsy } = require("./controllers/etsyAuthController");
const { createGlobalCanvases } = require("./bootstrap/createGlobalCanvases");

const app = express();

app.use(
  cors({
    origin: env.app.frontendUrl,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/access", accessRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/seller/auth", sellerAuthRoutes);
app.use("/api/seller/orders", sellerOrderRoutes);
app.use("/api/seller/canvases", sellerCanvasRoutes);
app.use("/api/seller/products", sellerProductRoutes);
app.use("/auth", etsyAuthRoutes);
app.get("/test-etsy", testEtsy);

createGlobalCanvases().catch((error) => {
  console.error("Failed to create global canvases", error);
});

module.exports = app;
