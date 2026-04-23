import { useState } from "react";
import "./HistoryPanel.css";

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const COLLECTIONS_BASE = ["Chung"];

export default function HistoryPanel({
  history, onView, onDelete, onClear, onClose, isSidebar,
  onToggleSave, onSetCollection, collections = [], onAddCollection, onRemoveCollection, onMegaSynthesize
}) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Tất cả");
  const [addingCollection, setAddingCollection] = useState(false);
  const [newCollName, setNewCollName] = useState("");
  const [collDropdownId, setCollDropdownId] = useState(null);

  const allTabs = ["Tất cả", ...COLLECTIONS_BASE, ...collections];

  const filtered = history.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      item.title?.toLowerCase().includes(q) ||
      item.url?.toLowerCase().includes(q) ||
      item.summary?.shortSummary?.toLowerCase().includes(q);
    const matchTab = activeTab === "Tất cả" || item.collection === activeTab;
    return matchSearch && matchTab;
  });

  const savedCount = history.filter((h) => h.saved).length;

  const handleAddCollection = () => {
    if (newCollName.trim()) {
      onAddCollection?.(newCollName.trim());
      setActiveTab(newCollName.trim());
    }
    setNewCollName("");
    setAddingCollection(false);
  };

  const renderSaveBtn = (item) => (
    <button
      className={`history-save-btn ${item.saved ? "history-save-btn--saved" : ""}`}
      onClick={(e) => { e.stopPropagation(); onToggleSave?.(item.id); }}
      title={item.saved ? "Bỏ lưu" : "Lưu lại (không bị xóa khi Clear All)"}
    >
      {item.saved ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )}
    </button>
  );

  const renderCollDropdown = (item) => (
    <div className="history-coll-wrap" onClick={(e) => e.stopPropagation()}>
      <button
        className="history-coll-btn"
        onClick={() => setCollDropdownId(collDropdownId === item.id ? null : item.id)}
        title="Gán collection"
      >
        📁 {item.collection || "Chung"}
      </button>
      {collDropdownId === item.id && (
        <div className="history-coll-dropdown">
          {[...COLLECTIONS_BASE, ...collections].map((c) => (
            <button
              key={c}
              className={`history-coll-option ${item.collection === c ? "active" : ""}`}
              onClick={() => { onSetCollection?.(item.id, c); setCollDropdownId(null); }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={`history-panel ${isSidebar ? "is-sidebar" : ""}`} onClick={() => setCollDropdownId(null)}>
      {/* Header */}
      <div className="history-panel__header">
        <h2 className="history-panel__title">
          Lịch sử <span className="history-panel__count">{history.length}</span>
          {savedCount > 0 && <span className="history-panel__saved-count">🔖 {savedCount}</span>}
        </h2>
        <div className="history-panel__header-actions">
          <button
            className="history-panel__clear-btn"
            onClick={onClear}
            title={savedCount > 0 ? `Xóa ${history.length - savedCount} video chưa lưu (giữ lại ${savedCount} đã Save)` : "Xóa toàn bộ"}
          >
            Xóa {savedCount > 0 ? "chưa lưu" : "tất cả"}
          </button>
          {!isSidebar && (
            <button className="history-panel__close" onClick={onClose} title="Đóng">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="history-search-wrap">
        <svg className="history-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="history-search-input"
          type="text"
          placeholder="Tìm theo tiêu đề, URL, nội dung..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="history-search-clear" onClick={() => setSearch("")}>×</button>
        )}
      </div>

      {/* Collection tabs */}
      <div className="history-tabs">
        {allTabs.map((tab) => (
          <button
            key={tab}
            className={`history-tab ${activeTab === tab ? "history-tab--active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab !== "Tất cả" && tab !== "Chung" && (
              <span
                className="history-tab__del"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveCollection?.(tab);
                  setActiveTab("Tất cả");
                }}
              >×</span>
            )}
          </button>
        ))}
        {addingCollection ? (
          <div className="history-tab-add-form">
            <input
              autoFocus
              className="history-tab-add-input"
              value={newCollName}
              onChange={(e) => setNewCollName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddCollection(); if (e.key === "Escape") setAddingCollection(false); }}
              placeholder="Tên collection..."
            />
            <button className="history-tab-add-confirm" onClick={handleAddCollection}>✓</button>
          </div>
        ) : (
          <button className="history-tab history-tab--add" onClick={() => setAddingCollection(true)} title="Thêm collection">+</button>
        )}
      </div>

      {/* Mega Synthesis Action */}
      {filtered.length > 1 && onMegaSynthesize && (
        <div style={{ padding: "0 20px 10px", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => onMegaSynthesize(activeTab, filtered)}
            title="Gộp tất cả video trong danh sách này thành 1 bài Giáo trình trọn vẹn"
            style={{
              background: "var(--primary-main)",
              color: "#ffffff",
              border: "none",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
            }}
          >
            📚 Tổng hợp E-Book ({filtered.length} bài)
          </button>
        </div>
      )}

      {/* Empty / list */}
      {filtered.length === 0 ? (
        <div className="history-panel__empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
            <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
          <p>{search ? "Không tìm thấy kết quả." : "Chưa có lịch sử nào."}</p>
        </div>
      ) : (
        <div className={isSidebar ? "history-sidebar-list" : "history-panel__table-wrap"}>
          {isSidebar ? (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`history-sidebar-item ${item.saved ? "history-sidebar-item--saved" : ""}`}
                onClick={() => onView(item)}
              >
                <div className="history-sidebar-item__header">
                  <span className="history-table__source-badge">{item.source}</span>
                  <span className="history-table__date">
                    {new Date(item.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>
                <div className="history-sidebar-item__title">{item.title}</div>
                <div className="history-sidebar-item__actions" onClick={(e) => e.stopPropagation()}>
                  {renderSaveBtn(item)}
                  {renderCollDropdown(item)}
                  <button
                    className="history-sidebar-item__delete"
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  >×</button>
                </div>
              </div>
            ))
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Tiêu đề video</th>
                  <th>Nguồn</th>
                  <th>Collection</th>
                  <th>Tóm tắt</th>
                  <th>Thời gian</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className={`history-table__row ${item.saved ? "history-table__row--saved" : ""}`} onClick={() => onView(item)}>
                    <td onClick={(e) => e.stopPropagation()}>{renderSaveBtn(item)}</td>
                    <td>
                      <div className="history-table__title">{item.title}</div>
                      {item.channel && <div className="history-table__channel">{item.channel}</div>}
                    </td>
                    <td><span className="history-table__source-badge">{item.source}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>{renderCollDropdown(item)}</td>
                    <td className="history-table__summary-cell">
                      {item.summary ? (
                        <span className="history-table__summary-preview">
                          {item.summary.shortSummary?.slice(0, 100)}{item.summary.shortSummary?.length > 100 ? "..." : ""}
                        </span>
                      ) : (
                        <span className="history-table__tag history-table__tag--none">Chỉ transcript</span>
                      )}
                    </td>
                    <td className="history-table__date">{formatDate(item.createdAt)}</td>
                    <td>
                      <button
                        className="history-table__delete"
                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                        title="Xóa"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
