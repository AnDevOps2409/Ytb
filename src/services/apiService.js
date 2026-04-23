/**
 * API Service Layer
 */

import { MOCK_VIDEO, MOCK_SUMMARY, TRANSCRIPT_LOADING_STEPS, SUMMARY_LOADING_STEPS } from "../data/mockData";

export const SERVER = "http://localhost:3001";

/**
 * Validate YouTube URL format.
 */
export function isValidYouTubeUrl(url) {
  const pattern =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;
  return pattern.test(url.trim());
}

// More permissive — accepts YouTube + any other video URL (for yt-dlp fallback)
export function isValidVideoUrl(url) {
  return /^https?:\/\/.+\..+/.test(url.trim());
}

/**
 * Fetch REAL transcript from a YouTube URL via Express server.
 */
export async function fetchTranscript(url, apiConfig = {}, onStepChange) {
  if (!isValidVideoUrl(url)) {
    throw new Error("Link video không hợp lệ. Vui lòng kiểm tra lại.");
  }

  // Show loading steps while calling server
  onStepChange?.(0);

  const res = await fetch(`${SERVER}/api/transcript`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, apiConfig }),
  });

  onStepChange?.(1);

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || "Không thể lấy transcript. Thử lại sau.");
  }

  const data = await res.json();

  onStepChange?.(2);

  const sourceLabel = data.transcriptSource === "whisper"
    ? "🎤 Whisper (AI)"
    : (data.lang === "vi" ? "⚡ Subtitle (Tiếng Việt)" : `⚡ Subtitle (${data.lang})`);

  return {
    video: data.video || { title: "Không rõ", channel: "", duration: "", thumbnail: null, url },
    transcript: data.transcript,
    transcriptSource: data.transcriptSource || "subtitle",
    source: sourceLabel,
  };
}

/**
 * Generate summary with standard await (Stream Disabled per user request).
 * @param {string} transcript
 * @param {string} targetLang
 * @param {object} apiConfig
 * @param {(token: string) => void} onChunk - (Unused but kept for compatibility)
 * @param {(summary: object) => void} onDone - called with final parsed summary
 * @param {(err: string) => void} onError - called on error
 */
export async function generateSummaryStream(transcript, targetLang = "vi", apiConfig = {}, onChunk, onDone, onError) {
  let res;
  try {
    res = await fetch(`${SERVER}/api/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, targetLang, apiConfig }),
    });
  } catch (err) {
    onError?.(err.message || "Không thể kết nối server.");
    return;
  }

  if (!res.ok) {
    try {
      const { error } = await res.json();
      onError?.(error || "Không thể tạo tóm tắt. Thử lại sau.");
    } catch {
      onError?.("Không thể tạo tóm tắt. Thử lại sau.");
    }
    return;
  }

  try {
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    onDone?.(data);
  } catch (e) {
    onError?.(e.message || "Lỗi khi xử lý phản hồi từ AI.");
  }
}

/**
 * Optimize transcript text (grammar, punctuation, paragraphs) via AI
 */
export async function optimizeTranscript(transcript, targetLang = "vi", apiConfig = {}) {
  const res = await fetch(`${SERVER}/api/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, targetLang, apiConfig }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Lỗi không xác định." }));
    throw new Error(error || "Không thể tối ưu đoạn văn.");
  }

  const data = await res.json();
  return data.optimizedTranscript;
}

/**
 * Get mock data directly (for "Dùng dữ liệu mẫu" button).
 */
export function getMockData() {
  return {
    video: { ...MOCK_VIDEO },
    transcript: "Đây là dữ liệu mẫu. Dán link YouTube thật để lấy transcript thực.",
    source: "Mock Data",
    summary: { ...MOCK_SUMMARY },
  };
}

/**
 * Check if the LM Studio backend connection is active
 */
export async function checkLMStudioConnection() {
  try {
    const res = await fetch(`${SERVER}/api/lmstudio/status`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Fetch full playlist metadata from the backend.
 */
export async function fetchPlaylist(url) {
  if (!isValidVideoUrl(url)) {
    throw new Error("Link playlist không hợp lệ.");
  }

  const res = await fetch(`${SERVER}/api/playlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || "Không thể lấy thông tin Playlist. Thử lại sau.");
  }

  return await res.json();
}
