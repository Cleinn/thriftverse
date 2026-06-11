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
  // BUGFIX: tampilkan NAMA TOKO (shop_name), bukan username
  const [seller, setSeller] = useState({ shopName: null, username: null, displayName: null });
  const [loading, setLoading] = useState(true);
  const [barterLoading, setBarterLoading] = useState(false);

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
          // profiles.shop_name (nama toko) diutamakan; fallback ke username
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
      quantity: 1,
    };
  }

  function addToCart(navigateAfter = false) {
    const cart = JSON.parse(localStorage.getItem("thriftverse_cart") || "[]");
    const exists = cart.find((item) => item.product_id === product.product_id);
    if (!exists) {
      cart.push(buildCartItem());
    } else {
      exists.quantity += 1;
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

  /**
   * BUY NOW — Direct Checkout Flow.
   * Kirim produk ini sebagai satu-satunya item via router state.
   * TIDAK menyentuh cart utama sama sekali (bypass total).
   */
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
      sellerName: seller.displayName, // nama toko sebagai recipient
    });
    setBarterLoading(false);
    if (convId) {
      // Buka chat langsung pada conversation yang benar
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
      <div className="pdp-breadcrumb">
        <span onClick={() => navigate(-1)} title="Kembali">← Back</span>
        {" / "}
        <span onClick={() => navigate("/")}>Home</span>
        {" / "}
        <span>{product.category || "Fashion"}</span>
        {" / "}
        <span>{product.title}</span>
      </div>
      <div className="pdp-container">
        <div className="pdp-image-section">
          <img src={product.image_url} alt={product.title} className="pdp-main-image" />
        </div>
        <div className="pdp-info-section">
          <h1 className="pdp-title">{product.title}</h1>
          <p className="pdp-condition">{product.condition}</p>
          {seller.displayName && (
            <p className="pdp-seller" title={seller.username ? `Penjual: ${seller.username}` : undefined}>
              🏪 {seller.displayName}
            </p>
          )}
          <p className="pdp-price">Rp {Number(product.price).toLocaleString("id-ID")}</p>
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
              {barterLoading ? "Membuka chat..." : "Chat / Barter"}
            </button>
          </div>
          {product.description && (
            <div className="pdp-details">
              <h3>Details</h3>
              <p>{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
