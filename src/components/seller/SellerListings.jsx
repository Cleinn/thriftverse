import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Skeleton } from "../Skeleton";

const FILTERS = [
  { id: "all", label: "Semua" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive / Draft" },
];

/**
 * My Listings — manage every product this seller has uploaded.
 * Active   = status 'available' and not sold  → visible to buyers
 * Inactive = status 'inactive' OR sold/out of stock → hidden from buyers
 * (Buyer feeds query .eq('status','available'), so toggling status
 *  immediately shows/hides the product on the marketplace.)
 */
export default function SellerListings({ user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("products")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setProducts(data || []);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [user]);

  function isActive(p) {
    return p.status === "available" && !p.is_sold && (p.stock ?? 1) > 0;
  }

  async function toggleStatus(p) {
    const nextStatus = isActive(p) ? "inactive" : "available";
    setBusyId(p.id);
    const { error } = await supabase
      .from("products")
      .update({ status: nextStatus })
      .eq("id", p.id)
      .eq("seller_id", user.id);
    setBusyId(null);
    if (error) {
      alert("Gagal mengubah status: " + error.message);
      return;
    }
    setProducts((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, status: nextStatus } : x))
    );
  }

  const visible = products.filter((p) => {
    if (filter === "active") return isActive(p);
    if (filter === "inactive") return !isActive(p);
    return true;
  });

  const activeCount = products.filter(isActive).length;

  return (
    <div className="seller-content">
      <h1 className="seller-page-title">My Listings</h1>
      <p className="seller-page-sub">
        Kelola semua produkmu — {activeCount} aktif dari {products.length} listing.
      </p>

      <div className="seller-filter-chips">
        {FILTERS.map((f) => {
          const count =
            f.id === "all" ? products.length
            : f.id === "active" ? activeCount
            : products.length - activeCount;
          return (
            <button
              key={f.id}
              className={`seller-chip ${filter === f.id ? "seller-chip--active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="seller-listing-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="seller-listing-card" key={i}>
              <div className="seller-listing-card__imgwrap">
                <Skeleton width="100%" height="auto" style={{ aspectRatio: "1", borderRadius: 0 }} />
              </div>
              <div className="seller-listing-card__body">
                <Skeleton width="80%" height="0.8125rem" radius="4px" />
                <Skeleton width="50%" height="0.875rem" radius="4px" />
                <Skeleton width="65%" height="0.7rem" radius="4px" style={{ marginBottom: "6px" }} />
                <Skeleton width="100%" height="1.9rem" radius="8px" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="seller-empty-notice">
          <span className="seller-empty-icon">🛍️</span>
          <p>
            {filter === "all"
              ? "Belum ada produk. Upload produk pertamamu di tab Upload Product."
              : "Tidak ada produk di kategori ini."}
          </p>
        </div>
      ) : (
        <div className="seller-listing-grid">
          {visible.map((p) => {
            const active = isActive(p);
            return (
              <div className={`seller-listing-card ${!active ? "seller-listing-card--inactive" : ""}`} key={p.id}>
                <div className="seller-listing-card__imgwrap">
                  <img
                    src={p.image_url || "https://placehold.co/200x200"}
                    alt={p.title}
                    className="seller-listing-card__img"
                  />
                  <span className={`seller-status-badge ${active ? "seller-status-badge--selesai" : "seller-status-badge--inactive"}`}>
                    {p.is_sold ? "Sold" : active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="seller-listing-card__body">
                  <p className="seller-listing-card__title" title={p.title}>{p.title}</p>
                  <p className="seller-listing-card__price">
                    Rp {Number(p.price).toLocaleString("id-ID")}
                  </p>
                  <p className="seller-listing-card__meta">
                    Stok {p.stock ?? 1} · {p.condition || "-"} · {p.category || "-"}
                  </p>
                  <button
                    className={`seller-listing-toggle ${active ? "seller-listing-toggle--off" : "seller-listing-toggle--on"}`}
                    onClick={() => toggleStatus(p)}
                    disabled={busyId === p.id || p.is_sold}
                    title={p.is_sold ? "Produk sudah terjual" : undefined}
                  >
                    {busyId === p.id
                      ? "Menyimpan…"
                      : p.is_sold
                      ? "Terjual"
                      : active
                      ? "Nonaktifkan"
                      : "Aktifkan"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
