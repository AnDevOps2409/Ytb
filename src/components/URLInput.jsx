import { useState } from "react";
import { isValidVideoUrl } from "../services/apiService";
import "./URLInput.css";

const LANGS = [
  { id: "vi", label: "Tiếng Việt" },
  { id: "en", label: "English" },
  { id: "zh", label: "中文" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
  { id: "fr", label: "Français" },
  { id: "es", label: "Español" },
];

export default function URLInput({ onSubmit, disabled, isHero }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [targetLang, setTargetLang] = useState(
    localStorage.getItem("ai_summary_lang") || "vi"
  );

  const handleSubmit = () => {
    setError("");
    if (!url.trim()) { setError("Vui lòng nhập link video."); return; }
    if (!isValidVideoUrl(url)) { setError("Link không hợp lệ. Phải bắt đầu bằng http:// hoặc https://"); return; }
    onSubmit({ url: url.trim(), targetLang });
  };

  const handleLangChange = (val) => {
    setTargetLang(val);
    localStorage.setItem("ai_summary_lang", val);
  };

  return (
    <div className={`url-input ${isHero ? "url-input--hero" : "url-input--compact"}`}>
      <div className={`url-input__hero-header ${isHero ? '' : 'url-input__hero-header--compact'}`}>
        <h1 className="url-input__hero-title">Biến Video Thành Tri Thức</h1>
        {isHero && (
          <p className="url-input__hero-subtitle">Mô hình AI siêu việt sẽ trích xuất và tóm tắt thông tin tức thì từ bất kỳ link video nào (YouTube, TikTok, Podcasts...)</p>
        )}
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
            placeholder="Dán link YouTube, TikTok, Bilibili..."
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !disabled) handleSubmit(); }}
            disabled={disabled}
            autoFocus
          />
          <button id="btn-fetch-transcript" className="url-input__btn-inline" onClick={handleSubmit} disabled={disabled}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Run
          </button>
        </div>
        {error && <p className="url-input__error">{error}</p>}
      </div>

      <div className="url-input__options-row">
        <div className="url-input__lang-chips">
          {LANGS.map((lang) => (
            <button
              key={lang.id}
              className={`url-input__lang-chip ${targetLang === lang.id ? "active" : ""}`}
              onClick={() => handleLangChange(lang.id)}
              disabled={disabled}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
