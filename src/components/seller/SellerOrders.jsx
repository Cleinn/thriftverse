import { useState, useEffect } from "react";
import {
  fetchSellerOrders,
  updateOrderStatus,
  subscribeToSellerOrders,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
} from "../../lib/orders";

/**
 * Incoming Orders — every checkout containing this seller's product
 * appears here instantly (realtime). RLS guarantees the seller only
 * ever receives rows where transactions.seller_id = auth.uid().
 */
export default function SellerOrders({ user, onOrdersChange }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetchSellerOrders(user.id).then(({ data }) => {
      if (cancelled) return;
      setOrders(data);
      setLoading(false);
      onOrdersChange?.(data);
    });

    // REALTIME: a buyer just checked out → order pops in immediately
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

  async function handleStatusChange(order, status) {
    // optimistic UI
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === order.id ? { ...o, status } : o));
      onOrdersChange?.(next);
      return next;
    });
    const { error } = await updateOrderStatus(order.id, status);
    if (error) alert("Gagal update status: " + error.message);
  }

  const visible =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  function formatAddress(addr) {
    if (!addr) return "-";
    return [addr.name, addr.street, addr.city, addr.province, addr.zip]
      .filter(Boolean)
      .join(", ");
  }

  return (
    <div className="seller-content">
      <h1 className="seller-page-title">Incoming Orders</h1>
      <p className="seller-page-sub">
        Pesanan masuk secara realtime setiap kali pembeli checkout produk kamu.
      </p>

      {/* status filter chips */}
      <div className="seller-filter-chips">
        <button
          className={`seller-chip ${filter === "all" ? "seller-chip--active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Semua ({orders.length})
        </button>
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            className={`seller-chip ${filter === s ? "seller-chip--active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {ORDER_STATUS_LABELS[s]} ({orders.filter((o) => o.status === s).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="seller-empty-notice"><p>Memuat pesanan…</p></div>
      ) : visible.length === 0 ? (
        <div className="seller-empty-notice">
          <span className="seller-empty-icon">📦</span>
          <p>Belum ada pesanan{filter !== "all" ? ` berstatus "${ORDER_STATUS_LABELS[filter]}"` : ""}.</p>
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
                  {order.quantity}× · Rp {Number(order.total).toLocaleString("id-ID")}
                  {" · "}{order.shipping_method || "-"} · {order.payment_method || "-"}
                </p>
                <p className="seller-order-card__address" title={formatAddress(order.shipping_address)}>
                  📍 {formatAddress(order.shipping_address)}
                </p>
                <p className="seller-order-card__date">
                  {new Date(order.created_at).toLocaleString("id-ID")}
                </p>
              </div>
              <div className="seller-order-card__actions">
                <span className={`seller-status-badge seller-status-badge--${order.status}`}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </span>
                <select
                  className="seller-input seller-order-card__select"
                  value={order.status}
                  onChange={(e) => handleStatusChange(order, e.target.value)}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
