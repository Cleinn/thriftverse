import { supabase } from "../lib/supabase";
import { fetchSellerProfile } from "./profiles";

/**
 * Buka atau buat conversation antara buyer dan seller untuk suatu produk.
 * - seller_name disimpan sebagai SHOP NAME (nama toko) dari tabel profiles,
 *   fallback ke username bila shop_name belum diisi.
 * Returns conversation id (string) atau null kalau gagal.
 */
export async function openOrCreateConversation({
  productId,
  productTitle,
  productImage,
  buyerId,
  sellerId,
  sellerName, // optional: shop name kalau sudah diketahui dari halaman produk
}) {
  // Cek apakah sudah ada
  const { data: existing } = await supabase
    .from("conversations")
    .select("id, seller_name")
    .eq("product_id", productId)
    .eq("buyer_id", buyerId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  // Resolve nama toko dari profiles bila perlu
  const resolvedSellerName =
    sellerName || (await fetchSellerProfile(sellerId)).displayName;

  if (existing) {
    // Self-heal: conversation lama mungkin masih menyimpan username
    if (resolvedSellerName && existing.seller_name !== resolvedSellerName) {
      await supabase
        .from("conversations")
        .update({ seller_name: resolvedSellerName })
        .eq("id", existing.id);
    }
    return existing.id;
  }

  // Buat baru — pesan buyer otomatis ter-route ke inbox Seller Center
  // milik seller yang benar karena terikat ke seller_id ini.
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

/**
 * Kirim pesan ke sebuah conversation. Realtime INSERT event dari
 * Supabase akan otomatis mendorong pesan ini ke kedua sisi.
 */
export async function sendChatMessage({ conversationId, senderId, text }) {
  const message_text = text.trim();
  if (!message_text) return { error: null };
  return supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    message_text,
  });
}

/**
 * Subscribe realtime ke pesan-pesan baru dalam satu conversation.
 * Returns fungsi unsubscribe.
 */
export function subscribeToMessages(conversationId, onInsert) {
  const channel = supabase
    .channel("messages:" + conversationId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe realtime ke conversation BARU yang melibatkan user ini
 * (sebagai buyer atau seller) supaya inbox ter-update tanpa refresh.
 */
export function subscribeToNewConversations(userId, onInsert) {
  const channel = supabase
    .channel("conversations:" + userId)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "conversations" },
      (payload) => {
        const conv = payload.new;
        if (conv.buyer_id === userId || conv.seller_id === userId) {
          onInsert(conv);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
