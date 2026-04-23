import "./VideoInfoCard.css";

export default function VideoInfoCard({ video, source, transcriptSource }) {
  return (
    <div className="video-card animate-fade-in">
      <div className="video-card__thumbnail">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} />
        ) : (
          <div className="video-card__placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        )}
      </div>
      <div className="video-card__info">
        <h2 className="video-card__title">{video.title}</h2>
        <div className="video-card__meta">
          <span className="video-card__channel">{video.channel}</span>
          {video.duration && (
            <span className="video-card__duration">{video.duration}</span>
          )}
        </div>
        <div className="video-card__source">
          <span className="video-card__source-label">Nguồn:</span>
          <span className="video-card__source-badge">{source}</span>
          {transcriptSource === "whisper" ? (
            <span className="video-card__mode-badge video-card__mode-badge--whisper">🎤 Whisper</span>
          ) : (
            <span className="video-card__mode-badge video-card__mode-badge--subtitle">⚡ Subtitle</span>
          )}
        </div>
      </div>
    </div>
  );
}
