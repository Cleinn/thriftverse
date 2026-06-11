import { supabase } from "./supabase";

/**
 * Fetch a seller's public profile (shop_name + username) from the
 * `profiles` table. The shop name MUST come from `profiles`, because
 * auth user_metadata of another user is not readable by buyers.
 *
 * Returns: { shopName, username, displayName }
 *   displayName = shop_name ?? username ?? "Penjual"
 */
export async function fetchSellerProfile(sellerId) {
  if (!sellerId) return { shopName: null, username: null, displayName: "Penjual" };

  const { data, error } = await supabase
    .from("profiles")
    .select("username, shop_name")
    .eq("id", sellerId)
    .maybeSingle();

  if (error || !data) {
    return { shopName: null, username: null, displayName: "Penjual" };
  }

  return {
    shopName: data.shop_name || null,
    username: data.username || null,
    displayName: data.shop_name || data.username || "Penjual",
  };
}
