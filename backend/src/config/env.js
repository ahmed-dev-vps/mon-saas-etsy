const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  app: {
    port: Number(process.env.PORT || 4000),
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  },
  security: {
    tokenSecret: process.env.TOKEN_SECRET || "change-me-in-production",
    tokenTtlHours: Number(process.env.TOKEN_TTL_HOURS || 72),
  },
  storage: {
    dataPath: process.env.DATA_PATH || "src/data",
  },
  etsy: {
    clientId: process.env.ETSY_CLIENT_ID || "",
    redirectUri: process.env.ETSY_REDIRECT_URI || "http://localhost:4000/auth/etsy/callback",
    scope: process.env.ETSY_SCOPE || "transactions_r transactions_w",
  },
  supabase: {
    url: process.env.SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },
};
