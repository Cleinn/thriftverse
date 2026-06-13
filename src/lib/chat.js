import { supabase } from "../lib/supabase";
import { fetchSellerProfile } from "./profiles";

export async function openOrCreateConversation({
  productId,
  productTitle,
  productImage,
  buyerId,
  sellerId,
  sellerName,
}) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id, seller_name")
    .eq("product_id", productId)
    .eq("buyer_id", buyerId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  const resolvedSellerName =
    sellerName || (await fetchSellerProfile(sellerId)).displayName;

  if (existing) {
    if (resolvedSellerName && existing.seller_name !== resolvedSellerName) {
      await supabase
        .from("conversations")
        .update({ seller_name: resolvedSellerName })
        .eq("id", existing.id);
    }
    return existing.id;
  }

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

export async function sendChatMessage({ conversationId, senderId, text }) {
  const message_text = text.trim();
  if (!message_text) return { error: null };
  return supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    message_text,
  });
}

export async function sendBarterOffer({ conversationId, senderId, offeredProduct }) {
  if (!conversationId || !offeredProduct) return { error: new Error("Missing barter data") };
  return supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    message_text: `Barter offer: ${offeredProduct.title}`,
    message_type: "barter",
    barter_product_id: offeredProduct.id,
    barter_product_title: offeredProduct.title,
    barter_product_image: offeredProduct.image_url,
    barter_product_price: offeredProduct.price,
    barter_status: "pending",
  });
}

export async function updateBarterStatus({ messageId, status }) {
  if (!messageId || !["accepted", "rejected"].includes(status)) {
    return { error: new Error("Invalid barter status update") };
  }
  return supabase
    .from("messages")
    .update({ barter_status: status })
    .eq("id", messageId)
    .select()
    .single();
}

export async function acceptBarterOffer({ message, conversation }) {
  if (!message || !conversation) {
    return { error: new Error("Missing barter context") };
  }

  const { error: statusError } = await supabase
    .from("messages")
    .update({ barter_status: "accepted" })
    .eq("id", message.id);
  if (statusError) return { error: statusError };

  const sellerId = conversation.seller_id;
  const buyerId = conversation.buyer_id;
  const offeredPrice = Number(message.barter_product_price) || 0;
  const sellerProductPrice = Number(conversation.product_price) || 0;

  const rows = [
    {
      buyer_id: buyerId,
      seller_id: sellerId,
      product_id: conversation.product_id,
      product_title: conversation.product_title,
      product_image: conversation.product_image,
      quantity: 1,
      price: sellerProductPrice,
      total: sellerProductPrice,
      shipping_method: "Barter Exchange",
      payment_method: "Barter",
      shipping_address: null,
      note: "Barter: produk penjual untuk pembeli",
      status: "pending",
      is_barter: true,
      barter_message_id: message.id,
    },
    {
      buyer_id: sellerId,
      seller_id: buyerId,
      product_id: message.barter_product_id,
      product_title: message.barter_product_title,
      product_image: message.barter_product_image,
      quantity: 1,
      price: offeredPrice,
      total: offeredPrice,
      shipping_method: "Barter Exchange",
      payment_method: "Barter",
      shipping_address: null,
      note: "Barter: produk pembeli untuk penjual",
      status: "pending",
      is_barter: true,
      barter_message_id: message.id,
    },
  ];

  const { error: orderError } = await supabase.from("transactions").insert(rows);
  return { error: orderError };
}

export function subscribeToMessages(conversationId, onInsert, onUpdate) {
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
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onUpdate?.(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

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
