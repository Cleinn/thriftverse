import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import "./SellerPage.css";

const SELLER_TABS = [
  { id: "overview", label: "Overview" },
  { id: "upload", label: "Upload Product" },
  { id: "expedition", label: "Track Expedition" },
  { id: "chats", label: "Buyer Chats" },
  { id: "shop", label: "Shop Profile" },
];

const CATEGORIES = ["Men", "Women", "Kids", "Accessories", "Shoes"];

export default function SellerPage({ user, onBack }) {
  const [activeTab, setActiveTab] = useState("overview");

  const [product, setProduct] = useState({
    title: "",
    price: "",
    description: "",
    category: "Men",
    condition: "Good",
    location: "",
    stock: 1,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [productMsg, setProductMsg] = useState("");
  const [productMsgType, setProductMsgType] = useState("success");

  // ---------- overview stats ----------
  const [stats, setStats] = useState({ listings: 0, revenue: 0 });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("products")
      .select("price, is_sold")
      .eq("seller_id", user.id)
      .then(({ data }) => {
        if (!data) return;
        const listings = data.filter((p) => !p.is_sold).length;
        const revenue = data
          .filter((p) => p.is_sold)
          .reduce((s, p) => s + Number(p.price), 0);
        setStats({ listings, revenue });
      });
  }, [user]);

  // ---------- shop form ----------
  const shopName = user?.user_metadata?.shop_name || "";
  const [shopForm, setShopForm] = useState({ name: shopName, bio: "", contact: "" });
  const [shopMsg, setShopMsg] = useState("");
  const [shopMsgType, setShopMsgType] = useState("success");

  // ---------- image picker ----------
  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  // ---------- upload product ----------
  async function handleProductSubmit(e) {
    e.preventDefault();
    if (!product.title || !product.price) {
      setProductMsgType("error");
      setProductMsg("Title and price are required.");
      return;
    }

    setUploading(true);
    setProductMsg("");

    try {
      let image_url = null;

      // 1. Upload image to Supabase Storage if provided
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `${user.id}_${Date.now()}.${ext}`;
        const { error: storageError } = await supabase.storage
          .from("product-images")
          .upload(fileName, imageFile, { upsert: false });

        if (storageError) throw storageError;

        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);
        image_url = urlData.publicUrl;
      }

      // 2. Insert product row
      const slug = product.title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        + "-" + Date.now();

      const { error: insertError } = await supabase.from("products").insert([
        {
          seller_id: user.id,
          title: product.title,
          description: product.description,
          price: Number(product.price),
          category: product.category,
          condition: product.condition,
          location: product.location,
          stock: Number(product.stock),
          image_url,
          slug,
          status: "available",
          is_sold: false,
        },
      ]);

      if (insertError) throw insertError;

      setProductMsgType("success");
      setProductMsg("✓ Product listed successfully! It's now visible to all buyers.");
      setProduct({ title: "", price: "", description: "", category: "Men", condition: "Good", location: "", stock: 1 });
      setImageFile(null);
      setImagePreview(null);

      // refresh stats
      setStats((prev) => ({ ...prev, listings: prev.listings + 1 }));
    } catch (err) {
      setProductMsgType("error");
      setProductMsg("Error: " + (err.message || "Something went wrong."));
    } finally {
      setUploading(false);
    }
  }

  // ---------- save shop ----------
  async function handleShopSubmit(e) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({
      data: { shop_name: shopForm.name, shop_bio: shopForm.bio, shop_contact: shopForm.contact },
    });
    if (error) { setShopMsgType("error"); setShopMsg("Failed to save: " + error.message); }
    else { setShopMsgType("success"); setShopMsg("Shop profile saved!"); }
  }

  return (
    <div className="seller-overlay">
      <div className="seller-page">
        <aside className="seller-sidebar">
          <div className="seller-logo">
            Thrift<span className="seller-logo-green">Verse</span>
            <span className="seller-badge">Seller</span>
          </div>
          <nav className="seller-nav">
            {SELLER_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`seller-nav-item ${activeTab === tab.id ? "seller-nav-item--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <button className="seller-back-btn" onClick={onBack}>
            ← Back to Marketplace
          </button>
        </aside>

        <main className="seller-main">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="seller-content">
              <h1 className="seller-page-title">Overview</h1>
              <p className="seller-page-sub">
                Welcome back, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Seller"}
              </p>
              <div className="seller-stats-grid">
                <div className="seller-stat-card">
                  <span className="seller-stat-value">{stats.listings}</span>
                  <span className="seller-stat-label">Active Listings</span>
                </div>
                <div className="seller-stat-card">
                  <span className="seller-stat-value">0</span>
                  <span className="seller-stat-label">Orders Today</span>
                </div>
                <div className="seller-stat-card">
                  <span className="seller-stat-value">Rp {stats.revenue.toLocaleString("id-ID")}</span>
                  <span className="seller-stat-label">Total Revenue</span>
                </div>
                <div className="seller-stat-card">
                  <span className="seller-stat-value">0</span>
                  <span className="seller-stat-label">Unread Chats</span>
                </div>
              </div>
            </div>
          )}

          {/* UPLOAD */}
          {activeTab === "upload" && (
            <div className="seller-content">
              <h1 className="seller-page-title">Upload Product</h1>
              <p className="seller-page-sub">List a new thrifted item on ThriftVerse.</p>
              <form className="seller-form" onSubmit={handleProductSubmit}>

                <label className="seller-label">Product Title *</label>
                <input
                  className="seller-input"
                  placeholder="e.g. Vintage Denim Jacket"
                  value={product.title}
                  onChange={(e) => setProduct({ ...product, title: e.target.value })}
                />

                <label className="seller-label">Price (Rp) *</label>
                <input
                  className="seller-input"
                  type="number"
                  placeholder="e.g. 75000"
                  value={product.price}
                  onChange={(e) => setProduct({ ...product, price: e.target.value })}
                />

                <label className="seller-label">Category</label>
                <select
                  className="seller-input seller-select"
                  value={product.category}
                  onChange={(e) => setProduct({ ...product, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>

                <label className="seller-label">Condition</label>
                <select
                  className="seller-input seller-select"
                  value={product.condition}
                  onChange={(e) => setProduct({ ...product, condition: e.target.value })}
                >
                  {["New", "Like New", "Good", "Fair", "Poor"].map((c) => <option key={c}>{c}</option>)}
                </select>

                <label className="seller-label">Stock</label>
                <input
                  className="seller-input"
                  type="number"
                  min="1"
                  value={product.stock}
                  onChange={(e) => setProduct({ ...product, stock: e.target.value })}
                />

                <label className="seller-label">Location</label>
                <input
                  className="seller-input"
                  placeholder="e.g. Jakarta Selatan"
                  value={product.location}
                  onChange={(e) => setProduct({ ...product, location: e.target.value })}
                />

                <label className="seller-label">Description</label>
                <textarea
                  className="seller-input seller-textarea"
                  placeholder="Describe the condition, size, material…"
                  value={product.description}
                  onChange={(e) => setProduct({ ...product, description: e.target.value })}
                />

                <label className="seller-label">Product Photo</label>
                <div className="seller-upload-zone" style={{ position: "relative" }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" style={{ maxHeight: 160, borderRadius: 8, objectFit: "cover" }} />
                  ) : (
                    <span>Click to upload a photo</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer" }}
                  />
                </div>

                <button className="seller-submit-btn" type="submit" disabled={uploading}>
                  {uploading ? "Uploading…" : "List Item"}
                </button>

                {productMsg && (
                  <p className={`seller-msg ${productMsgType}`}>{productMsg}</p>
                )}
              </form>
            </div>
          )}

          {/* EXPEDITION */}
          {activeTab === "expedition" && (
            <div className="seller-content">
              <h1 className="seller-page-title">Track Expedition</h1>
              <p className="seller-page-sub">Monitor all your ongoing deliveries.</p>
              <div className="seller-empty-notice">
                <p>No active shipments right now.</p>
              </div>
            </div>
          )}

          {/* CHATS */}
          {activeTab === "chats" && (
            <div className="seller-content seller-chat-layout">
              <div className="seller-chat-sidebar">
                <h2 className="seller-chat-sidebar-title">Conversations</h2>
                <div className="seller-chat-empty"><p>No chats yet</p></div>
              </div>
              <div className="seller-chat-main">
                <div className="seller-chat-placeholder">
                  <p>Select a conversation to start chatting with buyers.</p>
                </div>
              </div>
            </div>
          )}

          {/* SHOP PROFILE */}
          {activeTab === "shop" && (
            <div className="seller-content">
              <h1 className="seller-page-title">Shop Profile</h1>
              <p className="seller-page-sub">Customize how buyers see your shop.</p>
              <form className="seller-form" onSubmit={handleShopSubmit}>
                <label className="seller-label">Shop Name</label>
                <input
                  className="seller-input"
                  placeholder="e.g. VintageByAna"
                  value={shopForm.name}
                  onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                />
                <label className="seller-label">Shop Bio</label>
                <textarea
                  className="seller-input seller-textarea"
                  placeholder="Tell buyers about your shop…"
                  value={shopForm.bio}
                  onChange={(e) => setShopForm({ ...shopForm, bio: e.target.value })}
                />
                <label className="seller-label">Contact / WhatsApp</label>
                <input
                  className="seller-input"
                  placeholder="+62 812 3456 7890"
                  value={shopForm.contact}
                  onChange={(e) => setShopForm({ ...shopForm, contact: e.target.value })}
                />
                <button className="seller-submit-btn" type="submit">Save Shop Profile</button>
                {shopMsg && <p className={`seller-msg ${shopMsgType}`}>{shopMsg}</p>}
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
