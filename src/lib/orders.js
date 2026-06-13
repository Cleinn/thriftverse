import { supabase } from "./supabase";

export async function createOrdersFromCheckout({
  buyerId,
  items,
  shippingMethod,
  paymentMethod,
  address,
  note,
}) {
  const rows = items
    .filter((item) => item.product_id && item.seller_id)
    .map((item) => ({
      buyer_id: buyerId,
      seller_id: item.seller_id,
      product_id: item.product_id,
      product_title: item.title,
      product_image: item.image_url,
      quantity: item.quantity || 1,
      price: Number(item.price) || 0,
      total: (Number(item.price) || 0) * (item.quantity || 1),
      shipping_method: shippingMethod,
      payment_method: paymentMethod,
      shipping_address: address,
      note: note || null,
      status: "pending",
    }));

  if (rows.length === 0) {
    return { error: new Error("Tidak ada item valid untuk dipesan.") };
  }

  const { error } = await supabase.from("transactions").insert(rows);
  return { error };
}

export async function fetchSellerOrders(sellerId) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

export async function updateOrderStatus(orderId, status) {
  return supabase.from("transactions").update({ status }).eq("id", orderId);
}

export async function fetchBuyerOrders(buyerId) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

export async function confirmOrderReceived(orderId) {
  return supabase
    .from("transactions")
    .update({ status: "selesai" })
    .eq("id", orderId)
    .select()
    .single();
}

export function subscribeToBuyerOrders(buyerId, { onInsert, onUpdate } = {}) {
  const channel = supabase
    .channel("buyer-orders:" + buyerId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "transactions",
        filter: `buyer_id=eq.${buyerId}`,
      },
      (payload) => onInsert?.(payload.new)
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "transactions",
        filter: `buyer_id=eq.${buyerId}`,
      },
      (payload) => onUpdate?.(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToSellerOrders(sellerId, onInsert) {
  const channel = supabase
    .channel("orders:" + sellerId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "transactions",
        filter: `seller_id=eq.${sellerId}`,
      },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export const ORDER_STATUSES = ["pending", "diproses", "dikirim", "selesai"];
export const ORDER_STATUS_LABELS = {
  pending: "Baru",
  diproses: "Diproses",
  dikirim: "Dikirim",
  selesai: "Selesai",
};
