import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { openOrCreateConversation } from "../lib/chat";
import { fetchSellerProfile } from "../lib/profiles";
import Navbar from "../components/Navbar";
import "./ProductDetailPage.css";

export default function ProductDetailPage({ user, onLoginClick, onCartUpdate, cartCount }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState({ shopName: null, username: null, displayName: null });
  const [loading, setLoading] = useState(true);
  const [barterLoading, setBarterLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from("vw_product_details")
        .select("*")
        .eq("product_id", id)
        .single();

      if (!error && data) {
        setProduct(data);
        if (data.seller_id) {
          const profile = await fetchSellerProfile(data.seller_id);
          setSeller(profile);
        }
      }
      setLoading(false);
    }
    fetchProduct();
  }, [id]);

  function buildCartItem() {
    return {
      ...product,
      seller_shop_name: seller.shopName,
      seller_username: seller.username,
      seller_display_name: seller.displayName,
      quantity,
    };
  }

  function addToCart(navigateAfter = false) {
    const cart = JSON.parse(localStorage.getItem("thriftverse_cart") || "[]");
    const exists = cart.find((item) => item.product_id === product.product_id);
    if (!exists) {
      cart.push(buildCartItem());
    } else {
      exists.quantity += quantity;
    }
    localStorage.setItem("thriftverse_cart", JSON.stringify(cart));
    onCartUpdate?.();

    const cartBtn = document.getElementById("navbar-cart-btn");
    const productImg = document.querySelector(".pdp-main-image");

    if (cartBtn && productImg) {
      const imgRect = productImg.getBoundingClientRect();
      const cartRect = cartBtn.getBoundingClientRect();

      const flyEl = document.createElement("img");
      flyEl.src = product.image_url;
      flyEl.className = "fly-item";
      flyEl.style.left = imgRect.left + imgRect.width / 2 - 30 + "px";
      flyEl.style.top = imgRect.top + "px";
      flyEl.style.position = "fixed";
      flyEl.style.width = "60px";
      flyEl.style.height = "60px";
      flyEl.style.borderRadius = "8px";
      flyEl.style.objectFit = "cover";
      flyEl.style.pointerEvents = "none";
      flyEl.style.zIndex = "9999";

      document.body.appendChild(flyEl);

      const deltaX = cartRect.left - (imgRect.left + imgRect.width / 2 - 30);
      const deltaY = cartRect.top - imgRect.top;

      flyEl.animate([
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.1)`, opacity: 0 }
      ], {
        duration: 700,
        easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        fill: "forwards"
      }).onfinish = () => {
        flyEl.remove();
        if (navigateAfter) navigate("/cart");
      };
    } else {
      if (navigateAfter) navigate("/cart");
    }
  }

  function handleBuyNow() {
    navigate("/checkout", { state: { buyNow: buildCartItem() } });
  }

  async function handleChat() {
    if (!user) {
      onLoginClick();
      return;
    }
    if (user.id === product.seller_id) {
      alert("Ini produk kamu sendiri.");
      return;
    }
    setBarterLoading(true);
    const convId = await openOrCreateConversation({
      productId: product.product_id,
      productTitle: product.title,
      productImage: product.image_url,
      buyerId: user.id,
      sellerId: product.seller_id,
      sellerName: seller.displayName,
    });
    setBarterLoading(false);
    if (convId) {
      navigate("/chat", { state: { conversationId: convId } });
    }
  }

  if (loading) return <div className="pdp-loading"><span className="tv-spinner" /> Loading...</div>;
  if (!product) return <div className="pdp-loading">Produk tidak ditemukan.</div>;

  return (
    <div className="pdp-page tv-page-enter">
      <Navbar
        onLoginClick={onLoginClick}
        user={user}
        onCartClick={() => navigate("/cart")}
        cartCount={cartCount}
      />

      {/* Breadcrumb */}
      <div className="pdp-breadcrumb">
        <span onClick={() => navigate("/")}>Home</span>
        {product.category && (
          <>
            <span className="pdp-breadcrumb__sep"> / </span>
            <span>{product.category}</span>
          </>
        )}
        <span className="pdp-breadcrumb__sep"> / </span>
        <span>{product.title}</span>
      </div>

      {/* Main layout */}
      <div className="pdp-container">

        {/* Left: Image */}
        <div className="pdp-image-section">
          <img
            src={product.image_url}
            alt={product.title}
            className="pdp-main-image"
          />
        </div>

        {/* Right: Info */}
        <div className="pdp-info-section">
          <h1 className="pdp-title">{product.title}</h1>
          <p className="pdp-condition">{product.condition}</p>
          <p className="pdp-price">Rp {Number(product.price).toLocaleString("id-ID")}</p>

          {/* Quantity */}
          <div className="pdp-quantity-section">
            <span className="pdp-quantity-label">Quantity</span>
            <div className="pdp-quantity-controls">
              <button
                className="pdp-qty-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >−</button>
              <span className="pdp-qty-value">{quantity}</span>
              <button
                className="pdp-qty-btn"
                onClick={() => setQuantity((q) => q + 1)}
              >+</button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pdp-actions">
            <button className="pdp-btn pdp-btn--buy" onClick={handleBuyNow}>
              Buy Now
            </button>
            <button className="pdp-btn pdp-btn--cart" onClick={() => addToCart(false)}>
              Add To Cart
            </button>
            <button
              className="pdp-btn pdp-btn--barter"
              onClick={handleChat}
              disabled={barterLoading}
            >
              {barterLoading ? "Membuka chat..." : "Barter"}
            </button>
          </div>
        </div>
      </div>

      {/* Shop Card */}
      <div className="pdp-shop-section">
        <div className="pdp-shop-card">
          <div className="pdp-shop-info">
            <div className="pdp-shop-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
            <span className="pdp-shop-name">
              {seller.displayName || "Shop Name"}
            </span>
          </div>
          <button className="pdp-chat-btn" onClick={handleChat} disabled={barterLoading}>
            {barterLoading ? "..." : "Chat"}
          </button>
        </div>
      </div>

      {/* Details */}
      {product.description && (
        <div className="pdp-details-section">
          <h2 className="pdp-details-title">Details</h2>
          <div className="pdp-details-box">
            <p className="pdp-details-text">{product.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
