import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./CheckoutPage.css";

const SHIPPING_OPTIONS = [
  { id: "reguler", label: "Reguler", desc: "Estimasi 3–5 hari", price: 15000 },
  { id: "express", label: "Express", desc: "Estimasi 1–2 hari", price: 25000 },
  { id: "same_day", label: "Same Day", desc: "Tiba hari ini", price: 40000 },
];

const PAYMENT_OPTIONS = [
  {
    id: "bca",
    label: "BCA Virtual Account",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg",
  },
  {
    id: "bri",
    label: "BRI Virtual Account",
    logo: "https://upload.wikimedia.org/wikipedia/commons/6/68/BANK_BRI_logo.svg",
  },
  {
    id: "gopay",
    label: "GoPay",
    logo: "https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg",
  },
  {
    id: "qris",
    label: "QRIS",
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg",
  },
  {
    id: "indomaret",
    label: "Indomaret",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Indomaret_logo.svg/320px-Indomaret_logo.svg.png",
  },
  {
    id: "cod",
    label: "Bayar di Tempat (COD)",
    logo: null,
  },
];

export default function CheckoutPage({ user, onLoginClick, cartCount }) {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [shipping, setShipping] = useState("reguler");
  const [payment, setPayment] = useState("bca");
  const [address, setAddress] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    province: "",
    zip: "",
  });
  const [note, setNote] = useState("");
  const [ordered, setOrdered] = useState(false);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("thriftverse_cart") || "[]");
    setCartItems(cart);
  }, []);

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = SHIPPING_OPTIONS.find((o) => o.id === shipping)?.price || 0;
  const total = subtotal + shippingCost;

  function handleOrder() {
    if (!address.name || !address.street || !address.city) {
      alert("Lengkapi alamat pengiriman dulu ya!");
      return;
    }
    localStorage.removeItem("thriftverse_cart");
    setOrdered(true);
  }

  if (ordered) {
    return (
      <div className="co-page">
        <Navbar onLoginClick={onLoginClick} user={user} cartCount={0} onCartClick={() => navigate("/cart")} />
        <div className="co-success">
          <div className="co-success__icon">✓</div>
          <h2>Pesanan Berhasil!</h2>
          <p>Terima kasih sudah belanja di ThriftVerse.<br />Kami akan segera memproses pesananmu.</p>
          <button onClick={() => navigate("/")}>Kembali ke Beranda</button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="co-page">
        <Navbar onLoginClick={onLoginClick} user={user} cartCount={0} onCartClick={() => navigate("/cart")} />
        <div className="co-success">
          <div className="co-success__icon" style={{ background: "#eee", color: "#999" }}>🛒</div>
          <h2>Cart Kosong</h2>
          <p>Tambahkan produk dulu sebelum checkout.</p>
          <button onClick={() => navigate("/")}>Mulai Belanja</button>
        </div>
      </div>
    );
  }

  return (
    <div className="co-page">
      <Navbar
        onLoginClick={onLoginClick}
        user={user}
        cartCount={cartCount}
        onCartClick={() => navigate("/cart")}
      />

      <div className="co-header-strip">
        <div className="co-header-strip__inner">
          <span className="co-step co-step--active">① Keranjang</span>
          <span className="co-step-arrow">›</span>
          <span className="co-step co-step--current">② Checkout</span>
          <span className="co-step-arrow">›</span>
          <span className="co-step">③ Selesai</span>
        </div>
      </div>

      <div className="co-layout">
        {/* LEFT COLUMN */}
        <div className="co-left">

          {/* Address */}
          <section className="co-card">
            <h3 className="co-card__title">
              <span className="co-card__icon">📍</span> Alamat Pengiriman
            </h3>
            <div className="co-form">
              <div className="co-form__row">
                <div className="co-form__field">
                  <label>Nama Penerima</label>
                  <input
                    placeholder="Nama lengkap"
                    value={address.name}
                    onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  />
                </div>
                <div className="co-form__field">
                  <label>No. Telepon</label>
                  <input
                    placeholder="08xxxxxxxxxx"
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="co-form__field">
                <label>Alamat Lengkap</label>
                <input
                  placeholder="Jalan, No. Rumah, RT/RW"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                />
              </div>
              <div className="co-form__row">
                <div className="co-form__field">
                  <label>Kota</label>
                  <input
                    placeholder="Kota"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  />
                </div>
                <div className="co-form__field">
                  <label>Provinsi</label>
                  <input
                    placeholder="Provinsi"
                    value={address.province}
                    onChange={(e) => setAddress({ ...address, province: e.target.value })}
                  />
                </div>
                <div className="co-form__field co-form__field--sm">
                  <label>Kode Pos</label>
                  <input
                    placeholder="12345"
                    value={address.zip}
                    onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="co-card">
            <h3 className="co-card__title">
              <span className="co-card__icon">🛍</span> Produk ({cartItems.length} item)
            </h3>
            {cartItems.map((item) => (
              <div key={item.product_id} className="co-item">
                <img src={item.image_url} alt={item.title} className="co-item__img" />
                <div className="co-item__info">
                  <p className="co-item__name">{item.title}</p>
                  <p className="co-item__meta">{item.condition} · Qty: {item.quantity}</p>
                </div>
                <p className="co-item__price">
                  Rp {Number(item.price * item.quantity).toLocaleString("id-ID")}
                </p>
              </div>
            ))}
            <div className="co-note">
              <label>Catatan untuk penjual (opsional)</label>
              <textarea
                placeholder="Contoh: tolong bubble wrap ya kak"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </section>

          {/* Shipping */}
          <section className="co-card">
            <h3 className="co-card__title">
              <span className="co-card__icon">🚚</span> Pilih Pengiriman
            </h3>
            <div className="co-options">
              {SHIPPING_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`co-option ${shipping === opt.id ? "co-option--active" : ""}`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    value={opt.id}
                    checked={shipping === opt.id}
                    onChange={() => setShipping(opt.id)}
                  />
                  <div className="co-option__info">
                    <span className="co-option__label">{opt.label}</span>
                    <span className="co-option__desc">{opt.desc}</span>
                  </div>
                  <span className="co-option__price">Rp {opt.price.toLocaleString("id-ID")}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Payment */}
          <section className="co-card">
            <h3 className="co-card__title">
              <span className="co-card__icon">💳</span> Metode Pembayaran
            </h3>
            <div className="co-pay-grid">
              {PAYMENT_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`co-pay-card ${payment === opt.id ? "co-pay-card--active" : ""}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={opt.id}
                    checked={payment === opt.id}
                    onChange={() => setPayment(opt.id)}
                  />
                  <div className="co-pay-card__logo">
                    {opt.logo ? (
                      <img
                        src={opt.logo}
                        alt={opt.label}
                        style={{ height: 28, maxWidth: 80, objectFit: "contain" }}
                      />
                    ) : (
                      <span style={{ fontSize: "1.5rem" }}>💵</span>
                    )}
                  </div>
                  <span className="co-pay-card__label">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN - Summary */}
        <div className="co-right">
          <section className="co-card co-summary">
            <h3 className="co-card__title">Ringkasan Pesanan</h3>
            <div className="co-summary__rows">
              <div className="co-summary__row">
                <span>Subtotal ({cartItems.reduce((s, i) => s + i.quantity, 0)} item)</span>
                <span>Rp {Number(subtotal).toLocaleString("id-ID")}</span>
              </div>
              <div className="co-summary__row">
                <span>Ongkos kirim</span>
                <span>Rp {Number(shippingCost).toLocaleString("id-ID")}</span>
              </div>
              <div className="co-summary__row co-summary__row--total">
                <span>Total</span>
                <span>Rp {Number(total).toLocaleString("id-ID")}</span>
              </div>
            </div>

            <button className="co-order-btn" onClick={handleOrder}>
              Buat Pesanan
            </button>

            <p className="co-summary__note">
              Dengan melanjutkan, kamu menyetujui syarat & ketentuan ThriftVerse.
            </p>
          </section>

          <section className="co-card co-recap">
            <div className="co-recap__row">
              <span>Pengiriman</span>
              <strong>{SHIPPING_OPTIONS.find(o => o.id === shipping)?.label}</strong>
            </div>
            <div className="co-recap__row">
              <span>Pembayaran</span>
              <strong>{PAYMENT_OPTIONS.find(o => o.id === payment)?.label}</strong>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}