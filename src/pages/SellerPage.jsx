import { useState } from "react";
import "./SellerPage.css";

const SELLER_TABS = [
  { id: "overview", label: "Overview"},
  { id: "upload", label: "Upload Product"},
  { id: "expedition", label: "Track Expedition"},
  { id: "chats", label: "Buyer Chats"},
  { id: "shop", label: "Shop Profile"},
];

export default function SellerPage({ user, onBack }) {
  const [activeTab, setActiveTab] = useState("overview");

  const [product, setProduct] = useState({ name: "", price: "", desc: "", category: "Men" });
  const [productMsg, setProductMsg] = useState("");
  const [productMsgType, setProductMsgType] = useState("success");

  const shopName = user?.user_metadata?.shop_name || "";
  const [shopForm, setShopForm] = useState({ name: shopName, bio: "", contact: "" });
  const [shopMsg, setShopMsg] = useState("");
  const [shopMsgType, setShopMsgType] = useState("success");

  function handleProductSubmit(e) {
    e.preventDefault();
    if (!product.name || !product.price) { setProductMsgType("error"); setProductMsg("Name and price are required."); return; }
    setProductMsgType("success"); setProductMsg("Product listed successfully! (demo)");
    setProduct({ name: "", price: "", desc: "", category: "Men" });
  }

  function handleShopSubmit(e) {
    e.preventDefault();
    setProductMsgetShopMsgType("success"); setShopMsg("Shop profile saved! (demo)");
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
                <span className="seller-nav-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <button className="seller-back-btn" onClick={onBack}>
            ← Back to Marketplace
          </button>
        </aside>

        <main className="seller-main">

          {activeTab === "overview" && (
            <div className="seller-content">
              <h1 className="seller-page-title">Overview</h1>
              <p className="seller-page-sub">Welcome back, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Seller"}</p>
              <div className="seller-stats-grid">
                <div className="seller-stat-card">
                  <span className="seller-stat-value">0</span>
                  <span className="seller-stat-label">Active Listings</span>
                </div>
                <div className="seller-stat-card">
                  <span className="seller-stat-value">0</span>
                  <span className="seller-stat-label">Orders Today</span>
                </div>
                <div className="seller-stat-card">
                  <span className="seller-stat-value">Rp 0</span>
                  <span className="seller-stat-label">Total Revenue</span>
                </div>
                <div className="seller-stat-card">
                  <span className="seller-stat-value">0</span>
                  <span className="seller-stat-label">Unread Chats</span>
                </div>
              </div>
              <div className="seller-empty-notice">
                <span className="seller-empty-icon"></span>
                <p>You're all set up! Use the sidebar to manage your shop.</p>
              </div>
            </div>
          )}

          {activeTab === "upload" && (
            <div className="seller-content">
              <h1 className="seller-page-title">Upload Product</h1>
              <p className="seller-page-sub">List a new thrifted item on ThriftVerse.</p>
              <form className="seller-form" onSubmit={handleProductSubmit}>
                <label className="seller-label">Product Name *</label>
                <input
                  className="seller-input"
                  placeholder="e.g. Vintage Denim Jacket"
                  value={product.name}
                  onChange={(e) => setProduct({ ...product, name: e.target.value })}
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
                  {["Men", "Women", "Kids", "Accessories", "Shoes"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <label className="seller-label">Description</label>
                <textarea
                  className="seller-input seller-textarea"
                  placeholder="Describe the condition, size, material…"
                  value={product.desc}
                  onChange={(e) => setProduct({ ...product, desc: e.target.value })}
                />
                <label className="seller-label">Product Photos</label>
                <div className="seller-upload-zone">
                  <span>Click to upload photos</span>
                  <input type="file" accept="image/*" multiple style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer" }} />
                </div>
                <button className="seller-submit-btn" type="submit">List Item</button>
                {productMsg && (
                  <p className={`seller-msg ${productMsgType}`}>{productMsg}</p>
                )}
              </form>
            </div>
          )}

          {activeTab === "expedition" && (
            <div className="seller-content">
              <h1 className="seller-page-title">Track Expedition</h1>
              <p className="seller-page-sub">Monitor all your ongoing deliveries.</p>
              <div className="seller-empty-notice">
                <span className="seller-empty-icon"></span>
                <p>No active shipments right now. Orders you ship will appear here.</p>
              </div>
              <div className="seller-expedition-table-wrap">
                <table className="seller-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Item</th>
                      <th>Buyer</th>
                      <th>Courier</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="seller-table-empty">
                      <td colSpan={5}>No shipments yet</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "chats" && (
            <div className="seller-content seller-chat-layout">
              <div className="seller-chat-sidebar">
                <h2 className="seller-chat-sidebar-title">Conversations</h2>
                <div className="seller-chat-empty">
                  <span></span>
                  <p>No chats yet</p>
                </div>
              </div>
              <div className="seller-chat-main">
                <div className="seller-chat-placeholder">
                  <span className="seller-chat-placeholder-icon"></span>
                  <p>Select a conversation to start chatting with buyers.</p>
                </div>
              </div>
            </div>
          )}

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
                <label className="seller-label">Shop Banner</label>
                <div className="seller-upload-zone seller-upload-zone--banner">
                  <span>Upload a banner image</span>
                  <input type="file" accept="image/*" style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer" }} />
                </div>
                <label className="seller-label">Shop Bio</label>
                <textarea
                  className="seller-input seller-textarea"
                  placeholder="Tell buyers about your shop, what you sell, shipping times…"
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
                {shopMsg && (
                  <p className={`seller-msg ${shopMsgType}`}>{shopMsg}</p>
                )}
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
