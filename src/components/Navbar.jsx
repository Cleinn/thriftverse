import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Navbar.css";
import cart from "../assets/gridicons_cart.svg"

// Primary text links shown in the secondary bar (match reference layout)
const NAV_LINKS = ["Home", "ThriftVid", "Catalogue", "Trade"];
// Product categories surfaced inside the hamburger dropdown
const CATEGORY_ITEMS = ["All", "Women", "Men", "Kids"];

export default function Navbar({
  onLoginClick,
  onRegisterClick,
  user,
  onProfileClick,
  onSellerClick,
  onPurchasesClick,
  onLogout,
  onCartClick,
  cartCount = 0,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // The active category is driven by the URL (?category=...), defaulting
  // to "All". This keeps the navbar tabs and the product feed in sync.
  const activeNav = searchParams.get("category") || "All";
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Which primary nav link is currently active (highlighted).
  const [activeLink, setActiveLink] = useState("Home");
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  // ---- Self-healing routing -------------------------------------------
  // The navbar must respond on EVERY page (e.g. Item Detail Page), even
  // when a parent page forgets to wire a handler. Each action therefore
  // falls back to direct router navigation.
  // AUTH GATE: the cart requires a logged-in user. When unauthenticated,
  // prompt login instead of opening the cart.
  const handleCartClick = () => {
    if (!user) {
      if (onLoginClick) onLoginClick();
      else navigate("/");
      return;
    }
    if (onCartClick) onCartClick();
    else navigate("/cart");
  };
  const handleProfileClick = onProfileClick || (() => navigate("/profile"));
  const handleSellerClick = onSellerClick || (() => navigate("/seller"));
  const handlePurchasesClick = onPurchasesClick || (() => navigate("/purchases"));
  const handleLogout =
    onLogout ||
    (async () => {
      await supabase.auth.signOut();
      navigate("/");
    });

  function handleNavItem(item) {
    // Category tabs always lead back to the marketplace feed, carrying
    // the selected category in the URL so the product list can filter.
    setMenuOpen(false);
    if (location.pathname !== "/") {
      navigate(item === "All" ? "/" : `/?category=${encodeURIComponent(item)}`);
      return;
    }
    if (item === "All") {
      searchParams.delete("category");
      setSearchParams(searchParams, { replace: true });
    } else {
      searchParams.set("category", item);
      setSearchParams(searchParams, { replace: true });
    }
  }

  function handleNavLink(link) {
    setMenuOpen(false);
    setActiveLink(link);
    // Map each primary link to a section anchor on the home feed.
    const anchors = {
      Home: "home",
      ThriftVid: "thriftvid",
      Catalogue: "catalogue",
      Trade: "catalogue",
    };
    const targetId = anchors[link] || "home";

    function scrollToTarget() {
      if (link === "Home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (location.pathname !== "/") {
      // Navigate home first, then scroll once the home feed has mounted.
      navigate("/");
      setTimeout(scrollToTarget, 120);
    } else {
      scrollToTarget();
    }
  }

  function handleSearch() {
    // Search strictly filters the product feed. The query is carried in the
    // URL (?q=...) so the product list can read and filter against it, the
    // same decoupled pattern used for category filtering.
    const term = search.trim();
    if (location.pathname !== "/") {
      navigate(term ? `/?q=${encodeURIComponent(term)}` : "/");
      return;
    }
    if (term) {
      searchParams.set("q", term);
    } else {
      searchParams.delete("q");
    }
    setSearchParams(searchParams, { replace: true });
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarInitials = displayName.split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 2);
  const avatarUrl = user?.user_metadata?.avatar_url || null;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Highlight the active nav link. Off the home feed nothing is in view,
  // so the route alone decides; on the home feed an IntersectionObserver
  // tracks which section is currently on screen and updates the highlight.
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveLink(null);
      return;
    }
    setActiveLink("Home");
    const sectionToLink = { home: "Home", thriftvid: "ThriftVid", catalogue: "Catalogue" };
    const ids = Object.keys(sectionToLink);
    const els = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const id = visible[0].target.id;
          if (sectionToLink[id]) setActiveLink(sectionToLink[id]);
        }
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: "-80px 0px -40% 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <header className="navbar">
      <div className="navbar__top">
        <span
          className="navbar__logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
          title="Kembali ke beranda"
        >
          Thrift<span className="navbar__logo--green">Verse</span>
        </span>
        <div className="navbar__auth">

          {/* Cart button dengan badge */}
          <button className="navbar-cart" onClick={handleCartClick} id="navbar-cart-btn">
            <img className="cart-icon" src={cart} alt="cart" id="cart-icon-img" />
            {cartCount > 0 && (
              <span className="cart-badge">{cartCount}</span>
            )}
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
                  <img className="navbar__avatar-img" src={avatarUrl} alt={displayName} />
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
                  <button className="navbar__dropdown-item" onClick={() => { setDropdownOpen(false); handleProfileClick(); }}>
                    <span className="navbar__dropdown-icon"></span>Profile
                  </button>
                  <button className="navbar__dropdown-item" onClick={() => { setDropdownOpen(false); handlePurchasesClick(); }}>
                    <span className="navbar__dropdown-icon"></span>My Purchases
                  </button>
                  <button className="navbar__dropdown-item" onClick={() => { setDropdownOpen(false); handleSellerClick(); }}>
                    <span className="navbar__dropdown-icon"></span>Switch to Seller Account
                  </button>
                  <div className="navbar__dropdown-divider" />
                  <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={() => { setDropdownOpen(false); handleLogout(); }}>
                    <span className="navbar__dropdown-icon"></span>Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button className="btn-signup" onClick={onRegisterClick || onLoginClick}>Sign Up</button>
              <button className="btn-login" onClick={onLoginClick}>Log In</button>
            </>
          )}
        </div>
      </div>

      <div className="navbar__secondary">
        <div className="navbar__secondary-left">
          {/* Hamburger button opens the category dropdown */}
          <div className="navbar__menu" ref={menuRef}>
            <button
              className="navbar__hamburger"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Open categories menu"
              aria-expanded={menuOpen}
            >
              <span className="navbar__hamburger-bar" />
              <span className="navbar__hamburger-bar" />
              <span className="navbar__hamburger-bar" />
            </button>
            {menuOpen && (
              <div className="navbar__menu-dropdown">
                <span className="navbar__menu-heading">Categories</span>
                {CATEGORY_ITEMS.map((item) => (
                  <button
                    key={item}
                    className={`navbar__menu-item ${activeNav === item ? "navbar__menu-item--active" : ""}`}
                    onClick={() => handleNavItem(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav>
            <ul className="navbar__nav">
              {NAV_LINKS.map((link) => (
                <li
                  key={link}
                  onClick={() => handleNavLink(link)}
                  className={`navbar__nav-item ${activeLink === link ? "navbar__nav-item--active" : ""}`}
                >
                  {link}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="navbar__search">
          <input
            className="navbar__search-input"
            placeholder="Search an Item"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="navbar__search-btn" onClick={handleSearch}>Search</button>
        </div>
      </div>

      {/* Flying item animation target */}
      <div id="cart-fly-target" style={{
        position: "fixed",
        top: 0, left: 0,
        width: 0, height: 0,
        pointerEvents: "none",
        zIndex: 9999
      }} />
    </header>
  );
}
