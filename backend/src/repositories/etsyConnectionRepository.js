const { getSupabaseClient } = require("../services/supabaseService");

async function upsertEtsyConnection(record) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("etsy_connections").upsert(record, {
    onConflict: "user_id",
  });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

async function getEtsyConnectionByUserId(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("etsy_connections")
    .select("user_id, shop_id, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase read failed: ${error.message}`);
  }
  return data || null;
}

async function getAnyEtsyConnection() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("etsy_connections")
    .select("user_id, shop_id, access_token, refresh_token, expires_at")
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase read failed: ${error.message}`);
  }
  return data || null;
}

async function getEtsyConnectionWithTokenByUserId(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("etsy_connections")
    .select("user_id, shop_id, access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase read failed: ${error.message}`);
  }
  return data || null;
}

module.exports = {
  upsertEtsyConnection,
  getEtsyConnectionByUserId,
  getAnyEtsyConnection,
  getEtsyConnectionWithTokenByUserId,
};
