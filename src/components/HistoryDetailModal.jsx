import { useState } from "react";
import FormattedTranscript from "./FormattedTranscript";
import MindmapViewer from "./MindmapViewer";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./HistoryDetailModal.css";

export default function HistoryDetailModal({ item, onClose, onGenerateSummary, activeJob }) {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  if (!item) return null;

  // Normalize AI output: items may be strings or objects like {description: "..."}
  const toString = (v) => {
    if (typeof v === "string") return v;
    if (typeof v === "object" && v !== null) return Object.values(v).find(x => typeof x === "string") || JSON.stringify(v);
    return String(v);
  };

  const handleGenerateSummary = async () => {
    if (!onGenerateSummary || isSummarizing) return;
    setIsSummarizing(true);
    try {
      await onGenerateSummary(item);
    } finally {
      setIsSummarizing(false);
    }
  };

  const copyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(item.transcript);
    } catch {/* fallback not needed in modal */ }
  };

  const exportMarkdown = () => {
    const slug = (s) => (s || "").slice(0, 40).replace(/[^a-zA-Z0-9\u00C0-\u1EF9 \-_]/g, "").trim();
    const lines = [
      `# ${item.title}`,
      ``,
      `> **Kênh:** ${item.channel || "Không rõ"} · **Nguồn:** ${item.source || ""}`,
      `> **URL:** ${item.url}`,
      ``,
    ];
    if (item.summary) {
      lines.push(`## 📝 Tóm tắt`, ``, item.summary.shortSummary || "", ``);
      if (item.summary.keyPoints?.length) {
        lines.push(`## 🔑 Ý chính`, "");
        item.summary.keyPoints.forEach((p, i) => lines.push(`### ${i + 1}. Ý chính`, toString(p), ""));
      }
      if (item.summary.actionItems?.length) {
        lines.push(`## ✅ Việc cần làm`, "");
        item.summary.actionItems.forEach((a) => lines.push(`- [ ] ${toString(a)}`));
        lines.push("");
      }
      if (item.summary.mindmap) {
        lines.push(`## 🧠 Sơ đồ Tư duy`, ``, "\`\`\`mermaid", item.summary.mindmap, "\`\`\`", "");
      }
    }
    lines.push(`## 📄 Transcript`, "", item.transcript || "");

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(item.title)}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
        ...item.summary.keyPoints.map((p) => `• ${toString(p)}`),
        "",
        "Việc cần làm:",
        ...item.summary.actionItems.map((a) => `☐ ${toString(a)}`),
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

  const exportPdf = async () => {
    try {
      setIsExporting(true);
      const printArea = document.querySelector(".modal__body");
      if (!printArea) return;

      const originalMaxHeight = printArea.style.maxHeight;
      const originalOverflow = printArea.style.overflow;

      // Expand element fully so html2canvas captures everything
      printArea.style.maxHeight = "none";
      printArea.style.overflow = "visible";

      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#18181b" // Match dark mode theme 
      });

      printArea.style.maxHeight = originalMaxHeight;
      printArea.style.overflow = originalOverflow;

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
      const fileName = `${item.title.slice(0, 40).replace(/[^a-zA-Z0-9À-ỹ \-_]/g, "").trim() || "document"}.pdf`;
      pdf.save(fileName);
    } catch (e) {
      console.error(e);
      alert("Không thể xuất PDF do lỗi hình ảnh.");
    } finally {
      setIsExporting(false);
    }
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
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy transcript
            </button>
            <button className="modal__action-btn primary" onClick={exportMarkdown} title="Xuất Markdown">
              MD
            </button>
            <button className="modal__action-btn" onClick={exportTxt} title="Xuất Text">
              TXT
            </button>
            <button className="modal__action-btn" onClick={exportPdf} disabled={isExporting} title="Xuất tài liệu PDF">
              {isExporting ? "⏳..." : "PDF"}
            </button>
            <button className="modal__close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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
          {item.summary || (activeJob && activeJob.summaryStatus === "success" && activeJob.summaryData) ? (
            <section className="modal__section">
              <h3 className="modal__section-title">⚡ Tóm tắt</h3>
              <div className="modal__summary-single">
                <p className="modal__summary-short">{item.summary ? item.summary.shortSummary : activeJob.summaryData.shortSummary}</p>

                <div className="modal__summary-block">
                  <div className="modal__summary-label">💡 Các ý chính</div>
                  <ul className="modal__bullet-list">
                    {(item.summary ? item.summary.keyPoints : activeJob.summaryData.keyPoints).map((p, i) => <li key={i}>{toString(p)}</li>)}
                  </ul>
                </div>

                <div className="modal__summary-block">
                  <div className="modal__summary-label">✅ Việc cần làm</div>
                  <ul className="modal__check-list">
                    {(item.summary ? item.summary.actionItems : activeJob.summaryData.actionItems).map((a, i) => <li key={i}>{toString(a)}</li>)}
                  </ul>
                </div>
              </div>

              {/* Mindmap Section */}
              {((item.summary && item.summary.mindmap) || (activeJob && activeJob.summaryData && activeJob.summaryData.mindmap)) && (
                <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border-light)" }}>
                  <div className="modal__summary-label" style={{ marginBottom: "12px" }}>🌳 Sơ đồ Tư duy</div>
                  <MindmapViewer code={item.summary ? item.summary.mindmap : activeJob.summaryData.mindmap} />
                </div>
              )}
            </section>
          ) : activeJob && activeJob.summaryStatus === "loading" ? (
            <section className="modal__section">
              <h3 className="modal__section-title">⚡ Tóm tắt</h3>
              <div className="modal__no-summary" style={{ textAlign: "left" }}>
                <p className="pulse-text" style={{ color: "var(--primary-light)", fontWeight: "600", marginBottom: "16px" }}>
                  {activeJob.summaryRaw ? "✨ AI đang tạo tóm tắt..." : "⏳ Xin chờ..."}
                </p>
                {activeJob.summaryRaw && (
                  <p style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6" }}>
                    {activeJob.summaryRaw}
                  </p>
                )}
              </div>
            </section>
          ) : (
            <div className="modal__no-summary">
              <p>Chưa có tóm tắt cho video này.</p>
              {onGenerateSummary && (
                <button
                  className="modal__summarize-btn"
                  onClick={handleGenerateSummary}
                  disabled={isSummarizing || (activeJob && activeJob.summaryStatus === "loading")}
                >
                  {isSummarizing ? (
                    <>⏳ Đang tóm tắt...</>
                  ) : (
                    <>⚡ Tóm tắt ngay</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
