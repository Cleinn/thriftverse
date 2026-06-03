import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import HomePage from "./pages/HomePage";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

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

  return (
    <>
      <HomePage
        onLoginClick={openLogin}
        onRegisterClick={openRegister}
        user={user}
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
