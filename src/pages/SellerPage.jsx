import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { fetchSellerProfile, isShopSetupComplete, saveShopProfile } from "../lib/profiles";
import SellerChats from "../components/seller/SellerChats";
import SellerOrders from "../components/seller/SellerOrders";
import SellerListings from "../components/seller/SellerListings";
import { Skeleton } from "../components/Skeleton";
import "./SellerPage.css";

const SELLER_TABS = [
  { id: "overview", label: "Overview" },
  { id: "listings", label: "My Listings" },
  { id: "upload", label: "Upload Product" },
  { id: "orders", label: "Incoming Orders" },
  { id: "expedition", label: "Track Expedition" },
  { id: "chats", label: "Buyer Chats" },
  { id: "shop", label: "Shop Profile" },
];

const CATEGORIES = ["Men", "Women", "Kids", "Accessories", "Shoes"];

export default function SellerPage({ user, onBack }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));
  const [activeTab, setActiveTab] = useState("overview");

  // ---------- ONBOARDING GATE ----------
  // The dashboard stays LOCKED until profiles.shop_name exists.
  // First-time sellers are redirected to the mandatory Shop Setup page.
  const [gate, setGate] = useState("checking"); // checking | ready
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    isShopSetupComplete(user.id).then((done) => {
      if (cancelled) return;
      if (!done) navigate("/seller/setup", { replace: true });
      else setGate("ready");
    });
    return () => { cancelled = true; };
  }, [user, navigate]);

  // ---------- upload product form ----------
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
  const [stats, setStats] = useState({ listings: 0, revenue: 0, ordersToday: 0, chats: 0 });

  useEffect(() => {
    if (!user || gate !== "ready") return;

    supabase
      .from("products")
      .select("price, is_sold, status")
      .eq("seller_id", user.id)
      .then(({ data }) => {
        if (!data) return;
        const listings = data.filter((p) => !p.is_sold && p.status === "available").length;
        setStats((s) => ({ ...s, listings }));
      });

    supabase
      .from("transactions")
      .select("total, created_at")
      .eq("seller_id", user.id)
      .then(({ data }) => {
        if (!data) return;
        const today = new Date().toDateString();
        setStats((s) => ({
          ...s,
          revenue: data.reduce((sum, o) => sum + Number(o.total || 0), 0),
          ordersToday: data.filter((o) => new Date(o.created_at).toDateString() === today).length,
        }));
      });

    // UNREAD BUYER CHATS — only conversations whose latest message is
    // from the BUYER (i.e. the seller has not replied yet). We pull this
    // seller's conversations, then check the most recent message in each.
    (async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, buyer_id")
        .eq("seller_id", user.id);

      if (!convs || convs.length === 0) {
        setStats((s) => ({ ...s, chats: 0 }));
        return;
      }

      const results = await Promise.all(
        convs.map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("sender_id")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          // Unread = there is a message AND it was sent by the buyer
          // (anyone who is not the seller), meaning it's unreplied.
          return lastMsg && lastMsg.sender_id !== user.id ? 1 : 0;
        })
      );

      const unread = results.reduce((sum, n) => sum + n, 0);
      setStats((s) => ({ ...s, chats: unread }));
    })();
  }, [user, gate]);

  // ---------- shop form ----------
  const [shopForm, setShopForm] = useState({ name: "", description: "", contact: "" });
  const [shopMsg, setShopMsg] = useState("");
  const [shopMsgType, setShopMsgType] = useState("success");

  useEffect(() => {
    if (!user || gate !== "ready") return;
    fetchSellerProfile(user.id).then(({ shopName, shopDescription, shopContact }) => {
      setShopForm({
        name: shopName || "",
        description: shopDescription || "",
        contact: shopContact || "",
      });
    });
  }, [user, gate]);

  // ---------- handlers ----------
  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

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
      setProductMsg("Product listed successfully! It's now visible to all buyers.");
      setProduct({ title: "", price: "", description: "", category: "Men", condition: "Good", location: "", stock: 1 });
      setImageFile(null);
      setImagePreview(null);
      setStats((prev) => ({ ...prev, listings: prev.listings + 1 }));
    } catch (err) {
      setProductMsgType("error");
      setProductMsg("Error: " + (err.message || "Something went wrong."));
    } finally {
      setUploading(false);
    }
  }

  async function handleShopSubmit(e) {
    e.preventDefault();
    if (!shopForm.name.trim()) {
      setShopMsgType("error");
      setShopMsg("Nama toko tidak boleh kosong.");
      return;
    }
    const { error } = await saveShopProfile(user.id, shopForm, user);
    if (error) { setShopMsgType("error"); setShopMsg("Failed to save: " + error.message); }
    else { setShopMsgType("success"); setShopMsg("Shop profile saved!"); }
  }

  // ---------- render ----------
  if (gate !== "ready") {
    return (
      <div className="seller-overlay">
        <div className="seller-page">
          <aside className="seller-sidebar">
            <div className="seller-logo">
              Thrift<span className="seller-logo-green">Verse</span>
              <span className="seller-badge">Seller</span>
            </div>
            <nav className="seller-nav">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton
                  key={i}
                  width="100%"
                  height="2.1rem"
                  radius="8px"
                  style={{ marginBottom: "2px", opacity: 0.4 }}
                />
              ))}
            </nav>
          </aside>
          <main className="seller-main">
            <div className="seller-content">
              <Skeleton width="9rem" height="1.375rem" radius="6px" style={{ marginBottom: "10px" }} />
              <Skeleton width="14rem" height="0.8125rem" radius="4px" style={{ marginBottom: "1.75rem" }} />
              <div className="seller-stats-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div className="seller-stat-card" key={i}>
                    <Skeleton width="60%" height="1.75rem" radius="6px" style={{ marginBottom: "8px" }} />
                    <Skeleton width="80%" height="0.75rem" radius="4px" />
                  </div>
                ))}
              </div>
            </div>
          </main>
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
          <button className="seller-back-btn" onClick={handleBack}>
            ← Back to Marketplace
          </button>
        </aside>

        <main className="seller-main">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="seller-content">
              <h1 className="seller-page-title">Overview</h1>
              <p className="seller-page-sub">
                Welcome back, {shopForm.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Seller"}
              </p>
              <div className="seller-stats-grid">
                <div className="seller-stat-card">
                  <span className="seller-stat-value">{stats.listings}</span>
                  <span className="seller-stat-label">Active Listings</span>
                </div>
                <div className="seller-stat-card">
                  <span className="seller-stat-value">{stats.ordersToday}</span>
                  <span className="seller-stat-label">Orders Today</span>
                </div>
                <div className="seller-stat-card">
                  <span className="seller-stat-value">Rp {stats.revenue.toLocaleString("id-ID")}</span>
                  <span className="seller-stat-label">Total Revenue</span>
                </div>
                <div className="seller-stat-card">
                  <span className="seller-stat-value">{stats.chats}</span>
                  <span className="seller-stat-label">Unread Buyer Chats</span>
                </div>
              </div>
            </div>
          )}

          {/* MY LISTINGS — active/inactive management */}
          {activeTab === "listings" && <SellerListings user={user} />}

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

          {/* INCOMING ORDERS — realtime sales routed by seller_id */}
          {activeTab === "orders" && (
            <SellerOrders
              user={user}
              view="incoming"
              onOrdersChange={(orders) => {
                const today = new Date().toDateString();
                setStats((s) => ({
                  ...s,
                  revenue: orders.reduce((sum, o) => sum + Number(o.total || 0), 0),
                  ordersToday: orders.filter(
                    (o) => new Date(o.created_at).toDateString() === today
                  ).length,
                }));
              }}
            />
          )}

          {/* EXPEDITION */}
          {activeTab === "expedition" && (
            <SellerOrders user={user} view="expedition" />
          )}

          {/* CHATS */}
          {activeTab === "chats" && <SellerChats user={user} />}

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
                <label className="seller-label">Shop Description</label>
                <textarea
                  className="seller-input seller-textarea"
                  placeholder="Tell buyers about your shop…"
                  value={shopForm.description}
                  onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })}
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
