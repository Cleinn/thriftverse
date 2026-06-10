import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { openOrCreateConversation } from "../lib/chat";
import Navbar from "../components/Navbar";
import "./ProductDetailPage.css";

export default function ProductDetailPage({ user, onLoginClick, onCartUpdate, cartCount }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [barterLoading, setBarterLoading] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from("vw_product_details")
        .select("*")
        .eq("product_id", id)
        .single();
      if (!error) setProduct(data);
      setLoading(false);
    }
    fetchProduct();
  }, [id]);

  function addToCart(navigateAfter = false) {
    const cart = JSON.parse(localStorage.getItem("thriftverse_cart") || "[]");
    const exists = cart.find((item) => item.product_id === product.product_id);
    if (!exists) {
      cart.push({ ...product, quantity: 1 });
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

  async function handleBarter() {
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
    });
    setBarterLoading(false);
    if (convId) {
      navigate("/chat");
    }
  }

  if (loading) return <div className="pdp-loading">Loading...</div>;
  if (!product) return <div className="pdp-loading">Produk tidak ditemukan.</div>;

  return (
    <div className="pdp-page">
      <Navbar
        onLoginClick={onLoginClick}
        user={user}
        onCartClick={() => navigate("/cart")}
        cartCount={cartCount}
      />
      <div className="pdp-breadcrumb">
        <span onClick={() => navigate("/")}>Home</span>
        {" / "}
        <span>Men's Fashion</span>
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
          <p className="pdp-price">Rp {Number(product.price).toLocaleString("id-ID")}</p>
          <div className="pdp-actions">
            <button className="pdp-btn pdp-btn--buy" onClick={() => navigate("/checkout")}>
              Buy Now
            </button>
            <button className="pdp-btn pdp-btn--cart" onClick={() => addToCart(false)}>
              Add To Cart
            </button>
            <button
              className="pdp-btn pdp-btn--barter"
              onClick={handleBarter}
              disabled={barterLoading}
            >
              {barterLoading ? "Membuka chat..." : "Barter"}
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