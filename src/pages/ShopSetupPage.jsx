import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isShopSetupComplete, saveShopProfile } from "../lib/profiles";
import { Skeleton } from "../components/Skeleton";
import "./ShopSetupPage.css";

/**
 * SELLER ONBOARDING — mandatory first-time setup.
 * Users land here automatically the first time they open the Seller
 * Page. The Seller Dashboard stays locked until shop data is saved.
 */
export default function ShopSetupPage({ user }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", description: "", contact: "" });
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);
  const [msg, setMsg] = useState("");

  // Already onboarded? Go straight to the dashboard.
  useEffect(() => {
    if (!user) return;
    isShopSetupComplete(user.id).then((done) => {
      if (done) navigate("/seller", { replace: true });
      else setChecking(false);
    });
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setMsg("Nama toko wajib diisi.");
      return;
    }
    setSaving(true);
    setMsg("");
    const { error } = await saveShopProfile(user.id, form);
    setSaving(false);
    if (error) {
      setMsg("Gagal menyimpan: " + error.message);
      return;
    }
    // Unlock the dashboard only AFTER the data is in the database
    navigate("/seller", { replace: true });
  }

  if (checking) {
    return (
      <div className="shop-setup-overlay">
        <div className="shop-setup-card">
          <Skeleton className="tv-skel--dark" width="9rem" height="1.25rem" radius="6px" style={{ marginBottom: "1.25rem" }} />
          <Skeleton className="tv-skel--dark" width="13rem" height="0.7rem" radius="20px" style={{ marginBottom: "1.25rem" }} />
          <Skeleton className="tv-skel--dark" width="70%" height="1.25rem" radius="6px" style={{ marginBottom: "0.75rem" }} />
          <Skeleton className="tv-skel--dark" width="100%" height="2.5rem" radius="8px" style={{ marginBottom: "0.75rem" }} />
          <Skeleton className="tv-skel--dark" width="100%" height="5rem" radius="8px" style={{ marginBottom: "0.75rem" }} />
          <Skeleton className="tv-skel--dark" width="100%" height="2.5rem" radius="8px" style={{ marginBottom: "1rem" }} />
          <Skeleton className="tv-skel--dark" width="100%" height="2.75rem" radius="8px" />
        </div>
      </div>
    );
  }

  return (
    <div className="shop-setup-overlay">
      <div className="shop-setup-card">
        <div className="shop-setup-logo">
          Thrift<span className="seller-logo-green">Verse</span>
          <span className="seller-badge">Seller</span>
        </div>

        <div className="shop-setup-steps">
          <span className="shop-setup-step shop-setup-step--active">1. Data Toko</span>
          <span className="shop-setup-step">2. Dashboard</span>
        </div>

        <h1 className="shop-setup-title">Siapkan Toko Kamu Dulu 🏪</h1>
        <p className="shop-setup-sub">
          Sebelum bisa mengakses Seller Dashboard dan mulai berjualan,
          lengkapi profil toko kamu. Nama toko ini yang akan dilihat
          pembeli di halaman produk dan chat.
        </p>

        <form className="seller-form shop-setup-form" onSubmit={handleSubmit}>
          <label className="seller-label">Nama Toko *</label>
          <input
            className="seller-input"
            placeholder="cth. VintageByAna"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={50}
            autoFocus
          />

          <label className="seller-label">Deskripsi Toko (opsional)</label>
          <textarea
            className="seller-input seller-textarea"
            placeholder="Ceritakan tentang toko kamu — jenis barang, kondisi, asal kota…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            maxLength={300}
          />

          <label className="seller-label">Kontak / WhatsApp (opsional)</label>
          <input
            className="seller-input"
            placeholder="+62 812 3456 7890"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />

          <button className="seller-submit-btn shop-setup-submit" type="submit" disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan & Buka Dashboard →"}
          </button>

          {msg && <p className="seller-msg error">{msg}</p>}
        </form>

        <button className="shop-setup-back" onClick={() => navigate("/")}>
          ← Kembali ke Marketplace
        </button>
      </div>
    </div>
  );
}
