import React from "react";
import "./Navbar.css";

const Navbar = ({ searchTerm, onSearchChange, onSearchClear }) => {
  return (
    <nav>
      <div className="navbar-content">
        <h1 className="navbar-title">ポケモン図鑑</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="ポケモン名で検索..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              onClick={onSearchClear}
              className="search-clear-btn"
              type="button"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;