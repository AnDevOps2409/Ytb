import "./ErrorState.css";

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state animate-fade-in">
      <div className="error-state__icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <h3 className="error-state__title">Đã xảy ra lỗi</h3>
      <p className="error-state__message">{message}</p>
      <button className="error-state__retry-btn" onClick={onRetry}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        Thử lại
      </button>
    </div>
  );
}
