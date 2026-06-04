import { useState, useRef, useEffect } from "react";
import "./Navbar.css";
import cart from "../assets/gridicons_cart.svg"

const NAV_ITEMS = ["All", "Men", "Women", "Kids"];

export default function Navbar({
  onLoginClick,
  onRegisterClick,
  user,
  onProfileClick,
  onSellerClick,
  onLogout,
}) {
  const [activeNav, setActiveNav] = useState("All");
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  function handleSearch() {
    if (search.trim()) {
      alert(`Searching for: "${search}"`);
    } else {
      alert("Please enter something to search.");
    }
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  const avatarInitials = displayName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarUrl = user?.user_metadata?.avatar_url || null;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar__top">
        <span className="navbar__logo">
          Thrift<span className="navbar__logo--green">Verse</span>
        </span>
        <div className="navbar__auth">
          <button className="navbar-cart">
            <img className="cart-icon" src={cart} alt="cart" />
          </button>

          {user ? (
            <div className="navbar__user-info" ref={dropdownRef}>
              <span className="navbar__display-name">{displayName}</span>

              <div
                className="navbar__avatar"
                onClick={() => setDropdownOpen((prev) => !prev)}
                title="Account menu"
              >
                {avatarUrl ? (
                  <img
                    className="navbar__avatar-img"
                    src={avatarUrl}
                    alt={displayName}
                  />
                ) : (
                  <span className="navbar__avatar-initials">{avatarInitials}</span>
                )}
              </div>

              {dropdownOpen && (
                <div className="navbar__dropdown">
                  <div className="navbar__dropdown-header">
                    <span className="navbar__dropdown-name">{displayName}</span>
                    <span className="navbar__dropdown-email">{user?.email}</span>
                  </div>
                  <div className="navbar__dropdown-divider" />
                  <button
                    className="navbar__dropdown-item"
                    onClick={() => { setDropdownOpen(false); onProfileClick?.(); }}
                  >
                    <span className="navbar__dropdown-icon"></span>
                    Profile
                  </button>
                  <button
                    className="navbar__dropdown-item"
                    onClick={() => { setDropdownOpen(false); onSellerClick?.(); }}
                  >
                    <span className="navbar__dropdown-icon"></span>
                    Switch to Seller Account
                  </button>
                  <div className="navbar__dropdown-divider" />
                  <button
                    className="navbar__dropdown-item navbar__dropdown-item--danger"
                    onClick={() => { setDropdownOpen(false); onLogout?.(); }}
                  >
                    <span className="navbar__dropdown-icon"></span>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button className="btn-signup" onClick={onRegisterClick}>
                Sign Up
              </button>
              <button className="btn-login" onClick={onLoginClick}>
                Log In
              </button>
            </>
          )}
        </div>
      </div>

      <div className="navbar__secondary">
        <nav>
          <ul className="navbar__nav">
            {NAV_ITEMS.map((item) => (
              <li
                key={item}
                onClick={() => setActiveNav(item)}
                className={`navbar__nav-item ${activeNav === item ? "navbar__nav-item--active" : ""}`}
              >
                {item}
              </li>
            ))}
          </ul>
        </nav>

        <div className="navbar__search">
          <input
            className="navbar__search-input"
            placeholder="Search an Item"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="navbar__search-btn" onClick={handleSearch}>
            Search
          </button>
        </div>
      </div>
    </header>
  );
}