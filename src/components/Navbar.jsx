import { useState } from "react";
import "./Navbar.css";
import cart from "../assets/gridicons_cart.svg"

const NAV_ITEMS = ["All", "Men", "Women", "Kids"];

export default function Navbar({ onLoginClick, onRegisterClick, user }) {
  const [activeNav, setActiveNav] = useState("All");
  const [search, setSearch] = useState("");

  function handleSearch() {
    if (search.trim()) {
      alert(`Searching for: "${search}"`);
    } else {
      alert("Please enter something to search.");
    }
  }

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
          <button className="btn-signup" onClick={onRegisterClick}>
            Sign Up
          </button>
          <button className="btn-login" onClick={onLoginClick}>
            Log In
          </button>
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