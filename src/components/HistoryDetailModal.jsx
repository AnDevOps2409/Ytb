import FormattedTranscript from "./FormattedTranscript";
import "./HistoryDetailModal.css";

export default function HistoryDetailModal({ item, onClose }) {
  if (!item) return null;

  const copyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(item.transcript);
    } catch {/* fallback not needed in modal */}
  };

  const exportTxt = () => {
    const content = [
      `=== ${item.title} ===`,
      `Nguồn: ${item.source}`,
      `URL: ${item.url}`,
      "",
      "--- TRANSCRIPT ---",
      item.transcript,
      ...(item.summary ? [
        "",
        "--- TÓM TẮT ---",
        item.summary.shortSummary,
        "",
        "Các ý chính:",
        ...item.summary.keyPoints.map((p) => `• ${p}`),
        "",
        "Việc cần làm:",
        ...item.summary.actionItems.map((a) => `☐ ${a}`),
        "",
        `Thời hạn: ${item.summary.deadlines}`,
      ] : []),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title.slice(0, 40).replace(/[^a-zA-Z0-9À-ỹ ]/g, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal__header">
          <div className="modal__title-group">
            <h2 className="modal__title">{item.title}</h2>
            <div className="modal__meta">
              {item.channel && <span>{item.channel}</span>}
              {item.duration && <span>· {item.duration}</span>}
              <span className="modal__source-badge">{item.source}</span>
            </div>
          </div>
          <div className="modal__header-actions">
            <button className="modal__action-btn" onClick={copyTranscript}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy transcript
            </button>
            <button className="modal__action-btn" onClick={exportTxt}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export .txt
            </button>
            <button className="modal__close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal__body">
          {/* Transcript */}
          <section className="modal__section">
            <h3 className="modal__section-title">📄 Transcript</h3>
            <div className="modal__transcript">
              <FormattedTranscript transcript={item.transcript} />
            </div>
          </section>

          {/* Summary */}
          {item.summary ? (
            <section className="modal__section">
              <h3 className="modal__section-title">⚡ Tóm tắt</h3>
              <div className="modal__summary-grid">
                <div className="modal__summary-card">
                  <div className="modal__summary-card-label">📝 Tóm tắt ngắn</div>
                  <p className="modal__summary-text">{item.summary.shortSummary}</p>
                </div>
                <div className="modal__summary-card">
                  <div className="modal__summary-card-label">💡 Các ý chính</div>
                  <ul className="modal__bullet-list">
                    {item.summary.keyPoints.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
                <div className="modal__summary-card">
                  <div className="modal__summary-card-label">✅ Việc cần làm</div>
                  <ul className="modal__check-list">
                    {item.summary.actionItems.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
                <div className="modal__summary-card modal__summary-card--deadline">
                  <div className="modal__summary-card-label">📅 Thời hạn</div>
                  <p className="modal__deadline">{item.summary.deadlines}</p>
                </div>
              </div>
            </section>
          ) : (
            <div className="modal__no-summary">
              Chưa có tóm tắt cho video này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
