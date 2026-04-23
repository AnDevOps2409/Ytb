import { useState } from "react";
import "./PlaylistHub.css";

function formatDuration(sec) {
    if (!sec) return "";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlaylistHub({ playlist, onProcessVideo, onClose }) {
    if (!playlist) return null;

    return (
        <div className="playlist-hub animate-fade-in-up">
            <div className="playlist-hub__header">
                <div className="playlist-hub__header-info">
                    <h2>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                            <polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
                        </svg>
                        {playlist.title}
                    </h2>
                    <p>{playlist.videos.length} videos found in this playlist</p>
                </div>
                <button className="playlist-hub__close" onClick={onClose} title="Đóng Playlist">
                    ×
                </button>
            </div>

            <div className="playlist-hub__list">
                {playlist.videos.map((video, idx) => (
                    <div key={video.id} className="playlist-hub__item">
                        <div className="playlist-hub__item-index">{idx + 1}</div>
                        <div className="playlist-hub__item-details">
                            <div className="playlist-hub__item-title" title={video.title}>
                                {video.title}
                            </div>
                            <div className="playlist-hub__item-meta">
                                {video.uploader} {video.duration > 0 && `• ${formatDuration(video.duration)}`}
                            </div>
                        </div>
                        <button
                            className="playlist-hub__btn-process"
                            onClick={() => onProcessVideo(video, playlist.title)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            Phân tích
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
