import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import SellerPage from "./pages/SellerPage"; 
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [page, setPage] = useState("home");

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });
  }, []);

  function openLogin() {
    setShowRegister(false);
    setShowLogin(true);
  }

  function openRegister() {
    setShowLogin(false);
    setShowRegister(true);
  }

  function closeAll() {
    setShowLogin(false);
    setShowRegister(false);
  }

  async function handleLogout() {
      await supabase.auth.signOut();
      setUser(null);
      setPage("home");
    }

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#020617",
        color: "#fff",
        fontSize: "18px"
      }}>
        Loading...
      </div>
    );
  }

  if (page === "profile" && user) {
      return <ProfilePage user={user} onBack={() => setPage("home")} />;
    }
  
    if (page === "seller" && user) {
      return <SellerPage user={user} onBack={() => setPage("home")} />;
    }

  return (
    <>
      <HomePage
        onLoginClick={openLogin}
        onRegisterClick={openRegister}
        user={user}
        onProfileClick={() => setPage("profile")}
        onSellerClick={() => setPage("seller")}
        onLogout={handleLogout} 
      />
      {showLogin && (
        <LoginPage
          onClose={closeAll}
          onSwitchToRegister={openRegister}
        />
      )}
      {showRegister && (
        <RegisterPage
          onClose={closeAll}
          onSwitchToLogin={openLogin}
        />
      )}
    </>
  );
}
