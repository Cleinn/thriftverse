import { supabase } from "../lib/supabase";

/**
 * Buka atau buat conversation antara buyer dan seller untuk suatu produk.
 * Returns conversation id.
 */
export async function openOrCreateConversation({ productId, productTitle, productImage, buyerId, sellerId }) {
  // Cek apakah sudah ada
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("product_id", productId)
    .eq("buyer_id", buyerId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (existing) return existing.id;

  // Buat baru
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      product_id: productId,
      buyer_id: buyerId,
      seller_id: sellerId,
      product_title: productTitle,
      product_image: productImage,
      seller_name: null, // akan diisi dari view nanti
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    return null;
  }

  return data.id;
}