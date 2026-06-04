import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import SellerPage from "./pages/SellerPage";
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
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });
  }, []);

  async function refreshUser() {
    const { data } = await supabase.auth.getUser();
    if (data?.user) setUser(data.user);
  }

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
    navigate("/");
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
      <Routes>
        <Route
          path="/"
          element={
            <>
              <HomePage
                user={user}
                onLoginClick={openLogin}
                onRegisterClick={openRegister}
                onProfileClick={() => navigate("/profile")}
                onSellerClick={() => navigate("/seller")}
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
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user}>
              <ProfilePage
                user={user}
                onUserUpdate={refreshUser}
                onBack={() => { refreshUser(); navigate("/"); }}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller"
          element={
            <ProtectedRoute user={user}>
              <SellerPage user={user} onBack={() => navigate("/")} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
