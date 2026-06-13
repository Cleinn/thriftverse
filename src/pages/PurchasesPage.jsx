import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchBuyerOrders,
  subscribeToBuyerOrders,
  confirmOrderReceived,
  ORDER_STATUS_LABELS,
} from "../lib/orders";
import { Skeleton } from "../components/Skeleton";
import "./SellerPage.css";

const BUYER_TABS = [
  { id: "overview", label: "Overview" },
  { id: "purchases", label: "My Purchases" },
  { id: "expedition", label: "Track Expedition" },
];

const TRACK_STEPS = ["pending", "diproses", "dikirim", "selesai"];
const TRACK_LABELS = {
  pending: "Dipesan",
  diproses: "Diproses",
  dikirim: "Dikirim",
  selesai: "Selesai",
};

export default function PurchasesPage({ user, onBack }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));
  const [activeTab, setActiveTab] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetchBuyerOrders(user.id).then(({ data }) => {
      if (cancelled) return;
      setOrders(data);
      setLoading(false);
    });

    const unsubscribe = subscribeToBuyerOrders(user.id, {
      onInsert: (order) => {
        setOrders((prev) =>
          prev.some((o) => o.id === order.id) ? prev : [order, ...prev]
        );
      },
      onUpdate: (order) => {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      },
    });

    return () => { cancelled = true; unsubscribe(); };
  }, [user]);

  async function handleConfirm(order) {
    setConfirmingId(order.id);
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: "selesai" } : o))
    );
    const { error } = await confirmOrderReceived(order.id);
    setConfirmingId(null);
    if (error) {
      alert("Gagal mengonfirmasi pesanan: " + error.message);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "dikirim" } : o))
      );
    }
  }

  function formatAddress(addr) {
    if (!addr) return "-";
    return [addr.name, addr.street, addr.city, addr.province, addr.zip]
      .filter(Boolean)
      .join(", ");
  }

  function stepIndex(status) {
    const i = TRACK_STEPS.indexOf(status);
    return i < 0 ? 0 : i;
  }

  const activeOrders = orders.filter((o) => o.status !== "selesai");
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Buyer";

  function renderOrderCard(order, { showTracker = false, showConfirm = false } = {}) {
    return (
      <div className="seller-order-card" key={order.id}>
        <img
          src={order.product_image || "https://placehold.co/56x56"}
          alt={order.product_title}
          className="seller-order-card__img"
        />
        <div className="seller-order-card__info">
          <p className="seller-order-card__title">{order.product_title}</p>
          <p className="seller-order-card__meta">
            Order #{String(order.id).slice(0, 8)} - {order.quantity}x - Rp{" "}
            {Number(order.total).toLocaleString("id-ID")}
            {" - "}{order.shipping_method || "-"} - {order.payment_method || "-"}
          </p>
          <p
            className="seller-order-card__address"
            title={formatAddress(order.shipping_address)}
          >
            {formatAddress(order.shipping_address)}
          </p>
          <p className="seller-order-card__date">
            {new Date(order.created_at).toLocaleString("id-ID")}
          </p>

          {showTracker && (
            <div className="seller-track">
              {TRACK_STEPS.map((step, i) => (
                <div
                  key={step}
                  className={`seller-track__step ${
                    i <= stepIndex(order.status) ? "seller-track__step--done" : ""
                  }`}
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

          {}
          {showConfirm && order.status === "dikirim" && (
            <button
              className="seller-btn seller-btn--primary seller-ship-btn"
              onClick={() => handleConfirm(order)}
              disabled={confirmingId === order.id}
            >
              {confirmingId === order.id ? "Memproses..." : "Confirm Order Received"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="seller-overlay">
      <div className="seller-page">
        <aside className="seller-sidebar">
          <div className="seller-logo">
            Thrift<span className="seller-logo-green">Verse</span>
            <span className="seller-badge">Buyer</span>
          </div>
          <nav className="seller-nav">
            {BUYER_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`seller-nav-item ${activeTab === tab.id ? "seller-nav-item--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <button className="seller-back-btn" onClick={handleBack}>
            Back to Marketplace
          </button>
        </aside>

        <main className="seller-main">

          {}
          {activeTab === "overview" && (
            <div className="seller-content">
              <h1 className="seller-page-title">My Purchases</h1>
              <p className="seller-page-sub">Welcome back, {displayName}</p>
              <div className="seller-stats-grid">
                <div className="seller-stat-card">
                  <span className="seller-stat-value">{orders.length}</span>
                  <span className="seller-stat-label">Total Orders</span>
                </div>
                <div className="seller-stat-card">
                  <span className="seller-stat-value">{activeOrders.length}</span>
                  <span className="seller-stat-label">Active Orders</span>
                </div>
                <div className="seller-stat-card">
                  <span className="seller-stat-value">
                    {orders.filter((o) => o.status === "selesai").length}
                  </span>
                  <span className="seller-stat-label">Completed</span>
                </div>
                <div className="seller-stat-card">
                  <span className="seller-stat-value">
                    Rp {totalSpent.toLocaleString("id-ID")}
                  </span>
                  <span className="seller-stat-label">Total Spent</span>
                </div>
              </div>
            </div>
          )}

          {}
          {activeTab === "purchases" && (
            <div className="seller-content">
              <h1 className="seller-page-title">My Purchases</h1>
              <p className="seller-page-sub">
                Semua produk yang kamu beli, lengkap dengan detail dan statusnya.
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
                      </div>
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="seller-empty-notice">
                  <p>Kamu belum melakukan pembelian apa pun.</p>
                </div>
              ) : (
                <div className="seller-order-list">
                  {orders.map((order) => renderOrderCard(order))}
                </div>
              )}
            </div>
          )}

          {}
          {activeTab === "expedition" && (
            <div className="seller-content">
              <h1 className="seller-page-title">Track Expedition</h1>
              <p className="seller-page-sub">
                Pantau progres pengiriman pesananmu secara realtime.
              </p>
              {loading ? (
                <div className="seller-order-list">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div className="seller-order-card" key={i}>
                      <Skeleton width="56px" height="56px" radius="10px" />
                      <div className="seller-order-card__info">
                        <Skeleton width="55%" height="0.875rem" radius="4px" style={{ marginBottom: "6px" }} />
                        <Skeleton width="70%" height="0.72rem" radius="4px" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="seller-empty-notice">
                  <p>Tidak ada pengiriman aktif saat ini.</p>
                </div>
              ) : (
                <div className="seller-order-list">
                  {activeOrders.map((order) =>
                    renderOrderCard(order, { showTracker: true, showConfirm: true })
                  )}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
