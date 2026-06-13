import { supabase } from "./supabase";

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

export async function isShopSetupComplete(userId) {
  const { shopName } = await fetchSellerProfile(userId);
  return Boolean(shopName && shopName.trim());
}

export async function saveShopProfile(userId, { name, description, contact }, user) {
  const shopFields = {
    shop_name: name?.trim() || null,
    shop_description: description?.trim() || null,
    shop_contact: contact?.trim() || null,
  };

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();

  let profileError;
  if (existing) {
    ({ error: profileError } = await supabase
      .from("profiles")
      .update(shopFields)
      .eq("id", userId));
  } else {
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
