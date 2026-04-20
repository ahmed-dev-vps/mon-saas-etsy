const { createClient } = require("@supabase/supabase-js");
const env = require("../config/env");

let supabaseClient = null;

function getSupabaseClient() {
  if (!env.supabase.url || !env.supabase.serviceRoleKey) {
    throw new Error("Supabase configuration is missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }

  if (!supabaseClient) {
    supabaseClient = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}

module.exports = {
  getSupabaseClient,
};
