import { supabase } from "../lib/supabase";

/**
 * Ambil username dari profiles table berdasarkan user id.
 */
async function fetchUsername(userId) {
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  return data?.username || null;
}

/**
 * Buka atau buat conversation antara buyer dan seller untuk suatu produk.
 * Returns conversation id.
 */
export async function openOrCreateConversation({
  productId,
  productTitle,
  productImage,
  buyerId,
  sellerId,
  sellerUsername,
}) {
  // Cek apakah sudah ada
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("product_id", productId)
    .eq("buyer_id", buyerId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (existing) return existing.id;

  // Resolve seller username from profiles if not provided
  const resolvedSellerName =
    sellerUsername || (await fetchUsername(sellerId));

  // Buat baru
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      product_id: productId,
      buyer_id: buyerId,
      seller_id: sellerId,
      product_title: productTitle,
      product_image: productImage,
      seller_name: resolvedSellerName,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    return null;
  }

  return data.id;
}
