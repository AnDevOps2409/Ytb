import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./MegaSynthesisModal.css";

export default function MegaSynthesisModal({ megaJob, onClose }) {
    const [isExporting, setIsExporting] = useState(false);

    if (!megaJob) return null;

    const exportPdf = async () => {
        try {
            setIsExporting(true);
            const printArea = document.querySelector(".mega-modal__body");
            if (!printArea) return;

            const originalMaxHeight = printArea.style.maxHeight;
            const originalOverflow = printArea.style.overflow;

            printArea.style.maxHeight = "none";
            printArea.style.overflow = "visible";

            const canvas = await html2canvas(printArea, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#18181b"
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
            const fileName = `Ebook_${megaJob.collectionName || "Syllabus"}.pdf`;
            pdf.save(fileName);
        } catch (e) {
            console.error(e);
            alert("Không thể xuất PDF do lỗi hình ảnh.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="mega-modal-overlay" onClick={onClose}>
            <div className="mega-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="mega-modal__header">
                    <div className="mega-modal__title-group">
                        <h2 className="mega-modal__title">📚 E-Book: {megaJob.collectionName}</h2>
                        <div className="mega-modal__meta">
                            <span>Được tổng hợp toàn diện từ {megaJob.itemsCount} bài học</span>
                        </div>
                    </div>
                    <div className="mega-modal__header-actions">
                        {megaJob.status === "success" && (
                            <button className="mega-modal__action-btn" onClick={exportPdf} disabled={isExporting} title="Xuất E-book PDF">
                                {isExporting ? "⏳ Cần chút thời gian..." : "Xuất PDF"}
                            </button>
                        )}
                        <button className="mega-modal__close" onClick={onClose}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="mega-modal__body">
                    {megaJob.status === "loading" ? (
                        <div className="mega-modal__loading">
                            <div className="spinner"></div>
                            <p className="pulse-text">AI đang phân tích và đúc kết toàn bộ khối lượng kiến thức khổng lồ... (Quá trình này có thể tốn 1-3 phút)</p>
                        </div>
                    ) : megaJob.status === "error" ? (
                        <div className="mega-modal__error">
                            <p>⚠ Lỗi tổng hợp: {megaJob.error}</p>
                        </div>
                    ) : (
                        <div className="mega-modal__content">
                            <ReactMarkdown>{megaJob.megaSummary}</ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
