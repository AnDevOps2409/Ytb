import "./HistoryPanel.css";

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPanel({ history, onView, onDelete, onClear, onClose }) {
  if (history.length === 0) {
    return (
      <div className="history-panel">
        <div className="history-panel__header">
          <h2 className="history-panel__title">Lịch sử</h2>
          <button className="history-panel__close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="history-panel__empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0.3}}>
            <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
          </svg>
          <p>Chưa có lịch sử nào.<br/>Xử lý video đầu tiên để bắt đầu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-panel">
      <div className="history-panel__header">
        <h2 className="history-panel__title">Lịch sử <span className="history-panel__count">{history.length}</span></h2>
        <div className="history-panel__header-actions">
          <button className="history-panel__clear-btn" onClick={onClear} title="Xóa toàn bộ">
            Xóa tất cả
          </button>
          <button className="history-panel__close" onClick={onClose} title="Đóng">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="history-panel__table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Tiêu đề video</th>
              <th>Nguồn</th>
              <th>Tóm tắt</th>
              <th>Thời gian</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id} className="history-table__row" onClick={() => onView(item)}>
                <td>
                  <div className="history-table__title">{item.title}</div>
                  {item.channel && <div className="history-table__channel">{item.channel}</div>}
                </td>
                <td>
                  <span className="history-table__source-badge">{item.source}</span>
                </td>
                <td>
                  {item.summary ? (
                    <span className="history-table__tag history-table__tag--done">Có tóm tắt</span>
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
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
