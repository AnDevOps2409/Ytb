import express from "express";
import cors from "cors";
import db from "./db.js";
import { YoutubeTranscript } from "youtube-transcript/dist/youtube-transcript.esm.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" })); // Allow large summaries/transcripts

// Helper: fetch YouTube video metadata via oEmbed (free, no API key)
async function fetchVideoMeta(videoUrl) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const resp = await fetch(oembedUrl);
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      title: data.title || "Không rõ tiêu đề",
      channel: data.author_name || "",
      thumbnail: data.thumbnail_url || null,
    };
  } catch {
    return null;
  }
}

// Helper: format seconds into mm:ss or hh:mm:ss
function formatDuration(totalSeconds) {
  const sec = Math.round(totalSeconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// POST /api/transcript — fetch real YouTube transcript + video metadata
app.post("/api/transcript", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    let segments = null;
    let lang = "vi";

    // Try Vietnamese first
    try {
      segments = await YoutubeTranscript.fetchTranscript(url, { lang: "vi" });
    } catch {
      // Fallback: auto (no lang specified)
      try {
        segments = await YoutubeTranscript.fetchTranscript(url);
        lang = "auto";
      } catch (err2) {
        return res.status(422).json({
          error: "Video này không có phụ đề. Hãy thử video khác có bật phụ đề.",
        });
      }
    }

    // Join all segments into plain text
    const transcript = segments
      .map((s) => s.text.trim())
      .filter(Boolean)
      .join(" ");

    // Calculate duration from last segment
    let duration = "";
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      const totalMs = (last.offset || 0) + (last.duration || 0);
      if (totalMs > 0) duration = formatDuration(totalMs / 1000);
    }

    // Fetch real video metadata (title, channel, thumbnail) in parallel
    const meta = await fetchVideoMeta(url);

    res.json({
      transcript,
      lang,
      segmentCount: segments.length,
      video: {
        title: meta?.title || "Không rõ tiêu đề",
        channel: meta?.channel || "",
        thumbnail: meta?.thumbnail || null,
        duration,
        url,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/summary — generate summary via LM Studio (OpenAI-compatible)
const LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions";

app.post("/api/summary", async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: "Missing transcript" });

  // Truncate if too long (most local models have limited context)
  const maxChars = 12000;
  const trimmed = transcript.length > maxChars
    ? transcript.slice(0, maxChars) + "\n\n[...nội dung bị cắt bớt do quá dài]"
    : transcript;

  const systemPrompt = `Bạn là trợ lý AI chuyên tóm tắt nội dung video. Hãy phân tích transcript và trả về JSON với ĐÚNG format sau, KHÔNG thêm bất kỳ text nào khác ngoài JSON:

{
  "shortSummary": "Tóm tắt ngắn gọn 2-3 câu về nội dung chính",
  "keyPoints": ["Ý chính 1", "Ý chính 2", "Ý chính 3"],
  "actionItems": ["Việc cần làm 1", "Việc cần làm 2"],
  "deadlines": "Các mốc thời gian/deadline được đề cập (hoặc 'Không có deadline cụ thể')"
}

Quy tắc:
- Trả lời bằng tiếng Việt
- keyPoints: 3-6 ý chính quan trọng nhất
- actionItems: 2-5 việc người xem nên làm sau khi xem video
- CHỈ trả về JSON, KHÔNG markdown, KHÔNG giải thích`;

  try {
    const response = await fetch(LM_STUDIO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "default",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Hãy tóm tắt transcript sau:\n\n${trimmed}` },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("LM Studio error:", response.status, errText);
      return res.status(502).json({
        error: "Không kết nối được LM Studio. Hãy chắc chắn LM Studio đang chạy và đã load model.",
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = content.trim();
    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    let summary;
    try {
      summary = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("Failed to parse LM Studio response:", content);
      return res.status(500).json({
        error: "AI trả về format không hợp lệ. Hãy thử lại.",
        raw: content,
      });
    }

    // Validate and normalize the summary structure
    const result = {
      shortSummary: summary.shortSummary || "Không có tóm tắt.",
      keyPoints: Array.isArray(summary.keyPoints) ? summary.keyPoints : [],
      actionItems: Array.isArray(summary.actionItems) ? summary.actionItems : [],
      deadlines: summary.deadlines || "Không có deadline cụ thể.",
    };

    res.json(result);
  } catch (err) {
    console.error("Summary generation error:", err.message);
    if (err.cause?.code === "ECONNREFUSED") {
      return res.status(502).json({
        error: "Không kết nối được LM Studio tại localhost:1234. Hãy mở LM Studio và load một model.",
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history — get all entries
app.get("/api/history", (req, res) => {
  try {
    const rows = db
      .prepare("SELECT * FROM history ORDER BY createdAt DESC")
      .all();
    // Parse summary JSON for each row
    const parsed = rows.map((r) => ({
      ...r,
      summary: r.summary ? JSON.parse(r.summary) : null,
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/history — add new entry
app.post("/api/history", (req, res) => {
  try {
    const { url, title, channel, duration, source, transcript, summary } =
      req.body;
    const createdAt = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO history (createdAt, url, title, channel, duration, source, transcript, summary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        createdAt,
        url || "",
        title || "Không rõ",
        channel || "",
        duration || "",
        source || "",
        transcript || "",
        summary ? JSON.stringify(summary) : null
      );
    res.json({ id: result.lastInsertRowid, createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/history/:id/summary — update summary
app.patch("/api/history/:id/summary", (req, res) => {
  try {
    const { id } = req.params;
    const { summary } = req.body;
    db.prepare("UPDATE history SET summary = ? WHERE id = ?").run(
      JSON.stringify(summary),
      id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/history/:id — delete one entry
app.delete("/api/history/:id", (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM history WHERE id = ?").run(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/history — clear all
app.delete("/api/history", (req, res) => {
  try {
    db.prepare("DELETE FROM history").run();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ STT Server running at http://localhost:${PORT}`);
});
