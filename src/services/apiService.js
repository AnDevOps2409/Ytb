/**
 * API Service Layer
 */

import { MOCK_VIDEO, MOCK_SUMMARY, TRANSCRIPT_LOADING_STEPS, SUMMARY_LOADING_STEPS } from "../data/mockData";

const SERVER = "http://localhost:3001";

/**
 * Validate YouTube URL format.
 */
export function isValidYouTubeUrl(url) {
  const pattern =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;
  return pattern.test(url.trim());
}

/**
 * Fetch REAL transcript from a YouTube URL via Express server.
 */
export async function fetchTranscript(url, onStepChange) {
  if (!isValidYouTubeUrl(url)) {
    throw new Error("Link YouTube không hợp lệ. Vui lòng kiểm tra lại.");
  }

  // Show loading steps while calling server
  onStepChange?.(0);

  const res = await fetch(`${SERVER}/api/transcript`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  onStepChange?.(1);

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || "Không thể lấy transcript. Thử lại sau.");
  }

  const data = await res.json();

  onStepChange?.(2);

  return {
    video: data.video || { title: "Không rõ", channel: "", duration: "", thumbnail: null, url },
    transcript: data.transcript,
    source: data.lang === "vi" ? "YouTube Subtitles (Tiếng Việt)" : `YouTube Subtitles (${data.lang})`,
  };
}

/**
 * Generate summary from a transcript via LM Studio (through server).
 */
export async function generateSummary(transcript, onStepChange) {
  onStepChange?.(0);

  const res = await fetch(`${SERVER}/api/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });

  onStepChange?.(1);

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Lỗi không xác định." }));
    throw new Error(error || "Không thể tạo tóm tắt. Thử lại sau.");
  }

  const summary = await res.json();
  return summary;
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
