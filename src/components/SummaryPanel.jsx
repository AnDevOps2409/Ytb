import { useState } from "react";
import "./SummaryPanel.css";

export default function SummaryPanel({ summary }) {
  const [checked, setChecked] = useState(() =>
    summary.actionItems.map(() => false)
  );

  const toggle = (idx) =>
    setChecked((prev) => prev.map((v, i) => (i === idx ? !v : v)));

  const doneCount = checked.filter(Boolean).length;
  const total = summary.actionItems.length;

  return (
    <div className="summary-panel animate-fade-in-up">
      <div className="summary-panel__header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <h3 className="summary-panel__title">Tóm tắt</h3>
      </div>

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
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Section 3: Action Items — interactive checkboxes */}
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
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Section 4: Deadlines */}
      <div className="summary-panel__section">
        <div className="summary-panel__section-header">
          <span className="summary-panel__section-icon">📅</span>
          <h4 className="summary-panel__section-title">Thời hạn đề cập trong video</h4>
        </div>
        <p className="summary-panel__section-hint">
          Deadline hoặc mốc thời gian được nhắc đến trong video (nếu có).
        </p>
        <div className="summary-panel__deadline-badge">
          {summary.deadlines}
        </div>
      </div>
    </div>
  );
}
