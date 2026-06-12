import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import SellerPage from "./pages/SellerPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import ChatPage from "./pages/ChatPage";
import CheckoutPage from "./pages/CheckoutPage";
import ShopSetupPage from "./pages/ShopSetupPage";
import "./App.css";

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [cartCount, setCartCount] = useState(() => {
    const cart = JSON.parse(localStorage.getItem("thriftverse_cart") || "[]");
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  });
  const navigate = useNavigate();

  function refreshCartCount() {
    const cart = JSON.parse(localStorage.getItem("thriftverse_cart") || "[]");
    setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
  }

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });
  }, []);

  async function refreshUser() {
    const { data } = await supabase.auth.getUser();
    setUser(data?.user || null);
  }

  if (loading) return <div>Loading...</div>;

  return (
    <>
      {showLogin && (
        <LoginPage
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={() => { setShowLogin(false); setShowRegister(true); }}
        />
      )}
      {showRegister && (
        <RegisterPage
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={() => { setShowRegister(false); setShowLogin(true); }}
        />
      )}
      <Routes>
        <Route path="/" element={
          <HomePage
            onLoginClick={() => setShowLogin(true)}
            onRegisterClick={() => setShowRegister(true)}
            user={user}
            onProfileClick={() => navigate("/profile")}
            onSellerClick={() => navigate("/seller")}
            onLogout={async () => { await supabase.auth.signOut(); setUser(null); }}
            onCartClick={() => navigate("/cart")}
            cartCount={cartCount}
          />
        } />
        <Route path="/product/:id" element={
          <ProductDetailPage
            user={user}
            onLoginClick={() => setShowLogin(true)}
            onCartUpdate={refreshCartCount}
            cartCount={cartCount}
          />
        } />
        <Route path="/cart" element={
          <CartPage
            user={user}
            onLoginClick={() => setShowLogin(true)}
            onCartUpdate={refreshCartCount}
          />
        } />
        <Route path="/checkout" element={
          <CheckoutPage
            user={user}
            onLoginClick={() => setShowLogin(true)}
            cartCount={cartCount}
            onCartUpdate={refreshCartCount}
          />
        } />
        <Route path="/chat" element={
          <ChatPage
            user={user}
            onLoginClick={() => setShowLogin(true)}
            cartCount={cartCount}
          />
        } />
        <Route path="/profile" element={
          <ProtectedRoute user={user}>
            <ProfilePage user={user} onUserUpdate={refreshUser} onBack={() => navigate(-1)} />
          </ProtectedRoute>
        } />
        <Route path="/seller/setup" element={
          <ProtectedRoute user={user}>
            {/* SELLER ONBOARDING: mandatory shop setup before dashboard */}
            <ShopSetupPage user={user} />
          </ProtectedRoute>
        } />
        <Route path="/seller" element={
          <ProtectedRoute user={user}>
            <SellerPage user={user} onBack={() => navigate(-1)} />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}