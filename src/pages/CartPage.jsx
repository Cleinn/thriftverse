import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./CartPage.css";

export default function CartPage({ user, onLoginClick, onCartUpdate }) {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("thriftverse_cart") || "[]");
    setCartItems(cart);
  }, []);

  function saveCart(updated) {
    setCartItems(updated);
    localStorage.setItem("thriftverse_cart", JSON.stringify(updated));
    onCartUpdate?.();
  }

  function updateQty(productId, delta) {
    const updated = cartItems.map((item) =>
      item.product_id === productId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    );
    saveCart(updated);
  }

  function removeItem(productId) {
    saveCart(cartItems.filter((item) => item.product_id !== productId));
  }

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="cart-page">
      <Navbar
        onLoginClick={onLoginClick}
        user={user}
        onCartClick={() => {}}
        cartCount={cartCount}
      />
      <div className="cart-container">
        <div className="cart-main">
          <h2 className="cart-title">Shopping Cart</h2>
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <p>Cart kamu kosong.</p>
              <button onClick={() => navigate("/")}>Lanjut Belanja</button>
            </div>
          ) : (
            <>
              <div className="cart-select-all">
                <input type="checkbox" id="select-all" />
                <label htmlFor="select-all">Select All</label>
              </div>
              {cartItems.map((item) => (
                <div className="cart-item" key={item.product_id}>
                  <input type="checkbox" defaultChecked />
                  <div className="cart-item__inner">
                    <div className="cart-item__seller">
                      🏪 {item.seller_username || item.seller_name || "Penjual"}
                    </div>
                    <div className="cart-item__row">
                      <img src={item.image_url} alt={item.title} className="cart-item__img" />
                      <div className="cart-item__info">
                        <p className="cart-item__name">{item.title}</p>
                        <p className="cart-item__price">
                          Rp {Number(item.price).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="cart-item__qty">
                        <button onClick={() => updateQty(item.product_id, -1)}>−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQty(item.product_id, 1)}>+</button>
                      </div>
                      <button
                        className="cart-item__remove"
                        onClick={() => removeItem(item.product_id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-summary">
            <h3>Trade</h3>
            <div className="cart-total">
              <span>Total:</span>
              <span>Rp {Number(total).toLocaleString("id-ID")}</span>
            </div>
            <button
              className="cart-checkout"
              onClick={() => navigate("/checkout")}
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}