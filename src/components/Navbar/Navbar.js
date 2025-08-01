// Navbar.js の修正
import React from "react";
import "./Navbar.css";

const Navbar = ({ searchTerm, onSearchChange, onSearchClear, disabled = false }) => {
  return (
    <nav>
      <div className="navbar-content">
        <h1 className="navbar-title">ポケモン図鑑</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder={disabled ? "読み込み中..." : "ポケモン名で検索..."}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
            disabled={disabled} // 初期読み込み中は無効化
          />
          {searchTerm && !disabled && (
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