import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import LoginPage from "./components/LoginPage";
import HomePage from "./pages/HomePage";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });
  }, []);

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
      <HomePage onLoginClick={() => setShowLogin(true)} user={user} />
      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}