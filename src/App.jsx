import { useState, useCallback, useEffect } from "react";
import URLInput from "./components/URLInput";
import ProcessingStatus from "./components/ProcessingStatus";
import VideoInfoCard from "./components/VideoInfoCard";
import TranscriptPanel from "./components/TranscriptPanel";
import SummaryPanel from "./components/SummaryPanel";
import EmptyState from "./components/EmptyState";
import ErrorState from "./components/ErrorState";
import HistoryPanel from "./components/HistoryPanel";
import HistoryDetailModal from "./components/HistoryDetailModal";
import ChatPanel from "./components/ChatPanel";
import PlaylistHub from "./components/PlaylistHub";
import MegaSynthesisModal from "./components/MegaSynthesisModal";
import { fetchTranscript, generateSummaryStream, optimizeTranscript, checkLMStudioConnection, fetchPlaylist, SERVER } from "./services/apiService";
import { TRANSCRIPT_LOADING_STEPS, SUMMARY_LOADING_STEPS } from "./data/mockData";
import { useTheme } from "./hooks/useTheme";
import { useHistory } from "./hooks/useHistory";
import "./App.css";

// A single "job" represents one video being processed
function createJob(url) {
  return {
    id: Date.now() + Math.random(),
    url,
    transcriptStatus: "idle",
    transcriptStep: 0,
    transcriptData: null,
    summaryStatus: "idle",
    summaryStep: 0,
    summaryData: null,
    summaryRaw: "",
    summaryReasoning: "",
    isOptimizing: false,
    error: "",
    historyId: null,
  };
}

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { history, save: saveHistory, updateSummary, remove: removeHistory, clear: clearHistory, toggleSave, setCollection, collections, addCollection, removeCollection } = useHistory();

  const [jobs, setJobs] = useState([]); // Multi-video: array of jobs
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyDetailId, setHistoryDetailId] = useState(null);
  // Always derived from fresh history state — never stale
  const historyDetail = historyDetailId ? (history.find(h => h.id === historyDetailId) || null) : null;
  const [megaJob, setMegaJob] = useState(null);

  const [aiStatus, setAiStatus] = useState("checking");

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        const isOnline = await checkLMStudioConnection();
        if (mounted) setAiStatus(isOnline ? "online" : "offline");
      } catch {
        if (mounted) setAiStatus("offline");
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);


  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatContext, setActiveChatContext] = useState("");

  // Helper: Open chat with specific transcript context
  const openChatWithContext = useCallback((transcript) => {
    setActiveChatContext(transcript);
    setIsChatOpen(true);
  }, []);

  // Helper: update a single job by id
  const updateJob = useCallback((id, patch) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  // 🚀 Start a streaming AI summarization task independently
  const startSummaryStream = useCallback(async (jobId, transcriptText, targetLang, histId) => {
    updateJob(jobId, { summaryStatus: "loading", error: "" });

    await generateSummaryStream(
      transcriptText,
      targetLang,
      {},
      // onChunk: accumulate raw streaming text and reasoning with throttle to prevent UI lag
      (() => {
        let localRaw = "";
        let localReasoning = "";
        let lastRenderTime = 0;
        const RENDER_THROTTLE = 100; // update UI at most every 100ms

        return (token, reasoning) => {
          localRaw += token;
          localReasoning += reasoning;

          const now = Date.now();
          if (now - lastRenderTime > RENDER_THROTTLE) {
            lastRenderTime = now;
            setJobs((prev) =>
              prev.map((j) =>
                j.id === jobId ? {
                  ...j,
                  summaryRaw: localRaw,
                  summaryReasoning: localReasoning
                } : j
              )
            );
          }
        };
      })(),
      // onDone: render full parsed summary
      (result) => {
        updateJob(jobId, { summaryStatus: "success", summaryData: result, summaryRaw: "", summaryReasoning: "" });
        if (histId) updateSummary(histId, result);
      },
      // onError
      (errMsg) => {
        updateJob(jobId, {
          summaryStatus: "error",
          error: errMsg,
        });
      }
    );
  }, [updateJob, updateSummary]);

  // Handle Mega-Synthesis for Collections
  const handleMegaSynthesize = useCallback(async (collectionName, items) => {
    const validItems = items.filter(i => i.summary || i.transcript);
    if (!validItems.length) return alert("Không có dữ liệu văn bản để tổng hợp.");

    setMegaJob({ status: "loading", collectionName, itemsCount: validItems.length });

    try {
      const res = await fetch(`${SERVER}/api/synthesis/mega`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionTitle: collectionName,
          videos: validItems.map(v => ({
            title: v.title,
            shortSummary: v.summary?.shortSummary || "",
            keyPoints: v.summary?.keyPoints || [],
            actionItems: v.summary?.actionItems || []
          }))
        })
      });
      if (!res.ok) throw new Error("Server xử lý thất bại (quá tải hoặc cấu hình sai).");
      const data = await res.json();
      setMegaJob({ status: "success", collectionName, itemsCount: validItems.length, megaSummary: data.megaSummary });
    } catch (err) {
      setMegaJob({ status: "error", error: err.message, collectionName, itemsCount: validItems.length });
    }
  }, []);

  // Start processing a new video
  const handleFetchTranscript = useCallback(async (dataObj) => {
    // URLInput returns either string or object
    const url = typeof dataObj === "string" ? dataObj : dataObj.url;
    const targetLang = dataObj.targetLang || "vi";

    if (url.includes("list=") || url.includes("/playlist?")) {
      setIsFetchingPlaylist(true);
      try {
        const playlistData = await fetchPlaylist(url);
        if (!collections.includes(playlistData.title)) {
          addCollection(playlistData.title);
        }
        setActivePlaylist(playlistData);
      } catch (err) {
        alert(err.message || "Lỗi tải playlist");
      } finally {
        setIsFetchingPlaylist(false);
      }
      return;
    }

    const job = createJob(url);
    job.targetLang = targetLang; // save targetLang to job for summarizing
    setJobs((prev) => [job, ...prev]);

    updateJob(job.id, { transcriptStatus: "loading", transcriptStep: 0 });

    try {
      const result = await fetchTranscript(url, {}, (step) =>
        updateJob(job.id, { transcriptStep: step })
      );
      const historyId = await saveHistory({
        url,
        video: result.video,
        transcript: result.transcript,
        source: result.source,
      });
      updateJob(job.id, {
        transcriptStatus: "success",
        transcriptData: result,
        historyId,
      });

      // Vừa tải transcript xong thì tự động load summary luôn
      startSummaryStream(job.id, result.transcript, targetLang, historyId);
    } catch (err) {
      updateJob(job.id, {
        transcriptStatus: "error",
        error: err.message || "Lỗi không xác định.",
      });
    }
  }, [updateJob, saveHistory, collections, addCollection, startSummaryStream]);

  // Start processing ONE video from Playlist Hub
  const handleProcessVideoFromPlaylist = useCallback((video, playlistTitle) => {
    const savedLang = localStorage.getItem("ai_summary_lang") || "vi";

    const job = createJob(video.url);
    job.targetLang = savedLang;
    setJobs((prev) => [job, ...prev]);
    updateJob(job.id, { transcriptStatus: "loading", transcriptStep: 0 });

    (async () => {
      try {
        const result = await fetchTranscript(video.url, {}, (step) =>
          updateJob(job.id, { transcriptStep: step })
        );
        const historyId = await saveHistory({
          url: video.url,
          video: result.video,
          transcript: result.transcript,
          source: result.source,
        });

        if (playlistTitle) {
          setCollection(historyId, playlistTitle);
        }

        updateJob(job.id, {
          transcriptStatus: "success",
          transcriptData: result,
          historyId,
        });

        // 🚀 Auto-trigger summary ngay sau khi tải transcript thành công
        startSummaryStream(job.id, result.transcript, savedLang, historyId);
      } catch (err) {
        updateJob(job.id, {
          transcriptStatus: "error",
          error: err.message || "Lỗi không xác định.",
        });
      }
    })();
  }, [updateJob, saveHistory, setCollection, startSummaryStream]);


  // Generate summary button handler (for backward compatibility / explicit re-runs)
  const handleGenerateSummary = useCallback(async (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job?.transcriptData?.transcript) return;
    startSummaryStream(jobId, job.transcriptData.transcript, job.targetLang || "vi", job.historyId);
  }, [jobs, startSummaryStream]);

  // Optimize a transcript
  const handleOptimizeTranscript = useCallback(async (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job?.transcriptData?.transcript) return;
    updateJob(jobId, { isOptimizing: true });

    try {
      const optimized = await optimizeTranscript(
        job.transcriptData.transcript,
        job.targetLang || "vi",
        {}
      );
      updateJob(jobId, {
        transcriptData: { ...job.transcriptData, transcript: optimized },
        isOptimizing: false
      });
      if (job.historyId) {
        saveHistory({
          ...job.transcriptData,
          url: job.url,
          transcript: optimized,
        });
      }
    } catch (err) {
      updateJob(jobId, { isOptimizing: false });
      alert(err.message || "Lỗi tối ưu văn bản.");
    }
  }, [jobs, updateJob, saveHistory]);

  // Generate summary for a history item (from the modal)
  const handleGenerateSummaryFromHistory = useCallback(async (historyItem) => {
    const result = await generateSummary(historyItem.transcript, () => { });
    await updateSummary(historyItem.id, result);
    // historyDetail auto-refreshes because it is derived from the history array
  }, [updateSummary]);

  // Retry a failed job
  const handleRetry = useCallback((jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    if (job.transcriptStatus === "error") {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } else if (job.summaryStatus === "error") {
      updateJob(jobId, { summaryStatus: "idle", summaryData: null, error: "" });
    }
  }, [jobs, updateJob]);

  // Dismiss a finished job card
  const handleDismissJob = useCallback((jobId) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

  const isAnyProcessing = jobs.some(
    (j) => j.transcriptStatus === "loading" || j.summaryStatus === "loading" || j.summaryStatus === "streaming"
  );

  return (
    <div className="app">
      {/* --- SIDEBAR --- */}
      <aside className="app__sidebar">
        <div className="sidebar__brand" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-default)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#FF0000" />
            <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#fff" />
          </svg>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '14px', margin: 0, fontWeight: 700, letterSpacing: '0.5px' }}>SUPER APP</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: aiStatus === 'online' ? 'var(--success)' : aiStatus === 'checking' ? 'var(--warning)' : 'var(--error)' }}></div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{aiStatus === 'online' ? 'AI Sẵn sàng' : aiStatus === 'checking' ? 'Đang test...' : 'Mất kết nối'}</span>
            </div>
          </div>
          <button className="theme-sidebar-btn" onClick={toggleTheme} title={theme === "dark" ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}>
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="4.22" x2="19.78" y2="5.64" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            )}
          </button>
        </div>

        <div className="sidebar__history" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <HistoryPanel
            history={history}
            onView={(item) => setHistoryDetailId(item.id)}
            onDelete={removeHistory}
            onClear={clearHistory}
            isSidebar={true}
            onToggleSave={toggleSave}
            onSetCollection={setCollection}
            collections={collections}
            onAddCollection={addCollection}
            onRemoveCollection={removeCollection}
            onMegaSynthesize={handleMegaSynthesize}
          />
        </div>


      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="app__main">
        <div className="app__container">
          {/* URL Input */}
          <URLInput
            onSubmit={handleFetchTranscript}
            disabled={jobs.some((j) => j.transcriptStatus === "loading") || isFetchingPlaylist}
            isHero={jobs.length === 0 && !activePlaylist}
          />

          {isFetchingPlaylist && (
            <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
              <ProcessingStatus currentStep={0} steps={["Đang tải Playlist từ YouTube..."]} />
            </div>
          )}

          <div className="app__jobs">
            {jobs.map((job) => (
              <div key={job.id} className="app__job-card">
                {/* Job header: URL + dismiss */}
                <div className="app__job-header">
                  <span className="app__job-url" title={job.url}>{job.url}</span>

                  <button
                    className="app__job-dismiss"
                    onClick={() => handleDismissJob(job.id)}
                    title="Ẩn kết quả này"
                  >
                    ×
                  </button>
                </div>

                {/* Transcript loading */}
                {job.transcriptStatus === "loading" && (
                  <ProcessingStatus steps={TRANSCRIPT_LOADING_STEPS} currentStep={job.transcriptStep} />
                )}

                {/* Error */}
                {(job.transcriptStatus === "error" || job.summaryStatus === "error") && (
                  <ErrorState message={job.error} onRetry={() => handleRetry(job.id)} />
                )}

                {/* Transcript success */}
                {job.transcriptStatus === "success" && job.transcriptData && (
                  <>
                    <VideoInfoCard
                      video={job.transcriptData.video}
                      source={job.transcriptData.source}
                      transcriptSource={job.transcriptData.transcriptSource}
                    />
                    <TranscriptPanel
                      transcript={job.transcriptData.transcript}
                      onGenerateSummary={() => handleGenerateSummary(job.id)}
                      onOptimizeTranscript={() => handleOptimizeTranscript(job.id)}
                      isOptimizing={job.isOptimizing}
                      summaryStatus={job.summaryStatus}
                      summaryDisabled={
                        job.summaryStatus === "loading" || job.summaryStatus === "success"
                      }
                    />

                    {/* Summary loading view */}
                    {job.summaryStatus === "loading" && (
                      <SummaryPanel isLoading={true} summary={null} />
                    )}

                    {/* Summary success */}
                    {job.summaryStatus === "success" && job.summaryData && (
                      <SummaryPanel summary={job.summaryData} />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Playlist Hub */}
          {activePlaylist && (
            <PlaylistHub
              playlist={activePlaylist}
              onProcessVideo={handleProcessVideoFromPlaylist}
              onClose={() => setActivePlaylist(null)}
            />
          )}

          {/* Jobs */}
          {jobs.length === 0 && !activePlaylist && !isFetchingPlaylist && (
            <EmptyState />
          )}


        </div>
      </main>

      {/* History detail modal */}
      {historyDetail && (
        <HistoryDetailModal
          item={historyDetail}
          activeJob={jobs.find(j => j.historyId === historyDetail.id)}
          onClose={() => setHistoryDetailId(null)}
          onGenerateSummary={handleGenerateSummaryFromHistory}
        />
      )}

      {/* Floating Chat Button (Only show if there's a valid transcript context nearby) */}
      {jobs.some(j => j.transcriptStatus === "success") || historyDetail ? (
        <button
          className="app__floating-chat-btn"
          onClick={() => {
            if (historyDetail) {
              openChatWithContext(historyDetail.transcript);
            } else {
              const latestSuccess = jobs.find(j => j.transcriptStatus === "success");
              if (latestSuccess) openChatWithContext(latestSuccess.transcriptData.transcript);
            }
          }}
        >
          💬 Chat với AI
        </button>
      ) : null}

      {/* Mega Synthesis Modal */}
      <MegaSynthesisModal megaJob={megaJob} onClose={() => setMegaJob(null)} />

      {/* Chat Drawer Panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        transcript={activeChatContext}
      />
    </div>
  );
}
