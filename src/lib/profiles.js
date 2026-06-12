import { supabase } from "./supabase";

/**
 * Fetch a seller's public shop profile from `profiles`.
 * Shop name MUST come from `profiles` (auth metadata of another
 * user is never readable by buyers).
 *
 * Returns: { shopName, shopDescription, shopContact, username, displayName }
 */
export async function fetchSellerProfile(sellerId) {
  const empty = {
    shopName: null,
    shopDescription: null,
    shopContact: null,
    username: null,
    displayName: "Penjual",
  };
  if (!sellerId) return empty;

  const { data, error } = await supabase
    .from("profiles")
    .select("username, shop_name, shop_description, shop_contact")
    .eq("id", sellerId)
    .maybeSingle();

  if (error || !data) return empty;

  return {
    shopName: data.shop_name || null,
    shopDescription: data.shop_description || null,
    shopContact: data.shop_contact || null,
    username: data.username || null,
    displayName: data.shop_name || data.username || "Penjual",
  };
}

/**
 * Onboarding check: a seller account is "set up" only when a
 * shop_name exists in the profiles table.
 */
export async function isShopSetupComplete(userId) {
  const { shopName } = await fetchSellerProfile(userId);
  return Boolean(shopName && shopName.trim());
}

/**
 * Persist shop data. Source of truth = profiles table (publicly
 * readable); auth metadata is mirrored for the seller's own session.
 */
export async function saveShopProfile(userId, { name, description, contact }) {
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      shop_name: name?.trim() || null,
      shop_description: description?.trim() || null,
      shop_contact: contact?.trim() || null,
    })
    .eq("id", userId);

  if (profileError) return { error: profileError };

  const { error: authError } = await supabase.auth.updateUser({
    data: { shop_name: name, shop_bio: description, shop_contact: contact },
  });

  return { error: authError || null };
}
