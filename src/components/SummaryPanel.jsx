import { useState, useEffect } from "react";
import MindmapViewer from "./MindmapViewer";
import "./SummaryPanel.css";

export default function SummaryPanel({ summary, isLoading }) {
  const [checked, setChecked] = useState(() =>
    summary ? summary.actionItems.map(() => false) : []
  );

  // Sync checked array when summary arrives after loading
  useEffect(() => {
    if (summary) setChecked(summary.actionItems.map(() => false));
  }, [summary]);

  const toggle = (idx) =>
    setChecked((prev) => prev.map((v, i) => (i === idx ? !v : v)));

  const doneCount = checked.filter(Boolean).length;
  const total = summary ? summary.actionItems.length : 0;

  function formatGenTime(seconds) {
    const s = parseFloat(seconds);
    if (s >= 60) {
      const m = Math.floor(s / 60);
      const rem = (s % 60).toFixed(0).padStart(2, "0");
      return `${m}p ${rem}s`;
    }
    return `${s.toFixed(1)}s`;
  }

  // Normalize AI output: items may be strings or objects like {description: "...", point: "..."}
  const toString = (v) => {
    if (typeof v === "string") return v;
    if (typeof v === "object" && v !== null) return Object.values(v).find(x => typeof x === "string") || JSON.stringify(v);
    return String(v);
  };

  return (
    <div className="summary-panel animate-fade-in-up">
      <div className="summary-panel__header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <h3 className="summary-panel__title">
          Tóm tắt
          {isLoading && (
            <span style={{ fontSize: "11px", marginLeft: "12px", color: "var(--primary-light)", fontWeight: "600" }} className="pulse-text">
              ✨ Đang xử lý bằng AI...
            </span>
          )}
          {summary?.generationTime && (
            <span style={{ fontSize: "11px", marginLeft: "8px", color: "var(--text-secondary)", fontWeight: "normal", opacity: 0.7 }}>
              ⏱️ {formatGenTime(summary.generationTime)}
            </span>
          )}
        </h3>
      </div>

      {/* ── LOADING SKELETON ── */}
      {isLoading && !summary && (
        <div className="summary-panel__skeleton-container">
          <div className="skeleton-section">
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line skeleton-short"></div>
          </div>
          <div className="skeleton-section">
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-bullet-list">
              <div className="skeleton-bullet-line"></div>
              <div className="skeleton-bullet-line"></div>
              <div className="skeleton-bullet-line skeleton-short"></div>
            </div>
          </div>
          <div className="skeleton-section" style={{ borderBottom: "none", marginBottom: 0 }}>
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-box"></div>
            <div className="skeleton-box"></div>
          </div>
        </div>
      )}

      {/* ── DONE: full structured view ── */}
      {summary && (
        <>
          {/* Section 1: Short Summary */}
          <div className="summary-panel__section">
            <div className="summary-panel__section-header">
              <span className="summary-panel__section-icon">📝</span>
              <h4 className="summary-panel__section-title">Tóm tắt ngắn</h4>
            </div>
            <p className="summary-panel__text">{summary.shortSummary}</p>
          </div>

          {/* Section 2: Key Points */}
          <div className="summary-panel__section">
            <div className="summary-panel__section-header">
              <span className="summary-panel__section-icon">💡</span>
              <h4 className="summary-panel__section-title">Các ý chính</h4>
            </div>
            <ul className="summary-panel__list">
              {summary.keyPoints.map((point, idx) => (
                <li key={idx} className="summary-panel__list-item">
                  <span className="summary-panel__bullet" />
                  {toString(point)}
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3: Action Items */}
          <div className="summary-panel__section">
            <div className="summary-panel__section-header">
              <span className="summary-panel__section-icon">✅</span>
              <h4 className="summary-panel__section-title">Việc cần làm</h4>
              <span className="summary-panel__action-progress">
                {doneCount}/{total}
              </span>
            </div>
            <p className="summary-panel__section-hint">
              Những việc AI gợi ý bạn nên làm sau khi xem video. Bấm để đánh dấu đã xong.
            </p>
            <ul className="summary-panel__checklist">
              {summary.actionItems.map((item, idx) => (
                <li
                  key={idx}
                  className={`summary-panel__check-item${checked[idx] ? " summary-panel__check-item--done" : ""}`}
                  onClick={() => toggle(idx)}
                >
                  <span className={`summary-panel__checkbox${checked[idx] ? " summary-panel__checkbox--checked" : ""}`}>
                    {checked[idx] && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  {toString(item)}
                </li>
              ))}
            </ul>
          </div>

          {/* Section 4: Mindmap */}
          {summary.mindmap && (
            <div className="summary-panel__section">
              <div className="summary-panel__section-header">
                <span className="summary-panel__section-icon">🌳</span>
                <h4 className="summary-panel__section-title">Sơ đồ Tư duy</h4>
              </div>
              <MindmapViewer code={summary.mindmap} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
