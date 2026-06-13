import { useState, useEffect } from "react";
import {
  fetchSellerOrders,
  updateOrderStatus,
  subscribeToSellerOrders,
  ORDER_STATUS_LABELS,
} from "../../lib/orders";
import { Skeleton } from "../Skeleton";

/**
 * Seller order views, backed by the transactions table (realtime).
 * RLS guarantees the seller only ever receives rows where
 * transactions.seller_id = auth.uid().
 *
 * view = "incoming"   -> orders not yet shipped (pending / diproses),
 *                        each with a Ship Product action.
 * view = "expedition" -> shipped orders (dikirim / selesai), shown with
 *                        their shipping progress for tracking.
 */
export default function SellerOrders({ user, onOrdersChange, view = "incoming" }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shippingId, setShippingId] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetchSellerOrders(user.id).then(({ data }) => {
      if (cancelled) return;
      setOrders(data);
      setLoading(false);
      onOrdersChange?.(data);
    });

    // REALTIME: a buyer just checked out, order pops in immediately
    const unsubscribe = subscribeToSellerOrders(user.id, (order) => {
      setOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        const next = [order, ...prev];
        onOrdersChange?.(next);
        return next;
      });
    });
    return () => { cancelled = true; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Ship Product: advance the order to "dikirim". Once shipped it leaves
  // Incoming Orders and shows up under Track Expedition automatically,
  // because both views filter the same shared order list by status.
  async function handleShip(order) {
    setShippingId(order.id);
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === order.id ? { ...o, status: "dikirim" } : o));
      onOrdersChange?.(next);
      return next;
    });
    const { error } = await updateOrderStatus(order.id, "dikirim");
    setShippingId(null);
    if (error) {
      alert("Gagal mengirim produk: " + error.message);
      // revert on failure
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === order.id ? { ...o, status: "diproses" } : o));
        onOrdersChange?.(next);
        return next;
      });
    }
  }

  const incomingStatuses = ["pending", "diproses"];
  const expeditionStatuses = ["dikirim", "selesai"];
  const statuses = view === "expedition" ? expeditionStatuses : incomingStatuses;
  const visible = orders.filter((o) => statuses.includes(o.status));

  function formatAddress(addr) {
    if (!addr) return "-";
    return [addr.name, addr.street, addr.city, addr.province, addr.zip]
      .filter(Boolean)
      .join(", ");
  }

  // Shipping progress steps for the expedition tracker
  const TRACK_STEPS = ["diproses", "dikirim", "selesai"];
  const TRACK_LABELS = { diproses: "Diproses", dikirim: "Dikirim", selesai: "Selesai" };
  function stepIndex(status) {
    const i = TRACK_STEPS.indexOf(status);
    return i < 0 ? 1 : i; // shipped orders start at "dikirim"
  }

  const isExpedition = view === "expedition";

  return (
    <div className="seller-content">
      <h1 className="seller-page-title">
        {isExpedition ? "Track Expedition" : "Incoming Orders"}
      </h1>
      <p className="seller-page-sub">
        {isExpedition
          ? "Pantau semua pengiriman yang sedang berjalan."
          : "Pesanan masuk secara realtime setiap kali pembeli checkout produk kamu."}
      </p>

      {loading ? (
        <div className="seller-order-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="seller-order-card" key={i}>
              <Skeleton width="56px" height="56px" radius="10px" />
              <div className="seller-order-card__info">
                <Skeleton width="55%" height="0.875rem" radius="4px" style={{ marginBottom: "6px" }} />
                <Skeleton width="35%" height="0.75rem" radius="4px" style={{ marginBottom: "6px" }} />
                <Skeleton width="70%" height="0.72rem" radius="4px" />
              </div>
              <div className="seller-order-card__actions">
                <Skeleton width="70px" height="1.25rem" radius="20px" />
                <Skeleton width="90px" height="1.75rem" radius="8px" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="seller-empty-notice">
          <p>
            {isExpedition
              ? "Belum ada pengiriman yang sedang berjalan."
              : "Belum ada pesanan masuk."}
          </p>
        </div>
      ) : (
        <div className="seller-order-list">
          {visible.map((order) => (
            <div className="seller-order-card" key={order.id}>
              <img
                src={order.product_image || "https://placehold.co/56x56"}
                alt={order.product_title}
                className="seller-order-card__img"
              />
              <div className="seller-order-card__info">
                <p className="seller-order-card__title">{order.product_title}</p>
                <p className="seller-order-card__meta">
                  {order.quantity}x - Rp {Number(order.total).toLocaleString("id-ID")}
                  {" - "}{order.shipping_method || "-"} - {order.payment_method || "-"}
                </p>
                <p className="seller-order-card__address" title={formatAddress(order.shipping_address)}>
                  {formatAddress(order.shipping_address)}
                </p>
                <p className="seller-order-card__date">
                  {new Date(order.created_at).toLocaleString("id-ID")}
                </p>

                {/* Expedition: visual shipping progress tracker */}
                {isExpedition && (
                  <div className="seller-track">
                    {TRACK_STEPS.map((step, i) => (
                      <div
                        key={step}
                        className={`seller-track__step ${i <= stepIndex(order.status) ? "seller-track__step--done" : ""}`}
                      >
                        <span className="seller-track__dot" />
                        <span className="seller-track__label">{TRACK_LABELS[step]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="seller-order-card__actions">
                <span className={`seller-status-badge seller-status-badge--${order.status}`}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </span>

                {/* Incoming: Ship Product button advances to "dikirim" */}
                {!isExpedition && (
                  <button
                    className="seller-btn seller-btn--primary seller-ship-btn"
                    onClick={() => handleShip(order)}
                    disabled={shippingId === order.id}
                  >
                    {shippingId === order.id ? "Mengirim..." : "Ship Product"}
                  </button>
                )}

                {/* Expedition is read-only for the seller. Only the buyer
                    can confirm receipt and finalize the order, so the
                    seller just sees the shipping status here. */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
