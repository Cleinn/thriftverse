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
 *
 * A first-time seller may have no row in `profiles` yet. We must not
 * clobber an existing username, and `profiles.username` is NOT NULL, so:
 *   - if a row already exists, UPDATE only the shop fields;
 *   - if no row exists, INSERT a new one and supply a username derived
 *     from the user's auth data (the column cannot be null).
 * The previous plain UPDATE silently matched zero rows for first-time
 * sellers, which trapped them in the onboarding loop.
 */
export async function saveShopProfile(userId, { name, description, contact }, user) {
  const shopFields = {
    shop_name: name?.trim() || null,
    shop_description: description?.trim() || null,
    shop_contact: contact?.trim() || null,
  };

  // Does a profile row already exist for this user?
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();

  let profileError;
  if (existing) {
    // Row present: only touch the shop fields, never the username.
    ({ error: profileError } = await supabase
      .from("profiles")
      .update(shopFields)
      .eq("id", userId));
  } else {
    // Row missing: create it. username is NOT NULL, so derive a fallback
    // from auth metadata / email, falling back to a stable id-based value.
    const fallbackUsername =
      user?.user_metadata?.username ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      `user_${String(userId).slice(0, 8)}`;

    ({ error: profileError } = await supabase
      .from("profiles")
      .insert({ id: userId, username: fallbackUsername, ...shopFields }));
  }

  if (profileError) return { error: profileError };

  const { error: authError } = await supabase.auth.updateUser({
    data: { shop_name: name, shop_bio: description, shop_contact: contact },
  });

  return { error: authError || null };
}
