import { useState, useEffect } from "react";
import { checkLMStudioConnection } from "../services/apiService";
import "./Navbar.css";

export default function Navbar({ theme, onToggleTheme, historyCount, onShowHistory }) {
  const [aiStatus, setAiStatus] = useState("checking");

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        const isOnline = await checkLMStudioConnection();
        if (mounted) setAiStatus(isOnline ? "online" : "offline");
      } catch {
        if (mounted) setAiStatus("offline");
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#FF0000" />
            <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#fff" />
          </svg>
          <span className="navbar__title">Transcript & Summary</span>
        </div>

        <div className="navbar__status-container" title={aiStatus === "online" ? "AI Local sẵn sàng" : aiStatus === "checking" ? "Đang kiểm tra AI..." : "Mất kết nối AI Local"}>
          <div className={`navbar__status-dot navbar__status-dot--${aiStatus}`}></div>
          <span className="navbar__status-text">
            {aiStatus === "online" ? "AI Sẵn sàng" : aiStatus === "checking" ? "Đang test..." : "AI Đang tắt"}
          </span>
        </div>

        <div className="navbar__actions">
          <button
            className="navbar__btn"
            id="btn-show-history"
            onClick={onShowHistory}
            title="Xem lịch sử"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
            <span>Lịch sử</span>
            {historyCount > 0 && (
              <span className="navbar__badge">{historyCount}</span>
            )}
          </button>
          <button
            className="navbar__btn navbar__btn--icon"
            id="btn-toggle-theme"
            onClick={onToggleTheme}
            title={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"}
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
