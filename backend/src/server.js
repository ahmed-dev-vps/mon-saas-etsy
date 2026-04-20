const app = require("./app");
const env = require("./config/env");

function ensureRequiredEnv(name, value) {
  if (!String(value || "").trim()) {
    throw new Error(`Missing ${name} in environment variables`);
  }
}

ensureRequiredEnv("ETSY_CLIENT_ID", env.etsy.clientId);
ensureRequiredEnv("ETSY_REDIRECT_URI", env.etsy.redirectUri);

app.listen(env.app.port, () => {
  console.log(`Backend listening on port ${env.app.port}`);
});
