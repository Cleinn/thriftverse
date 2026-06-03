import { useState } from "react";
import { supabase } from "../lib/supabase";
import "./LoginPage.css";
import "./LoginModal.css";
import "./RegisterPage.css";

export default function RegisterPage({ onClose, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" | "error"

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  function validateForm() {
    const newErrors = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = "Display name is required";
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = "Display name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email format";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s\-().]{7,20}$/.test(formData.phone.trim())) {
      newErrors.phone = "Enter a valid phone number";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister(e) {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            display_name: formData.displayName.trim(),
            phone: formData.phone.trim(),
          },
        },
      });

      if (error) throw error;

      setMessageType("success");
      setMessage("Account created! Check your email to confirm your account.");
      setFormData({
        displayName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });

      // Switch to login after a short delay
      setTimeout(() => {
        if (onSwitchToLogin) onSwitchToLogin();
      }, 2500);
    } catch (error) {
      setMessageType("error");
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-modal-overlay">
      <div className="login-card register-card">
        <button className="login-modal-close" onClick={onClose}>
          ×
        </button>

        <h1 className="login-title">
          Thrift<span className="login-title-green">Verse</span>
        </h1>
        <p className="login-subtitle">
          a social-driven online thrifting ecosystem where sustainability meets
          individuality
        </p>

        <form onSubmit={handleRegister} noValidate>
        <div className="form-card">
            <div className="form-container">
                <div className="form-group">
                <label className="form-label">Display Name</label>
                <input
                    type="text"
                    name="displayName"
                    className={`form-input ${errors.displayName ? "input-error" : ""}`}
                    placeholder="Your display name"
                    value={formData.displayName}
                    onChange={handleChange}
                />
                {errors.displayName && (
                    <span className="error-text">{errors.displayName}</span>
                )}
                </div>

                <div className="form-group">
                <label className="form-label">Email</label>
                <input
                    type="text"
                    name="email"
                    className={`form-input ${errors.email ? "input-error" : ""}`}
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                />
                {errors.email && (
                    <span className="error-text">{errors.email}</span>
                )}
                </div>

                <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                    type="tel"
                    name="phone"
                    className={`form-input ${errors.phone ? "input-error" : ""}`}
                    placeholder="+62 812 3456 7890"
                    value={formData.phone}
                    onChange={handleChange}
                />
                {errors.phone && (
                    <span className="error-text">{errors.phone}</span>
                )}
                </div>

                <div className="form-group">
                <label className="form-label">Password</label>
                <input
                    type="password"
                    name="password"
                    className={`form-input ${errors.password ? "input-error" : ""}`}
                    placeholder="Min. 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                />
                {errors.password && (
                    <span className="error-text">{errors.password}</span>
                )}
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                    type="password"
                    name="confirmPassword"
                    className={`form-input ${errors.confirmPassword ? "input-error" : ""}`}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                />
                {errors.confirmPassword && (
                    <span className="error-text">{errors.confirmPassword}</span>
                )}
                </div>
            </div>
          </div>

          {message && (
            <div className={`message ${messageType}`}>{message}</div>
          )}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Already have an account?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (onSwitchToLogin) onSwitchToLogin();
              }}
            >
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
