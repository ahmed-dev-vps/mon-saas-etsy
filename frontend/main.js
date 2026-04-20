import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js";

const API_URL = "http://localhost:4000/api";
const PRINTABLE_ZONE = {
  width: 2000,
  height: 900,
};
const MUG_TEXTURE_MAPPING = {
  repeatX: 0.36,
  repeatY: 0.82,
  offsetY: 0.09,
};

let authToken = "";
let activeOrderId = "";
let activeCanvas = null;
let fabricCanvas = null;

const urlParams = new URLSearchParams(window.location.search);

const accessContainer = document.getElementById("access-container");
const accessForm = document.getElementById("access-form");
const accessMessage = document.getElementById("access-message");

const editorScreen = document.getElementById("editor-screen");
const canvasInfo = document.getElementById("canvas-info");
const mockupLabel = document.getElementById("mockup-label");
const previewImage = document.getElementById("preview-image");
const layerList = document.getElementById("layer-list");
const mug3DViewer = document.getElementById("mug-3d-viewer");
const mug3DStatus = document.getElementById("mug-3d-status");
let mugTextureSyncTimer = null;
let mugTextureSyncVersion = 0;
let mugRenderer = null;
let mugScene = null;
let mugCamera = null;
let mugControls = null;
let mugModel = null;
let mugPrintableMaterials = [];

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
}

function ensureCanvas() {
  if (!window.fabric) {
    throw new Error("Fabric.js is not loaded");
  }
  if (fabricCanvas) {
    return;
  }

  fabricCanvas = new fabric.Canvas("design-canvas", {
    width: PRINTABLE_ZONE.width,
    height: PRINTABLE_ZONE.height,
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
  });

  syncCanvasDisplaySize(PRINTABLE_ZONE.width, PRINTABLE_ZONE.height);
  fabricCanvas.on("selection:created", refreshLayers);
  fabricCanvas.on("selection:updated", refreshLayers);
  fabricCanvas.on("selection:cleared", refreshLayers);
  fabricCanvas.on("object:moving", updatePreview);
  fabricCanvas.on("object:scaling", updatePreview);
  fabricCanvas.on("object:rotating", updatePreview);
  fabricCanvas.on("object:added", () => {
    refreshLayers();
    updatePreview();
  });
  fabricCanvas.on("object:modified", () => {
    refreshLayers();
    updatePreview();
  });
  fabricCanvas.on("object:removed", () => {
    refreshLayers();
    updatePreview();
  });
}

function setEditorMode() {
  accessContainer.classList.add("hidden");
  editorScreen.classList.remove("hidden");
  document.body.classList.add("client-editor-mode");
}

function applyCanvasInfo(canvas) {
  if (!canvas) {
    canvasInfo.textContent = "Canvas: défaut";
    return;
  }

  canvasInfo.textContent = `Canvas: ${canvas.name} (${canvas.type}) | zone ${canvas.printableArea.width}x${canvas.printableArea.height}`;
}

function configureWorkspaceFromCanvas(canvas) {
  if (!fabricCanvas) {
    return;
  }

  const printableArea = canvas?.printableArea || PRINTABLE_ZONE;
  const width = Math.max(1200, printableArea.width || PRINTABLE_ZONE.width);
  const height = Math.max(540, printableArea.height || PRINTABLE_ZONE.height);
  fabricCanvas.setDimensions({ width, height }, { backstoreOnly: true });
  syncCanvasDisplaySize(width, height);
  fabricCanvas.renderAll();
}

function syncCanvasDisplaySize(backstoreWidth, backstoreHeight) {
  if (!fabricCanvas) {
    return;
  }
  const wrap = document.querySelector(".client-canvas-card");
  const availableWidth = Math.max(480, (wrap?.clientWidth || 760) - 34);
  const cssWidth = Math.min(availableWidth, 760);
  const cssHeight = Math.round((cssWidth * backstoreHeight) / backstoreWidth);
  fabricCanvas.setDimensions({ width: cssWidth, height: cssHeight }, { cssOnly: true });
  fabricCanvas.calcOffset();
}

function refreshLayers() {
  if (!fabricCanvas) {
    return;
  }
  const objs = fabricCanvas.getObjects();
  if (!objs.length) {
    layerList.innerHTML = '<div class="layer-item-simple">Aucun calque</div>';
    return;
  }

  layerList.innerHTML = objs
    .map((obj, idx) => {
      const name =
        obj.type === "i-text" || obj.type === "text"
          ? `Texte: ${(obj.text || "").slice(0, 16)}`
          : obj.type === "image"
            ? "Image"
            : obj.type;
      return `<div class="layer-item-simple">${idx + 1}. ${name}</div>`;
    })
    .reverse()
    .join("");
}

function updatePreview() {
  if (!fabricCanvas) {
    return;
  }
  previewImage.src = fabricCanvas.toDataURL({
    format: "png",
    multiplier: 1,
  });
  scheduleMugTextureSync();
}

function normalizeName(value = "") {
  return value.toLowerCase();
}

function isExcludedMugPart(meshName, materialName) {
  const fullName = `${normalizeName(meshName)} ${normalizeName(materialName)}`;
  return (
    fullName.includes("handle") ||
    fullName.includes("anse") ||
    fullName.includes("top") ||
    fullName.includes("bottom") ||
    fullName.includes("inside") ||
    fullName.includes("interior") ||
    fullName.includes("rim") ||
    fullName.includes("lid")
  );
}

function looksLikePrintableBody(meshName, materialName) {
  const fullName = `${normalizeName(meshName)} ${normalizeName(materialName)}`;
  return (
    fullName.includes("body") ||
    fullName.includes("outside") ||
    fullName.includes("outer") ||
    fullName.includes("print") ||
    fullName.includes("label") ||
    fullName.includes("decal") ||
    fullName.includes("mug") ||
    fullName.includes("cup") ||
    fullName.includes("cylinder")
  );
}

function estimateMeshSize(mesh) {
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  const size = new THREE.Vector3();
  box.getSize(size);
  return size.x * size.y * size.z;
}

function collectPrintableMaterials(modelRoot) {
  const candidates = [];
  const fallback = [];

  modelRoot.traverse((node) => {
    if (!node.isMesh || !node.material || !node.geometry) {
      return;
    }

    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      const scoreBase = estimateMeshSize(node);
      const entry = {
        material,
        meshName: node.name || "",
        materialName: material.name || "",
        score: scoreBase,
      };
      fallback.push(entry);

      if (isExcludedMugPart(entry.meshName, entry.materialName)) {
        return;
      }
      if (looksLikePrintableBody(entry.meshName, entry.materialName)) {
        candidates.push(entry);
      }
    });
  });

  const picked = candidates.length ? candidates : fallback.sort((a, b) => b.score - a.score).slice(0, 1);
  const uniqueMaterials = Array.from(new Set(picked.map((entry) => entry.material)));
  return uniqueMaterials;
}

function scheduleMugTextureSync() {
  if (!mug3DViewer || !fabricCanvas) {
    return;
  }

  if (mugTextureSyncTimer) {
    window.clearTimeout(mugTextureSyncTimer);
  }

  mugTextureSyncTimer = window.setTimeout(() => {
    mugTextureSyncVersion += 1;
    const versionAtStart = mugTextureSyncVersion;
    syncMugTextureFromCanvas(versionAtStart).catch(() => {
      if (mug3DStatus) {
        mug3DStatus.textContent =
          "Texture 3D non appliquée. Vérifiez les matériaux UV du modèle.";
      }
    });
  }, 120);
}

async function syncMugTextureFromCanvas(versionAtStart) {
  if (!mugModel || !fabricCanvas || !mugRenderer) {
    return;
  }

  const texture = await buildMugTextureFromDesign();
  if (versionAtStart !== mugTextureSyncVersion) {
    return;
  }

  const materials = mugPrintableMaterials;
  let appliedCount = 0;

  materials.forEach((material) => {
    if (!material?.isMeshStandardMaterial) {
      return;
    }

    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(MUG_TEXTURE_MAPPING.repeatX, MUG_TEXTURE_MAPPING.repeatY);
    texture.offset.set((1 - MUG_TEXTURE_MAPPING.repeatX) / 2, MUG_TEXTURE_MAPPING.offsetY);
    texture.anisotropy = mugRenderer.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;

    material.map = texture;
    material.color.set("#ffffff");
    material.roughness = 0.72;
    material.metalness = 0.08;
    material.needsUpdate = true;
    appliedCount += 1;
  });

  if (mug3DStatus) {
    mug3DStatus.textContent =
      appliedCount > 0
        ? "Design synchronisé sur le mug 3D."
        : "Aucun matériau compatible trouvé dans le modèle 3D.";
  }
}

function addDefaultTemplate(templateName) {
  if (!fabricCanvas) {
    return;
  }
  fabricCanvas.clear();
  fabricCanvas.backgroundColor = "#ffffff";

  const centerX = fabricCanvas.getWidth() / 2;
  const centerY = fabricCanvas.getHeight() / 2;

  if (templateName === "birthday") {
    const circle = new fabric.Circle({
      left: centerX,
      top: centerY,
      radius: 90,
      fill: "#fff1e8",
      stroke: "#e8521a",
      strokeWidth: 2,
      originX: "center",
      originY: "center",
    });
    const text = new fabric.IText("Joyeux anniversaire", {
      left: centerX,
      top: centerY,
      fontSize: 34,
      fill: "#1a1410",
      originX: "center",
      originY: "center",
      textAlign: "center",
    });
    fabricCanvas.add(circle, text);
  } else if (templateName === "love") {
    const text = new fabric.IText("Pour toujours", {
      left: centerX,
      top: centerY - 22,
      fontSize: 38,
      fill: "#c42a2a",
      originX: "center",
      originY: "center",
    });
    const line = new fabric.IText("❤", {
      left: centerX,
      top: centerY + 34,
      fontSize: 56,
      fill: "#e8521a",
      originX: "center",
      originY: "center",
    });
    fabricCanvas.add(text, line);
  } else if (templateName === "fun") {
    const bg = new fabric.Rect({
      left: centerX,
      top: centerY,
      width: fabricCanvas.getWidth() - 40,
      height: fabricCanvas.getHeight() - 40,
      fill: "#141414",
      originX: "center",
      originY: "center",
      rx: 10,
      ry: 10,
    });
    const text = new fabric.IText("BUT FIRST... COFFEE", {
      left: centerX,
      top: centerY,
      fontSize: 34,
      fill: "#ffffff",
      originX: "center",
      originY: "center",
      textAlign: "center",
    });
    fabricCanvas.add(bg, text);
  } else {
    const text = new fabric.IText("Carpe Coffeem", {
      left: centerX,
      top: centerY,
      fontSize: 42,
      fill: "#4a4138",
      originX: "center",
      originY: "center",
    });
    fabricCanvas.add(text);
  }
  fabricCanvas.renderAll();
  refreshLayers();
  updatePreview();
}

function getFirstText() {
  const textObj = fabricCanvas
    ?.getObjects()
    .find((obj) => obj.type === "i-text" || obj.type === "text");
  return textObj?.text || "";
}

function getFirstImageSrc() {
  const imgObj = fabricCanvas?.getObjects().find((obj) => obj.type === "image");
  return imgObj?._originalElement?.src || "";
}

async function loadDesign() {
  const payload = await fetchJson(`${API_URL}/designs/${activeOrderId}`, {
    headers: authHeaders(),
  });

  activeCanvas = payload.canvas || null;
  applyCanvasInfo(activeCanvas);
  ensureCanvas();
  configureWorkspaceFromCanvas(activeCanvas);

  const design = payload.design || {};
  if (design.scene) {
    await new Promise((resolve) => {
      fabricCanvas.loadFromJSON(design.scene, () => {
        fabricCanvas.renderAll();
        resolve();
      });
    });
  } else {
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    if (design.text) {
      fabricCanvas.add(
        new fabric.IText(design.text, {
          left: fabricCanvas.getWidth() / 2,
          top: fabricCanvas.getHeight() / 2,
          originX: "center",
          originY: "center",
          fontSize: 36,
          fill: "#1a1410",
        }),
      );
    }
    if (design.imageUrl) {
      await new Promise((resolve) => {
        fabric.Image.fromURL(design.imageUrl, (img) => {
          img.set({
            left: fabricCanvas.getWidth() / 2,
            top: fabricCanvas.getHeight() / 2,
            originX: "center",
            originY: "center",
            scaleX: 0.4,
            scaleY: 0.4,
          });
          fabricCanvas.add(img);
          resolve();
        });
      });
    }
    fabricCanvas.renderAll();
  }

  refreshLayers();
  updatePreview();
}

async function saveDesign() {
  if (!fabricCanvas) {
    return;
  }
  const zone = activeCanvas?.printableArea
    ? {
        width: activeCanvas.printableArea.width,
        height: activeCanvas.printableArea.height,
      }
    : {
        width: fabricCanvas.getWidth(),
        height: fabricCanvas.getHeight(),
      };

  const designPayload = {
    text: getFirstText(),
    imageUrl: getFirstImageSrc(),
    zone,
    scene: fabricCanvas.toJSON(["id"]),
  };

  const payload = await fetchJson(`${API_URL}/designs/${activeOrderId}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(designPayload),
  });

  mockupLabel.textContent = `Mockup: design sauvegardé (${payload.orderId})`;
}

async function showMockup() {
  const payload = await fetchJson(`${API_URL}/designs/${activeOrderId}/mockup`, {
    headers: authHeaders(),
  });
  const productName = payload.mockup?.product || "Mockup";
  mockupLabel.textContent = `Mockup: ${productName}`;
}

function bindEditorEvents() {
  document.getElementById("add-text-btn").addEventListener("click", () => {
    const value = document.getElementById("text-input").value.trim() || "Votre texte";
    const color = document.getElementById("text-color").value;
    fabricCanvas.add(
      new fabric.IText(value, {
        left: fabricCanvas.getWidth() / 2,
        top: fabricCanvas.getHeight() / 2,
        originX: "center",
        originY: "center",
        fontSize: 34,
        fill: color,
      }),
    );
    fabricCanvas.renderAll();
  });

  document.getElementById("text-color").addEventListener("input", (event) => {
    const obj = fabricCanvas.getActiveObject();
    if (!obj || (obj.type !== "i-text" && obj.type !== "text")) {
      return;
    }
    obj.set("fill", event.target.value);
    fabricCanvas.renderAll();
  });

  document.getElementById("image-upload").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      fabric.Image.fromURL(reader.result, (img) => {
        const scale = Math.min(220 / img.width, 160 / img.height, 1);
        img.set({
          left: fabricCanvas.getWidth() / 2,
          top: fabricCanvas.getHeight() / 2,
          originX: "center",
          originY: "center",
          scaleX: scale,
          scaleY: scale,
        });
        fabricCanvas.add(img);
        fabricCanvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  });

  document.getElementById("center-btn").addEventListener("click", () => {
    const obj = fabricCanvas.getActiveObject();
    if (!obj) {
      return;
    }
    obj.set({
      left: fabricCanvas.getWidth() / 2,
      top: fabricCanvas.getHeight() / 2,
      originX: "center",
      originY: "center",
    });
    fabricCanvas.renderAll();
  });

  document.getElementById("delete-btn").addEventListener("click", () => {
    const obj = fabricCanvas.getActiveObject();
    if (!obj) {
      return;
    }
    fabricCanvas.remove(obj);
    fabricCanvas.renderAll();
  });

  document.querySelectorAll(".template-btn").forEach((button) => {
    button.addEventListener("click", () => addDefaultTemplate(button.dataset.template));
  });

  document.getElementById("save-btn").addEventListener("click", async () => {
    try {
      await saveDesign();
    } catch (error) {
      mockupLabel.textContent = error.message;
    }
  });

  document.getElementById("mockup-btn").addEventListener("click", async () => {
    try {
      await showMockup();
    } catch (error) {
      mockupLabel.textContent = error.message;
    }
  });

  document.getElementById("export-btn").addEventListener("click", () => {
    const url = `${API_URL}/designs/${activeOrderId}/export?token=${encodeURIComponent(authToken)}`;
    window.open(url, "_blank");
  });
}

function bindMug3DViewerEvents() {
  if (!mug3DViewer || !mug3DStatus) {
    return;
  }

  mug3DViewer.addEventListener("load", () => {
    mug3DStatus.textContent = "Modèle 3D chargé : synchronisation du design...";
    scheduleMugTextureSync();
  });

  mug3DViewer.addEventListener("error", () => {
    mug3DStatus.textContent =
      "Impossible de charger le modèle 3D. Vérifiez la présence de assets/models/mug.glb.";
  });
}

async function enterEditor() {
  setEditorMode();
  ensureCanvas();
  await loadDesign();
}

async function initFromSecureLink() {
  const orderIdFromUrl = (urlParams.get("orderId") || "").trim();
  const tokenFromUrl = (urlParams.get("token") || "").trim();
  if (!orderIdFromUrl || !tokenFromUrl) {
    return;
  }

  activeOrderId = orderIdFromUrl;
  authToken = tokenFromUrl;
  accessMessage.textContent = "Lien sécurisé validé.";
  await enterEditor();
}

accessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  accessMessage.textContent = "Vérification...";

  const payload = {
    orderId: document.getElementById("orderId").value.trim(),
    email: document.getElementById("email").value.trim(),
  };

  try {
    const data = await fetchJson(`${API_URL}/access/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    authToken = data.token;
    activeOrderId = payload.orderId;
    await enterEditor();
  } catch (error) {
    accessMessage.textContent = error.message || "Vérification échouée";
  }
});

bindEditorEvents();
bindMug3DViewerEvents();
initFromSecureLink().catch((error) => {
  accessMessage.textContent = error.message || "Lien invalide ou expiré.";
});
