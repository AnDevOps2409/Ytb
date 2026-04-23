import express from "express";
import cors from "cors";
import db from "./db.js";
import { YoutubeTranscript } from "youtube-transcript/dist/youtube-transcript.esm.js";
import youtubedl from "youtube-dl-exec";
import ffmpegPath from "ffmpeg-static";
import { createReadStream, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import FormData from "form-data";
import ytpl from "ytpl";

// Ensure temp dir exists for audio downloads
const TMP_DIR = join(process.cwd(), "server", "tmp");
if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

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

function extractBalancedJsonObject(text = "") {
  const start = text.indexOf("{");
  if (start === -1) return "";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return text.slice(start).trim();
}

function sanitizeJsonCandidate(text = "") {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function parseSummaryFallback(text = "") {
  const cleaned = text.replace(/\r/g, "").trim();
  const shortSummaryMatch = cleaned.match(/"shortSummary"\s*:\s*"([\s\S]*?)"/);
  const keyPointsMatch = cleaned.match(/"keyPoints"\s*:\s*\[([\s\S]*?)\]/);
  const actionItemsMatch = cleaned.match(/"actionItems"\s*:\s*\[([\s\S]*?)\]/);
  const mindmapMatch = cleaned.match(/"mindmap"\s*:\s*"([\s\S]*?)"/);

  const parseArrayItems = (raw = "") =>
    [...raw.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((m) =>
      m[1]
        .replace(/\\"/g, "\"")
        .replace(/\\n/g, "\n")
        .trim()
    ).filter(Boolean);

  const summary = {
    shortSummary: shortSummaryMatch?.[1]
      ?.replace(/\\"/g, "\"")
      ?.replace(/\\n/g, "\n")
      ?.trim() || "",
    keyPoints: parseArrayItems(keyPointsMatch?.[1] || ""),
    actionItems: parseArrayItems(actionItemsMatch?.[1] || ""),
    mindmap: mindmapMatch?.[1]?.replace(/\\"/g, "\"")?.replace(/\\n/g, "\n")?.trim() || "",
  };

  if (!summary.shortSummary && summary.keyPoints.length === 0 && summary.actionItems.length === 0) {
    return null;
  }

  return summary;
}

function summaryFromRawText(text = "") {
  const normalized = text
    .replace(/\r/g, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!normalized) return null;

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const shortSummary = normalized;
  const keyPoints = lines
    .filter((line) => /^[-*•]\s+|^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^[-*•]\s+|^\d+\.\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 5);

  return {
    shortSummary,
    keyPoints,
    actionItems: [],
    mindmap: "",
  };
}

// Helper: download audio using yt-dlp to a temp file, return file path
function downloadAudioWithYtDlp(url) {
  return new Promise((resolve, reject) => {
    const outPath = join(TMP_DIR, `audio_${Date.now()}.mp3`);
    console.log("[yt-dlp] Downloading audio via youtube-dl-exec:", url);
    youtubedl(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 5,
      noPlaylist: true,
      output: outPath,
      ffmpegLocation: ffmpegPath
    }).then(() => {
      console.log("[yt-dlp] Audio saved:", outPath);
      resolve(outPath);
    }).catch(err => {
      console.error("[yt-dlp] Error:", err.message);
      reject(new Error("Không thể tải âm thanh (Video có thể lỗi hoặc riêng tư): " + err.message.slice(0, 150)));
    });
  });
}

// Helper: send audio file to LM Studio/OpenAI Whisper endpoint, return transcript text
async function transcribeWithWhisper(audioPath, apiConfig = {}) {
  let aiBaseUrl = (apiConfig.baseUrl || DEFAULT_API_URL)
    .replace(/\/+$/, "")
    // Strip common suffixes so we always have the v1 base
    .replace(/\/chat\/completions$/, "")
    .replace(/\/audio\/transcriptions$/, "");

  const WHISPER_URL = `${aiBaseUrl}/audio/transcriptions`;
  const aiKey = apiConfig.apiKey || "lm-studio";
  // For LM Studio, use configured model name; for OpenAI use whisper-1
  const aiModel = apiConfig.whisperModel || apiConfig.model || "whisper-large-v3";

  console.log(`[Whisper] → URL: ${WHISPER_URL}  model: ${aiModel}`);

  // LM Studio supports standard OpenAI multipart/form-data for /audio/transcriptions
  const form = new FormData();
  form.append("file", createReadStream(audioPath), { filename: "audio.mp3", contentType: "audio/mpeg" });
  form.append("model", aiModel);
  form.append("response_format", "json");

  const resp = await fetch(WHISPER_URL, {
    method: "POST",
    headers: { ...form.getHeaders(), "Authorization": `Bearer ${aiKey}` },
    body: form,
    signal: AbortSignal.timeout(300000), // 5 min timeout
  });

  const raw = await resp.text();
  console.log(`[Whisper] Response status: ${resp.status}, body: ${raw.slice(0, 200)}`);

  if (!resp.ok) {
    throw new Error(`LM Studio Whisper HTTP ${resp.status}: ${raw.slice(0, 300)}`);
  }
  const data = JSON.parse(raw);
  const text = data.text || "";
  console.log(`[Whisper] Transcript received (${text.length} chars)`);
  return text;
}

// POST /api/transcript — fetch real YouTube transcript + video metadata
app.post("/api/transcript", async (req, res) => {
  const { url, apiConfig = {} } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    let segments = null;
    let lang = "vi";
    let transcriptSource = "subtitle"; // ⊡ or whisper 🎤

    // ══ STEP 1: Try subtitle extraction (fast path) ══
    try {
      // Try Vietnamese first
      try {
        segments = await YoutubeTranscript.fetchTranscript(url, { lang: "vi" });
      } catch {
        // Fallback: auto (no lang specified)
        segments = await YoutubeTranscript.fetchTranscript(url);
        lang = "auto";
      }
    } catch {
      segments = null; // Subtitle not available — will try Whisper
    }

    let transcript = "";
    let duration = "";

    if (segments && segments.length > 0) {
      // ⚡ Subtitle mode
      console.log(`[Transcript] Subtitle found (${segments.length} segments)`);
      transcript = segments.map((s) => s.text.trim()).filter(Boolean).join(" ");
      const last = segments[segments.length - 1];
      const totalMs = (last.offset || 0) + (last.duration || 0);
      if (totalMs > 0) duration = formatDuration(totalMs / 1000);
    } else {
      // 🎤 Whisper fallback
      console.log("[Transcript] No subtitle found — falling back to Whisper");
      transcriptSource = "whisper";
      let audioPath = null;
      let whisperError = null;
      try {
        audioPath = await downloadAudioWithYtDlp(url);
        // Verify the file was actually created
        if (!audioPath || !existsSync(audioPath)) {
          throw new Error("File âm thanh không tồn tại sau khi tải (yt-dlp có thể bị lỗi).");
        }
        const { statSync } = await import("fs");
        const stat = statSync(audioPath);
        console.log(`[Whisper] Audio file ready: ${stat.size} bytes`);
        if (stat.size < 1000) throw new Error("File âm thanh quá nhỏ, có thể tải thất bại.");
        transcript = await transcribeWithWhisper(audioPath, apiConfig);
      } catch (err) {
        whisperError = err.message || String(err);
        console.error("[Whisper] Pipeline error:", whisperError);
      } finally {
        if (audioPath && existsSync(audioPath)) {
          rmSync(audioPath);
          console.log("[Cleanup] Removed temp audio:", audioPath);
        }
      }
      if (!transcript) {
        return res.status(422).json({
          error: `Không thể lấy transcript qua Whisper. Lỗi: ${whisperError || "Whisper trả về rỗng. Kiểm tra xem Whisper đã được load trong LM Studio chưa."}`,
        });
      }

      // 🌐 Translate Whisper transcript to Vietnamese via LLM
      console.log("[Whisper] Translating transcript to Vietnamese...");
      try {
        const aiBaseUrl = (apiConfig.baseUrl || DEFAULT_API_URL).replace(/\/+$/, "");
        const aiKey = apiConfig.apiKey || "lm-studio";
        const aiModel = apiConfig.model || "qwen3-8b";
        const translateRes = await fetch(`${aiBaseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${aiKey}` },
          body: JSON.stringify({
            model: aiModel,
            messages: [
              { role: "system", content: "You are a professional translator. Translate the following text to Vietnamese. Preserve all meaning, structure and paragraphs. Return ONLY the translated text, no explanations." },
              { role: "user", content: transcript }
            ],
            temperature: 0.3,
            stream: false,
          }),
          signal: AbortSignal.timeout(120000),
        });
        if (translateRes.ok) {
          const td = await translateRes.json();
          const translated = td?.choices?.[0]?.message?.content?.trim();
          if (translated) {
            transcript = translated;
            lang = "vi";
            console.log("[Whisper] Translation done:", transcript.slice(0, 80));
          }
        }
      } catch (te) {
        console.warn("[Whisper] Translation failed, using raw transcript:", te.message);
      }
    }

    // Fetch video metadata in parallel
    const meta = await fetchVideoMeta(url);

    res.json({
      transcript,
      lang,
      segmentCount: segments ? segments.length : 0,
      transcriptSource,  // "subtitle" | "whisper"
      video: {
        title: meta?.title || "Không rõ tiêu đề",
        channel: meta?.channel || "",
        thumbnail: meta?.thumbnail || null,
        duration,
        url,
      },
    });
  } catch (err) {
    console.error("[Transcript error]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Default LM Studio backend endpoint if nothing provided by user
const DEFAULT_API_URL = "http://100.112.9.79:1234/v1";

// ---- Web Search Helpers (DuckDuckGo + Jina Reader) ----

/** Scrape DuckDuckGo HTML to get top result URLs */
async function searchDDG(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    signal: AbortSignal.timeout(6000),
  });
  const html = await resp.text();

  const urls = [];

  // DDG HTML uses redirect links: /l/?uddg=https%3A%2F%2F... — decode them
  const redirectRegex = /href="\/l\/\?[^"]*uddg=([^"&]+)/g;
  let match;
  while ((match = redirectRegex.exec(html)) !== null) {
    try {
      const decoded = decodeURIComponent(match[1]);
      if (
        decoded.startsWith("http") &&
        !decoded.includes("duckduckgo.com") &&
        !decoded.includes("duck.co") &&
        !decoded.includes("doubleclick") &&
        !urls.includes(decoded)
      ) {
        urls.push(decoded);
      }
    } catch { /* skip malformed URLs */ }
    if (urls.length >= 3) break;
  }

  console.log(`[DDG] Found ${urls.length} URLs for query: "${query.slice(0, 60)}"`);
  if (urls.length > 0) console.log("[DDG] Top URL:", urls[0].slice(0, 80));
  return urls;
}

/** Fetch a URL's clean Markdown content through Jina Reader */
async function fetchJina(url) {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const resp = await fetch(jinaUrl, {
    headers: { "Accept": "text/plain" },
    signal: AbortSignal.timeout(10000),
  });
  const text = await resp.text();
  // Limit per page to keep context manageable
  return text.slice(0, 3000);
}

/** Search DDG, fetch top 2 pages via Jina, return combined context */
async function webSearch(query) {
  try {
    const urls = await searchDDG(query);
    if (urls.length === 0) return null;

    const results = await Promise.allSettled(
      urls.slice(0, 2).map((u) => fetchJina(u).then((c) => ({ url: u, content: c })))
    );

    const sections = results
      .filter((r) => r.status === "fulfilled" && r.value.content.length > 100)
      .map((r) => `### Nguồn: ${r.value.url}\n\n${r.value.content}`);

    if (sections.length === 0) return null;
    return sections.join("\n\n---\n\n");
  } catch (err) {
    console.error("Web search error:", err.message);
    return null;
  }
}

// POST /api/summary — generate summary via LM Studio/OpenAI (SSE streaming)
app.post("/api/summary", async (req, res) => {
  const { transcript, targetLang = "vi", apiConfig = {} } = req.body;
  if (!transcript) return res.status(400).json({ error: "Missing transcript" });

  const rawBase = apiConfig.baseUrl ? apiConfig.baseUrl.replace(/\/+$/, "") : DEFAULT_API_URL;
  let aiBaseUrl = /^https?:\/\//i.test(rawBase) ? rawBase : `http://${rawBase}`;
  if (!aiBaseUrl.endsWith("/v1") && !aiBaseUrl.endsWith("/chat/completions")) {
    aiBaseUrl += "/v1";
  }
  const aiEndpoint = aiBaseUrl.endsWith("/chat/completions") ? aiBaseUrl : `${aiBaseUrl}/chat/completions`;
  const aiKey = apiConfig.apiKey || "lm-studio";
  let aiModel = apiConfig.model || "qwen2.5-7b-instruct";

  // Limit input context (reduced to 6000 to prevent Qwen 8K context overflow combined with max_tokens 3000)
  const maxChars = 6000;
  const trimmed = transcript.length > maxChars
    ? transcript.slice(0, maxChars) + "\n\n[...nội dung bị cắt bớt do quá dài]"
    : transcript;

  // Language instructions mapping
  const langNames = {
    vi: "tiếng Việt",
    en: "English",
    zh: "中文",
    ja: "日本語",
    fr: "Français"
  };
  const langLabel = langNames[targetLang] || "tiếng Việt";

  const systemPrompt = `Bạn là chuyên gia phân tích video chuyên sâu. Nhiệm vụ: đọc transcript và TRẢ VỀ DUY NHẤT một JSON hợp lệ, KHÔNG có text nào bên ngoài JSON, KHÔNG markdown.

Format cần trả về (giữ đúng tên key):
{"shortSummary":"...","keyPoints":["..."],"actionItems":["..."],"mindmap":"..."}

Yêu cầu chi tiết TỪNG PHẦN - phải viết DÀI:
- "shortSummary": Viết 1 đoạn văn 300 từ đầy đủ. Mô tả bối cảnh video, ai là người nói, video này về chủ đề gì, truyền tải thông điệp gì, đối tượng hướng đến là ai và họ nhận được giá trị gì từ video này.
- "keyPoints": Liệt kê 5-7 ý quan trọng. Mỗi ý PHẢI LÀ 100-240 từ giải thích cặn kẽ: đây là điểm gì, tại sao nó quan trọng... TUYỆT ĐỐI KHÔNG viết 1 câu ngắn gọn.
- "actionItems": Liệt kê 4-6 hành động. Mỗi hành động 80-150 từ: nên làm gì, làm như thế nào.
- "mindmap": Viết mã \`mermaid\` (loại mindmap) biểu diễn cấu trúc. QUAN TRỌNG: Mỗi nhãn node PHẢI CỰC NGẮN, tối đa 3-4 từ, KHÔNG dùng dấu hai chấm (:) trong nhãn. Xuống dòng dùng \`\\n\`. Ví dụ: "mindmap\\n  root((Chủ đề))\\n    Ý chính 1\\n      Chi tiết\\n    Ý chính 2".
- DỊCH THUẬT NGỮ CẢNH: Phải dịch trôi chảy theo văn phong ${langLabel}. Dùng ĐÚNG thuật ngữ chuyên ngành (ví dụ: "sao chép kỹ năng" thay vì "ăn trộm").
- VIẾT HOÀN TOÀN BẰNG: ${langLabel}
- KHÔNG lặp ý giữa các phần
- Chỉ trả về JSON duy nhất, bắt đầu '{' kết thúc '}'`;


  try {
    const startTime = Date.now();
    console.log(`[Summary] Calling LM Studio at: ${aiEndpoint} | model: ${aiModel}`);
    console.log(`[Summary] Calling LM Studio at: ${aiEndpoint} | model: ${aiModel}`);
    const reqBody = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Hãy tóm tắt transcript sau:\n\n${trimmed}` },
      ],
      temperature: 0.4,
      max_tokens: 24000,
      stream: false,
    };
    if (aiModel && aiModel !== "local-model") reqBody.model = aiModel;

    const response = await fetch(aiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aiKey}`
      },
      signal: AbortSignal.timeout(120_000), // 2 min max
      body: JSON.stringify(reqBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Summary] LM Studio HTTP ${response.status}:`, errText.slice(0, 300));
      return res.status(500).json({
        error: `LM Studio lỗi HTTP ${response.status}. Kiểm tra model đã load chưa.`,
      });
    }
    console.log(`[Summary] LM Studio response: HTTP ${response.status}, content-type: ${response.headers.get("content-type")}`);

    const data = await response.json();
    const message = data.choices?.[0]?.message || {};
    const contentText = (message.content || "").trim();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Summary] Complete in ${duration}s.`);

    // Check if the model answered inside resoning but empty outside
    let jsonStr = contentText;
    const reasoning = message.reasoning_content || message.reasoning || "";
    if (!jsonStr.includes("{") && reasoning.includes("{")) {
      jsonStr = reasoning;
    }

    jsonStr = sanitizeJsonCandidate(extractBalancedJsonObject(jsonStr) || jsonStr);

    let summary;
    try {
      summary = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[Summary] JSON parse failed:", parseErr.message);
      const fallbackSource = [contentText, reasoning].filter(Boolean).join("\n");
      summary = parseSummaryFallback(fallbackSource) || summaryFromRawText(fallbackSource);
      if (!summary) {
        summary = {
          shortSummary: "AI đã tạo nội dung nhưng không trả về đúng định dạng JSON. Vui lòng thử lại.",
          keyPoints: [],
          actionItems: [],
        };
      }
    }

    const result = {
      shortSummary: summary.shortSummary || "Không có tóm tắt.",
      keyPoints: Array.isArray(summary.keyPoints) ? summary.keyPoints : [],
      actionItems: Array.isArray(summary.actionItems) ? summary.actionItems : [],
      mindmap: summary.mindmap || "",
      generationTime: duration,
    };

    return res.json(result);

  } catch (err) {
    console.error("[Summary] Outer error:", err.message);
    console.error("[Summary] Cause:", err.cause?.code || err.cause?.message || err.cause || "(none)");
    let errMsg = "Không thể kết nối đến AI. Hãy kiểm tra LM Studio của bạn.";
    if (err.cause?.code === "ECONNREFUSED" || err.cause?.code === "ENOTFOUND") {
      errMsg = "Không thể tìm thấy LM Studio. Có vẻ như máy chủ chưa bật.";
    }
    return res.status(500).json({ error: errMsg });
  }
});

// POST /api/optimize — optimize and re-paragraph transcript
app.post("/api/optimize", async (req, res) => {
  const { transcript, targetLang = "vi", apiConfig = {} } = req.body;
  if (!transcript) return res.status(400).json({ error: "Missing transcript" });

  const rawBase2 = apiConfig.baseUrl ? apiConfig.baseUrl.replace(/\/+$/, "") : DEFAULT_API_URL;
  let aiBaseUrl = /^https?:\/\//i.test(rawBase2) ? rawBase2 : `http://${rawBase2}`;
  if (!aiBaseUrl.endsWith("/v1") && !aiBaseUrl.endsWith("/chat/completions")) {
    aiBaseUrl += "/v1";
  }
  const aiEndpoint = aiBaseUrl.endsWith("/chat/completions") ? aiBaseUrl : `${aiBaseUrl}/chat/completions`;
  const aiModel = apiConfig.model || "qwen2.5-7b-instruct";
  const aiKey = apiConfig.apiKey || "lm-studio";

  const langNames = {
    vi: "tiếng Việt",
    en: "English",
    zh: "中文",
    ja: "日本語",
    fr: "Français"
  };
  const langLabel = langNames[targetLang] || "tiếng Việt";

  const trimmed = transcript.length > 39000
    ? transcript.slice(0, 39000) + "\n\n[...nội dung bị cắt bớt do quá dài]"
    : transcript;

  const systemPrompt = `Bạn là một chuyên gia biên tập nội dung video. Nhiệm vụ: đọc transcript và tạo ra bản NGẮN GỌN, SÚC TÍCH hơn — giữ đủ ý, bỏ hết rác.

YÊU CẦU:
1. Viết hoàn toàn bằng ${langLabel}. Nếu gốc là ngôn ngữ khác thì dịch sang ${langLabel}.
2. Sửa lỗi chính tả, lỗi nhận diện giọng nói.
3. LOẠI BỎ: từ đệm (ừ, à, ờ...), câu lặp lại, lạc đề, nói vòng vòng, quảng cáo kênh.
4. GIỮ LẠI: toàn bộ ý chính, thông tin quan trọng, ví dụ cốt lõi. KHÔNG bịa thêm.
5. Kết quả phải NGẮN HƠN bản gốc ít nhất 30-40%.
6. Chia đoạn rõ ràng (3-5 câu/đoạn), không thêm tiêu đề.
7. Trả về Markdown thuần, đoạn cách nhau bằng dòng trống.

Xuất ra bản đã biên tập:`;

  try {
    const response = await fetch(aiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aiKey}`
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: trimmed },
        ],
        temperature: 0.1, // Thấp để giữ nguyên bản nhất có thể
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Optimize] LM Studio HTTP ${response.status}:`, errText.slice(0, 300));
      return res.status(502).json({ error: `LM Studio lỗi ${response.status}: ${errText.slice(0, 100)}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    res.json({ optimizedTranscript: content.trim() });
  } catch (err) {
    console.error("Optimize generation error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat — Chat realtime với video via LM Studio/OpenAI
app.post("/api/chat", async (req, res) => {
  const { transcript, messages, webSearch: enableWebSearch, apiConfig = {} } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing or invalid messages array" });
  }

  const rawBase3 = apiConfig.baseUrl ? apiConfig.baseUrl.replace(/\/+$/, "") : DEFAULT_API_URL;
  let aiBaseUrl = /^https?:\/\//i.test(rawBase3) ? rawBase3 : `http://${rawBase3}`;
  if (!aiBaseUrl.endsWith("/v1") && !aiBaseUrl.endsWith("/chat/completions")) {
    aiBaseUrl += "/v1";
  }
  const aiEndpoint = aiBaseUrl.endsWith("/chat/completions") ? aiBaseUrl : `${aiBaseUrl}/chat/completions`;
  const aiModel = apiConfig.model || "qwen2.5-7b-instruct";
  const aiKey = apiConfig.apiKey || "lm-studio";

  // Cắt transcript nếu quá dài
  const maxChars = 12000;
  const trimmed = transcript && transcript.length > maxChars
    ? transcript.slice(0, maxChars) + "\n\n[...nội dung phụ đề bị cắt bớt]"
    : (transcript || "Không có nội dung phụ đề.");

  // Optional: web search using the last user message as query
  let webContext = null;
  let webSearched = false;
  if (enableWebSearch) {
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMsg) {
      console.log(`[WebSearch] Searching for: "${lastUserMsg.content.slice(0, 80)}"`);
      webContext = await webSearch(lastUserMsg.content);
      webSearched = !!webContext;
      if (webSearched) {
        console.log(`[WebSearch] Got context (${webContext.length} chars)`);
      } else {
        console.log("[WebSearch] No results found, falling back to model knowledge.");
      }
    }
  }

  const webContextSection = webContext
    ? `\n\n--- KẾt QUẢ TÌM KIẾM WEB ---\n${webContext}\n--- HẾT KẾt QUẢ WEB ---`
    : "";

  const systemPrompt = `Bạn là một trợ lý AI thông minh, đóng vai trò là một người đồng hành cùng xem video với người dùng. 
Dưới đây là phụ đề của video mà người dùng đang xem:

--- PHỤ ĐỀ VIDEO ---
${trimmed}
--- KẾT THÚC PHỤ ĐỀ ---${webContextSection}

NHIỆM VỤ CỦA BẠN:
1. Trả lời các câu hỏi của người dùng dựa vào nội dung video.
2. Nếu có kết quả tìm kiếm web, ưu tiên tổng hợp từ đó để trả lời chính xác hơn.
3. QUAN TRỌNG: Nếu không tìm thấy trong video lẫn web, dùng kiến thức nội tại và báo "Theo tôi được biết thì...".
4. Trả lời bằng tiếng Việt, ngắn gọn, súc tích và thân thiện.
5. Trả lời dưới định dạng Markdown (được in đậm, xuống dòng, viết list) để dễ nhìn.`;

  try {
    const response = await fetch(aiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aiKey}`
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.7, // Nhiệt độ cao hơn chút để AI sáng tạo khi chém gió
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("LM Studio chat error:", response.status, errText);
      return res.status(502).json({
        error: "Không kết nối được AI Local. Hãy kiểm tra LM Studio.",
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    res.json({ reply: content, webSearched });
  } catch (err) {
    console.error("Chat generation error:", err.message);
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

// POST /api/playlist — fetch full playlist metadata using ytpl
app.post("/api/playlist", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing Playlist URL" });

  try {
    console.log(`[Playlist] Fetching playlist metadata for: ${url}`);

    // ytpl handles URL or list ID natively
    const playlist = await ytpl(url, { limit: Infinity });

    const title = playlist.title || "Unknown Playlist";
    let videos = [];

    if (playlist.items && Array.isArray(playlist.items)) {
      videos = playlist.items.map((v) => ({
        id: v.id,
        title: v.title,
        url: v.shortUrl || v.url || `https://youtu.be/${v.id}`,
        duration: v.durationSec || 0,
        uploader: v.author?.name || ""
      })).filter(v => v.id && v.title && v.title !== "[Deleted video]" && v.title !== "[Private video]");
    }

    console.log(`[Playlist] Found ${videos.length} videos inside "${title}".`);
    res.json({ title, videos });

  } catch (err) {
    console.error("[Playlist] error:", err.message);
    res.status(500).json({ error: "Không thể lấy playlist. Link có thể sai hoặc playlist đang ở trạng thái RIÊNG TƯ." });
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

// GET /api/lmstudio/status — check connection to LM Studio
app.get("/api/lmstudio/status", async (req, res) => {
  try {
    // Ping LM Studio models endpoint with a short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

    // Most OpenAI-compatible APIs support /v1/models GET
    const response = await fetch("http://localhost:1234/v1/models", {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      res.json({ ok: true });
    } else {
      res.json({ ok: false });
    }
  } catch (err) {
    // ECONNREFUSED or AbortError (timeout)
    res.json({ ok: false });
  }
});

// POST /api/synthesis/mega — Combine multiple summaries into one Mega-Syllabus
app.post("/api/synthesis/mega", async (req, res) => {
  const { collectionTitle, videos, targetLang = "vi", apiConfig = {} } = req.body;
  if (!videos || !videos.length) return res.status(400).json({ error: "Missing videos to synthesize." });

  const rawBase = apiConfig.baseUrl ? apiConfig.baseUrl.replace(/\/+$/, "") : DEFAULT_API_URL;
  let aiBaseUrl = /^https?:\/\//i.test(rawBase) ? rawBase : `http://${rawBase}`;
  if (!aiBaseUrl.endsWith("/v1") && !aiBaseUrl.endsWith("/chat/completions")) aiBaseUrl += "/v1";
  const aiEndpoint = aiBaseUrl.endsWith("/chat/completions") ? aiBaseUrl : `${aiBaseUrl}/chat/completions`;
  const aiModel = apiConfig.model || "qwen2.5-7b-instruct";
  const aiKey = apiConfig.apiKey || "lm-studio";

  const langNames = { vi: "tiếng Việt", en: "English", zh: "中文", ja: "日本語", fr: "Français" };
  const langLabel = langNames[targetLang] || "tiếng Việt";

  // Build the massive context
  let combinedContext = `[MÔN HỌC / TÀI LIỆU TỔNG HỢP: ${collectionTitle || "Không rõ"}]\n\n`;
  videos.forEach((v, index) => {
    combinedContext += `--- Bài ${index + 1}: ${v.title} ---\n`;
    combinedContext += `Tóm tắt: ${v.shortSummary || ""}\n`;
    if (v.keyPoints?.length) combinedContext += `Ý chính:\n- ${v.keyPoints.join("\n- ")}\n`;
    if (v.actionItems?.length) combinedContext += `Hành động:\n- ${v.actionItems.join("\n- ")}\n`;
    combinedContext += "\n";
  });

  const systemPrompt = `Bạn là một Giáo sư/Tác giả viết sách. Bạn được cung cấp các bản tóm tắt của danh sách tập video thuộc chuỗi "${collectionTitle}".
Nhiệm vụ của bạn là TỔNG HỢP VÀ LIÊN KẾT CHUỖI CÁC KIẾN THỨC NÀY THÀNH MỘT CUỐN E-BOOK / GIÁO TRÌNH HOÀN CHỈNH.

YÊU CẦU:
1. Trình bày dưới dạng CHUẨN MARKDOWN, không dùng JSON.
2. Cấu trúc E-Book phải có:
   - TIÊU ĐỀ CUỐN SÁCH: (Tạo 1 tiêu đề hấp dẫn và to tát)
   - Lời Nói Đầu: Cả chuỗi này nói về cái gì, giải quyết vấn đề gì?
   - CÁC CHƯƠNG: Trình bày, gom nhóm các ý chính lại theo mạch logic (Không nhất thiết phải chia thành từng video như cũ, hãy ráp các ý liên quan lại với nhau để mạch văn sâu sắc hơn).
   - Tính Ứng Dụng: Tóm gọn lại các action items quan trọng nhất xuyên suốt chuỗi.
   - Kết luận bài học.
3. NGÔN NGỮ: Viết 100% bằng ${langLabel}.
4. Viết càng chi tiết càng tốt, văn phong mạch lạc, sâu sắc, chia section chuyên nghiệp.`;

  try {
    const response = await fetch(aiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${aiKey}` },
      signal: AbortSignal.timeout(300_000), // 5 min max for huge generations
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: combinedContext },
        ],
        temperature: 0.5,
        stream: false, // We will just wait for it for ease of saving
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `AI lỗi HTTP ${response.status}: ${errText.slice(0, 100)}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    res.json({ megaSummary: content.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ STT Server running at http://localhost:${PORT}`);
});
