import { useState } from "react";
import "./Navbar.css";

const NAV_ITEMS = ["All", "Men", "Women", "Kids"];

export default function Navbar() {
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
      {/* Top bar: Logo + Auth buttons */}
      <div className="navbar__top">
        <span className="navbar__logo">
          Thrift<span className="navbar__logo--green">Verse</span>
        </span>
        <div className="navbar__auth">
          <button className="btn-signup" onClick={() => alert("Sign Up clicked!")}>
            Sign Up
          </button>
          <button className="btn-login" onClick={() => alert("Log In clicked!")}>
            Log In
          </button>
        </div>
      </div>

      {/* Secondary bar: Category nav + Search */}
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
