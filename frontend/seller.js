const API_URL = "http://localhost:4000/api";
const SELLER_TOKEN_KEY = "seller_token";
const SELLER_EMAIL_KEY = "seller_email";
const SELLER_USER_ID_KEY = "seller_user_id";

let sellerToken = localStorage.getItem(SELLER_TOKEN_KEY) || "";
let cachedCanvases = [];
let cachedProducts = [];
let etsyConfigured = true;

const authScreen = document.getElementById("seller-auth-screen");
const appShell = document.getElementById("seller-app-shell");
const authMessage = document.getElementById("seller-auth-message");
const dashboardMessage = document.getElementById("seller-dashboard-message");
const userEmailEl = document.getElementById("seller-user-email");
const etsyStatusBadge = document.getElementById("etsy-status-badge");
const connectEtsyBtn = document.getElementById("connect-etsy-btn");

const ordersContainer = document.getElementById("orders-container");
const canvasesContainer = document.getElementById("canvases-container");
const productsContainer = document.getElementById("products-container");

function showAuthScreen() {
  authScreen.classList.remove("hidden");
  appShell.classList.add("hidden");
  appShell.setAttribute("aria-hidden", "true");
}

function showDashboardShell() {
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  appShell.setAttribute("aria-hidden", "false");
}

function notify(message, target = "auto") {
  if (target === "auth") {
    authMessage.textContent = message;
    return;
  }
  if (target === "dashboard") {
    dashboardMessage.textContent = message;
    return;
  }
  if (appShell.classList.contains("hidden")) {
    authMessage.textContent = message;
  } else {
    dashboardMessage.textContent = message;
  }
}

function clearDashboardMessage() {
  dashboardMessage.textContent = "";
}

function decodeTokenPayload(token) {
  try {
    const [encoded] = token.split(".");
    if (!encoded) {
      return null;
    }
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getSellerUserId() {
  const cached = localStorage.getItem(SELLER_USER_ID_KEY);
  if (cached) {
    return cached;
  }
  const payload = decodeTokenPayload(sellerToken);
  return payload?.userId || null;
}

function backendBaseUrl() {
  return API_URL.replace(/\/api$/, "");
}

function setEtsyStatus(connected, meta = {}) {
  etsyConfigured = meta.configured !== false;
  etsyStatusBadge.classList.remove("connected", "disconnected");
  connectEtsyBtn.disabled = false;

  if (!etsyConfigured) {
    etsyStatusBadge.classList.add("disconnected");
    etsyStatusBadge.textContent = "Etsy: configuration manquante";
    connectEtsyBtn.disabled = true;
    return;
  }

  if (connected) {
    etsyStatusBadge.classList.add("connected");
    etsyStatusBadge.textContent = `Etsy: connecté (shop ${meta.shop_id || "-"})`;
  } else {
    etsyStatusBadge.classList.add("disconnected");
    etsyStatusBadge.textContent = "Etsy: non connecté";
  }
}

function getAuthPayload() {
  return {
    email: document.getElementById("seller-email").value.trim(),
    password: document.getElementById("seller-password").value.trim(),
  };
}

function sellerHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sellerToken}`,
  };
}

function orderCardTemplate(order) {
  return `
    <article class="card">
      <p><strong>Order:</strong> ${order.orderId}</p>
      <p><strong>Client:</strong> ${order.email}</p>
      <p><strong>Status:</strong> ${order.designStatus}</p>
      <p><strong>Produit:</strong> ${order.etsyProductId || "-"}</p>
      <p><strong>Canvas:</strong> ${order.canvas?.name || "-"}</p>
      <input value="${order.clientLink}" readonly />
      <div class="actions">
        <button data-link="${order.clientLink}" class="copy-link-btn">Copier lien client</button>
      </div>
    </article>
  `;
}

function canvasCardTemplate(canvas) {
  const badgeClass = canvas.isGlobal ? "seller-badge-template" : "seller-badge-custom";
  const badgeText = canvas.isGlobal ? "Template" : "Custom";
  return `
    <article class="card">
      <p><strong>${canvas.name}</strong> <span class="seller-badge ${badgeClass}">${badgeText}</span></p>
      <p>Type: ${canvas.type || "-"}</p>
      <p>Size: ${canvas.width}x${canvas.height}</p>
      <p>Printable area: x=${canvas.printableArea.x}, y=${canvas.printableArea.y}, w=${canvas.printableArea.width}, h=${canvas.printableArea.height}</p>
      <p>Mockup: ${canvas.mockupUrl || "-"}</p>
      <div class="actions">
        ${canvas.isGlobal ? "" : `<button class="edit-canvas-btn" data-id="${canvas.id}">Éditer</button>`}
      </div>
    </article>
  `;
}

function productCardTemplate(product) {
  const templates = cachedCanvases.filter((c) => c.isGlobal);
  const customs = cachedCanvases.filter((c) => !c.isGlobal);

  const templateOptions = templates
    .map(
      (canvas) =>
        `<option value="${canvas.id}" ${product.linkedCanvasId === canvas.id ? "selected" : ""}>${canvas.name}</option>`,
    )
    .join("");
  const customOptions = customs
    .map(
      (canvas) =>
        `<option value="${canvas.id}" ${product.linkedCanvasId === canvas.id ? "selected" : ""}>${canvas.name}</option>`,
    )
    .join("");

  const options = `
    <option value="">Aucun canvas</option>
    <optgroup label="Templates">${templateOptions}</optgroup>
    <optgroup label="Mes canvas">${customOptions}</optgroup>
  `;

  return `
    <article class="card">
      <p><strong>${product.title}</strong></p>
      <p>Etsy ID: ${product.etsyProductId}</p>
      <label>Canvas associé
        <select class="product-canvas-dropdown" data-product-id="${product.id}">
          ${options}
        </select>
      </label>
    </article>
  `;
}

function fillCanvasDropdowns() {
  const templates = cachedCanvases.filter((c) => c.isGlobal);
  const customs = cachedCanvases.filter((c) => !c.isGlobal);
  const templateOptions = templates.map((canvas) => `<option value="${canvas.id}">${canvas.name}</option>`).join("");
  const customOptions = customs.map((canvas) => `<option value="${canvas.id}">${canvas.name}</option>`).join("");
  document.getElementById("product-canvas-select").innerHTML = `
    <option value="">Choisir canvas</option>
    <optgroup label="Templates">${templateOptions}</optgroup>
    <optgroup label="Mes canvas">${customOptions}</optgroup>
  `;

  const productOptions = [`<option value="">Choisir produit</option>`]
    .concat(cachedProducts.map((product) => `<option value="${product.id}">${product.title}</option>`))
    .join("");
  document.getElementById("new-order-product").innerHTML = productOptions;
}

async function loadOrders() {
  const response = await fetch(`${API_URL}/seller/orders`, {
    headers: sellerHeaders(),
  });
  const payload = await response.json();
  if (!response.ok) {
    notify(payload.message || "Impossible de charger les commandes");
    return;
  }

  ordersContainer.innerHTML =
    payload.orders.map(orderCardTemplate).join("") || "<p>Aucune commande pour le moment.</p>";

  document.querySelectorAll(".copy-link-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.link);
      button.textContent = "Lien copié";
      setTimeout(() => {
        button.textContent = "Copier lien client";
      }, 1200);
    });
  });
}

async function loadEtsyStatus() {
  const response = await fetch(`${API_URL}/seller/auth/etsy/status`, {
    headers: sellerHeaders(),
  });
  const payload = await response.json();
  if (!response.ok) {
    notify(payload.message || "Impossible de charger le statut Etsy");
    return;
  }
  setEtsyStatus(Boolean(payload.connected), payload);
}

async function loadCanvases() {
  const response = await fetch(`${API_URL}/seller/canvases`, {
    headers: sellerHeaders(),
  });
  const payload = await response.json();
  if (!response.ok) {
    notify(payload.message || "Impossible de charger les canvas");
    return;
  }
  cachedCanvases = payload.canvases;
  const templates = cachedCanvases.filter((c) => c.isGlobal);
  const customs = cachedCanvases.filter((c) => !c.isGlobal);

  const templatesHtml = templates.length ? templates.map(canvasCardTemplate).join("") : "<p>Aucun template.</p>";
  const customsHtml = customs.length ? customs.map(canvasCardTemplate).join("") : "<p>Aucun canvas personnalisé.</p>";

  canvasesContainer.innerHTML = `
    <div class="card">
      <h3>Templates</h3>
      ${templatesHtml}
    </div>
    <div class="card">
      <h3>Mes canvas</h3>
      ${customsHtml}
    </div>
  `;

  document.querySelectorAll(".edit-canvas-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const canvas = cachedCanvases.find((item) => item.id === button.dataset.id);
      if (!canvas) {
        return;
      }
      const name = prompt("Nom du canvas", canvas.name);
      if (!name) {
        return;
      }
      const width = Number(prompt("Width", canvas.width));
      const height = Number(prompt("Height", canvas.height));
      const x = Number(prompt("Printable X", canvas.printableArea.x));
      const y = Number(prompt("Printable Y", canvas.printableArea.y));
      const areaWidth = Number(prompt("Printable Width", canvas.printableArea.width));
      const areaHeight = Number(prompt("Printable Height", canvas.printableArea.height));
      const mockup = prompt("Mockup URL", canvas.mockup || "") || "";

      const responseUpdate = await fetch(`${API_URL}/seller/canvases/${canvas.id}`, {
        method: "PUT",
        headers: sellerHeaders(),
        body: JSON.stringify({
          name,
          type: canvas.type || "custom",
          width,
          height,
          printableArea: { x, y, width: areaWidth, height: areaHeight },
          mockupUrl: mockup,
        }),
      });
      if (!responseUpdate.ok) {
        notify("Échec mise à jour canvas");
        return;
      }
      clearDashboardMessage();
      await refreshDashboard();
    });
  });
}

async function loadProducts() {
  const response = await fetch(`${API_URL}/seller/products`, {
    headers: sellerHeaders(),
  });
  const payload = await response.json();
  if (!response.ok) {
    notify(payload.message || "Impossible de charger les produits");
    return;
  }
  cachedProducts = payload.products;
  fillCanvasDropdowns();
  productsContainer.innerHTML =
    cachedProducts.map(productCardTemplate).join("") || "<p>Aucun produit pour le moment.</p>";

  document.querySelectorAll(".product-canvas-dropdown").forEach((dropdown) => {
    dropdown.addEventListener("change", async () => {
      const linkedCanvasId = dropdown.value;
      const productId = dropdown.dataset.productId;
      const responseUpdate = await fetch(`${API_URL}/seller/products/${productId}`, {
        method: "PUT",
        headers: sellerHeaders(),
        body: JSON.stringify({ linkedCanvasId }),
      });
      if (!responseUpdate.ok) {
        notify("Échec assignation canvas");
        return;
      }
      clearDashboardMessage();
      await refreshDashboard();
    });
  });
}

async function refreshDashboard() {
  clearDashboardMessage();
  await loadEtsyStatus();
  await loadCanvases();
  await loadProducts();
  fillCanvasDropdowns();
  await loadOrders();
}

async function runAuth(endpoint) {
  authMessage.textContent = "";
  const payload = getAuthPayload();
  const response = await fetch(`${API_URL}/seller/auth/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    authMessage.textContent = data.message || "Échec de connexion";
    return;
  }

  sellerToken = data.token;
  localStorage.setItem(SELLER_TOKEN_KEY, sellerToken);
  localStorage.setItem(SELLER_EMAIL_KEY, data.user.email);
  localStorage.setItem(SELLER_USER_ID_KEY, data.user.id);
  userEmailEl.textContent = data.user.email;
  showDashboardShell();
  activateTab("orders-tab");
  await refreshDashboard();
}

function activateTab(tabId) {
  const panelTitle = document.getElementById("seller-panel-title");
  ["orders-tab", "canvas-tab", "products-tab"].forEach((id) => {
    document.getElementById(id).classList.toggle("hidden", id !== tabId);
  });

  document.querySelectorAll(".seller-nav-item").forEach((btn) => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle("active", isActive);
    if (isActive && btn.dataset.title) {
      panelTitle.textContent = btn.dataset.title;
    }
  });
  clearDashboardMessage();
}

document.getElementById("seller-login-btn").addEventListener("click", async () => {
  await runAuth("login");
});

document.getElementById("seller-signup-btn").addEventListener("click", async () => {
  await runAuth("signup");
});

document.getElementById("seller-logout-btn").addEventListener("click", () => {
  sellerToken = "";
  localStorage.removeItem(SELLER_TOKEN_KEY);
  localStorage.removeItem(SELLER_EMAIL_KEY);
  localStorage.removeItem(SELLER_USER_ID_KEY);
  userEmailEl.textContent = "";
  authMessage.textContent = "";
  clearDashboardMessage();
  setEtsyStatus(false);
  showAuthScreen();
});

document.getElementById("seller-delete-account-btn").addEventListener("click", async () => {
  const confirmed = window.confirm(
    "Supprimer définitivement votre compte vendeur ? Cette action supprimera aussi vos commandes, produits, canvases et designs.",
  );
  if (!confirmed) {
    return;
  }

  const response = await fetch(`${API_URL}/seller/auth/account`, {
    method: "DELETE",
    headers: sellerHeaders(),
  });
  const payload = await response.json();
  if (!response.ok) {
    notify(payload.message || "Échec suppression du compte");
    return;
  }

  sellerToken = "";
  localStorage.removeItem(SELLER_TOKEN_KEY);
  localStorage.removeItem(SELLER_EMAIL_KEY);
  localStorage.removeItem(SELLER_USER_ID_KEY);
  cachedCanvases = [];
  cachedProducts = [];
  ordersContainer.innerHTML = "";
  canvasesContainer.innerHTML = "";
  productsContainer.innerHTML = "";
  userEmailEl.textContent = "";
  authMessage.textContent = "Compte supprimé. Vous pouvez créer un nouveau compte.";
  clearDashboardMessage();
  setEtsyStatus(false);
  showAuthScreen();
});

document.getElementById("connect-etsy-btn").addEventListener("click", () => {
  if (!etsyConfigured) {
    notify("Configure ETSY_CLIENT_ID, ETSY_REDIRECT_URI et les variables Supabase dans backend/.env");
    return;
  }

  const userId = getSellerUserId();
  if (!userId) {
    notify("Utilisateur vendeur introuvable, reconnectez-vous.");
    return;
  }
  window.location.href = `${backendBaseUrl()}/auth/etsy?user_id=${encodeURIComponent(userId)}`;
});

document.querySelectorAll(".seller-nav-item").forEach((btn) => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

document.getElementById("create-order-btn").addEventListener("click", async () => {
  const email = document.getElementById("new-order-email").value.trim();
  const productId = document.getElementById("new-order-product").value;
  if (!email || !productId) {
    notify("Email client et produit requis");
    return;
  }

  const response = await fetch(`${API_URL}/seller/orders`, {
    method: "POST",
    headers: sellerHeaders(),
    body: JSON.stringify({ email, productId }),
  });
  const payload = await response.json();
  if (!response.ok) {
    notify(payload.message || "Échec création commande");
    return;
  }

  document.getElementById("new-order-email").value = "";
  clearDashboardMessage();
  await refreshDashboard();
});

document.getElementById("create-canvas-btn").addEventListener("click", async () => {
  const payload = {
    name: document.getElementById("canvas-name").value.trim(),
    width: Number(document.getElementById("canvas-width").value),
    height: Number(document.getElementById("canvas-height").value),
    type: "custom",
    printableArea: {
      x: Number(document.getElementById("canvas-x").value),
      y: Number(document.getElementById("canvas-y").value),
      width: Number(document.getElementById("canvas-area-width").value),
      height: Number(document.getElementById("canvas-area-height").value),
    },
    mockupUrl: document.getElementById("canvas-mockup").value.trim(),
  };

  const response = await fetch(`${API_URL}/seller/canvases`, {
    method: "POST",
    headers: sellerHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    notify("Échec création canvas");
    return;
  }
  clearDashboardMessage();
  await refreshDashboard();
});

document.getElementById("create-product-btn").addEventListener("click", async () => {
  const payload = {
    title: document.getElementById("product-title").value.trim(),
    etsyProductId: document.getElementById("product-etsy-id").value.trim(),
    linkedCanvasId: document.getElementById("product-canvas-select").value,
  };

  const response = await fetch(`${API_URL}/seller/products`, {
    method: "POST",
    headers: sellerHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    notify("Échec création produit");
    return;
  }
  clearDashboardMessage();
  await refreshDashboard();
});

document.getElementById("refresh-dashboard-btn").addEventListener("click", refreshDashboard);

function handleEtsyOAuthFeedback() {
  const url = new URL(window.location.href);
  const status = url.searchParams.get("etsy");
  const message = url.searchParams.get("message");
  const shopId = url.searchParams.get("shop_id");
  if (!status) {
    return;
  }

  if (status === "connected") {
    notify(`Connexion Etsy réussie${shopId ? ` (shop ${shopId})` : ""}`, "dashboard");
  } else if (status === "error") {
    notify(`Erreur OAuth Etsy: ${message || "inconnue"}`, "dashboard");
  }

  url.searchParams.delete("etsy");
  url.searchParams.delete("message");
  url.searchParams.delete("shop_id");
  window.history.replaceState({}, "", url.toString());
}

if (sellerToken) {
  showDashboardShell();
  userEmailEl.textContent = localStorage.getItem(SELLER_EMAIL_KEY) || "";
  activateTab("orders-tab");
  handleEtsyOAuthFeedback();
  refreshDashboard();
} else {
  setEtsyStatus(false);
}
