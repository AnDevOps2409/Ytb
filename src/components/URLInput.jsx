import { useState } from "react";
import { isValidYouTubeUrl } from "../services/apiService";
import "./URLInput.css";

export default function URLInput({ onSubmit, onUseMockData, disabled }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setError("");
    if (!url.trim()) {
      setError("Vui lòng nhập link YouTube.");
      return;
    }
    if (!isValidYouTubeUrl(url)) {
      setError("Link YouTube không hợp lệ. Ví dụ: https://youtube.com/watch?v=...");
      return;
    }
    onSubmit(url.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !disabled) handleSubmit();
  };

  return (
    <div className="url-input">
      <div className="url-input__header">
        <div className="url-input__icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
              fill="#FF0000"
            />
            <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#fff" />
          </svg>
        </div>
        <h1 className="url-input__title">YouTube Transcript & Summary</h1>
        <p className="url-input__subtitle">
          Chuyển đổi video YouTube thành transcript và tóm tắt tiếng Việt
        </p>
      </div>

      <div className="url-input__steps">
        <div className="url-input__step">
          <span className="url-input__step-number">1</span>
          <span className="url-input__step-text">Tạo transcript đầy đủ từ video</span>
        </div>
        <div className="url-input__step-arrow">→</div>
        <div className="url-input__step">
          <span className="url-input__step-number">2</span>
          <span className="url-input__step-text">Tạo tóm tắt thông minh từ transcript</span>
        </div>
      </div>

      <div className="url-input__field-group">
        <div className={`url-input__field ${error ? "url-input__field--error" : ""}`}>
          <svg className="url-input__link-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <input
            id="youtube-url-input"
            type="url"
            className="url-input__input"
            placeholder="Dán link YouTube vào đây..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            autoFocus
          />
        </div>
        {error && <p className="url-input__error">{error}</p>}
      </div>

      <div className="url-input__actions">
        <button
          id="btn-fetch-transcript"
          className="url-input__btn url-input__btn--primary"
          onClick={handleSubmit}
          disabled={disabled}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Lấy transcript
        </button>
        <button
          id="btn-use-mock-data"
          className="url-input__btn url-input__btn--secondary"
          onClick={onUseMockData}
          disabled={disabled}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Dùng dữ liệu mẫu
        </button>
      </div>
    </div>
  );
}
