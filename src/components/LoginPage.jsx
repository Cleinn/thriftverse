import { useState } from "react";
import { supabase } from "../lib/supabase";
import "./LoginPage.css";

export default function LoginPage({ onClose, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function validateForm() {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!email.includes("@")) {
      newErrors.email = "Please enter a valid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin(e) {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setMessage("Login successful!");
      setEmail("");
      setPassword("");
      
      // Close modal after successful login
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      setMessage(`${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-modal-overlay">
      <div className="login-card">
        <button className="login-modal-close" onClick={onClose}>×</button>
        
        <h1 className="login-title">
          Thrift<span className="login-title-green">Verse</span>
        </h1>
        <p className="login-subtitle">
          a social-driven online thrifting ecosystem where sustainability meets individuality
        </p>

        <form onSubmit={handleLogin} noValidate>
          <div className="form-container">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="text"
                className={`form-input ${errors.email ? "input-error" : ""}`}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className={`form-input ${errors.password ? "input-error" : ""}`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>
          </div>

          {message && <div className={`message ${message.includes("✅") ? "success" : "error"}`}>{message}</div>}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="login-footer">
          <p>Don't have an account?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (onSwitchToRegister) onSwitchToRegister();
              }}
            >
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}