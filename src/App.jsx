import { useState, useCallback } from "react";
import Navbar from "./components/Navbar";
import URLInput from "./components/URLInput";
import ProcessingStatus from "./components/ProcessingStatus";
import VideoInfoCard from "./components/VideoInfoCard";
import TranscriptPanel from "./components/TranscriptPanel";
import SummaryPanel from "./components/SummaryPanel";
import EmptyState from "./components/EmptyState";
import ErrorState from "./components/ErrorState";
import HistoryPanel from "./components/HistoryPanel";
import HistoryDetailModal from "./components/HistoryDetailModal";
import { fetchTranscript, generateSummary, getMockData } from "./services/apiService";
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
    error: "",
    historyId: null,
  };
}

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { history, save: saveHistory, updateSummary, remove: removeHistory, clear: clearHistory } = useHistory();

  const [jobs, setJobs] = useState([]); // Multi-video: array of jobs
  const [showHistory, setShowHistory] = useState(false);
  const [historyDetail, setHistoryDetail] = useState(null);

  // Helper: update a single job by id
  const updateJob = useCallback((id, patch) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  // Start processing a new video
  const handleFetchTranscript = useCallback(async (url) => {
    const job = createJob(url);
    setJobs((prev) => [job, ...prev]);

    updateJob(job.id, { transcriptStatus: "loading", transcriptStep: 0 });

    try {
      const result = await fetchTranscript(url, (step) =>
        updateJob(job.id, { transcriptStep: step })
      );
      const historyId = saveHistory({
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
    } catch (err) {
      updateJob(job.id, {
        transcriptStatus: "error",
        error: err.message || "Lỗi không xác định.",
      });
    }
  }, [updateJob, saveHistory]);

  // Load mock data as a new job (no loading delay)
  const handleUseMockData = useCallback(() => {
    const mock = getMockData();
    const job = createJob(mock.video.url);
    const historyId = saveHistory({
      url: mock.video.url,
      video: mock.video,
      transcript: mock.transcript,
      source: mock.source,
    });
    setJobs((prev) => [
      {
        ...job,
        transcriptStatus: "success",
        transcriptData: { video: mock.video, transcript: mock.transcript, source: mock.source },
        historyId,
      },
      ...prev,
    ]);
  }, [saveHistory]);

  // Generate summary for a specific job
  const handleGenerateSummary = useCallback(async (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job?.transcriptData?.transcript) return;
    updateJob(jobId, { summaryStatus: "loading", summaryStep: 0 });

    try {
      const result = await generateSummary(job.transcriptData.transcript, (step) =>
        updateJob(jobId, { summaryStep: step })
      );
      updateJob(jobId, { summaryStatus: "success", summaryData: result });
      if (job.historyId) updateSummary(job.historyId, result);
    } catch (err) {
      updateJob(jobId, { summaryStatus: "error", error: err.message || "Lỗi tóm tắt." });
    }
  }, [jobs, updateJob, updateSummary]);

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
    (j) => j.transcriptStatus === "loading" || j.summaryStatus === "loading"
  );

  return (
    <div className="app">
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        historyCount={history.length}
        onShowHistory={() => setShowHistory((v) => !v)}
      />

      <div className="app__container">
        {/* URL Input */}
        <URLInput
          onSubmit={handleFetchTranscript}
          onUseMockData={handleUseMockData}
          disabled={false} // allow parallel processing
        />

        {/* History Panel */}
        {showHistory && (
          <div className="app__history">
            <HistoryPanel
              history={history}
              onView={(item) => setHistoryDetail(item)}
              onDelete={removeHistory}
              onClear={clearHistory}
              onClose={() => setShowHistory(false)}
            />
          </div>
        )}

        {/* Jobs */}
        {jobs.length === 0 && !showHistory && (
          <EmptyState />
        )}

        <div className="app__jobs">
          {jobs.map((job) => (
            <div key={job.id} className="app__job-card">
              {/* Job header: URL + dismiss */}
              <div className="app__job-header">
                <span className="app__job-url" title={job.url}>{job.url}</span>
                <div className="app__job-status-row">
                  {job.transcriptStatus === "loading" && (
                    <span className="app__job-chip app__job-chip--loading">Đang lấy transcript...</span>
                  )}
                  {job.summaryStatus === "loading" && (
                    <span className="app__job-chip app__job-chip--loading">Đang tạo tóm tắt...</span>
                  )}
                  {job.transcriptStatus === "success" && job.summaryStatus === "success" && (
                    <span className="app__job-chip app__job-chip--done">Hoàn thành</span>
                  )}
                </div>
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
                  />
                  <TranscriptPanel
                    transcript={job.transcriptData.transcript}
                    onGenerateSummary={() => handleGenerateSummary(job.id)}
                    summaryDisabled={
                      job.summaryStatus === "loading" || job.summaryStatus === "success"
                    }
                  />

                  {/* Summary loading */}
                  {job.summaryStatus === "loading" && (
                    <ProcessingStatus steps={SUMMARY_LOADING_STEPS} currentStep={job.summaryStep} />
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
      </div>

      <footer className="app__footer">
        <p>YouTube Transcript & Summary — MVP Demo</p>
      </footer>

      {/* History detail modal */}
      {historyDetail && (
        <HistoryDetailModal
          item={historyDetail}
          onClose={() => setHistoryDetail(null)}
        />
      )}
    </div>
  );
}
