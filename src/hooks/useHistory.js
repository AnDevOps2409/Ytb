import { useState, useEffect } from "react";

const API = "http://localhost:3001/api/history";

export function useHistory() {
  const [history, setHistory] = useState([]);

  // Load on mount
  useEffect(() => {
    fetch(API)
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  const save = async (item) => {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: item.url,
          title: item.video?.title || "Không rõ",
          channel: item.video?.channel || "",
          duration: item.video?.duration || "",
          source: item.source,
          transcript: item.transcript,
          summary: item.summary || null,
        }),
      });
      const { id, createdAt } = await res.json();
      const entry = {
        id,
        createdAt,
        url: item.url,
        title: item.video?.title || "Không rõ",
        channel: item.video?.channel || "",
        duration: item.video?.duration || "",
        source: item.source,
        transcript: item.transcript,
        summary: item.summary || null,
      };
      setHistory((prev) => [entry, ...prev]);
      return id;
    } catch (err) {
      console.error("useHistory.save error:", err);
    }
  };

  const updateSummary = async (id, summary) => {
    try {
      await fetch(`${API}/${id}/summary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      setHistory((prev) =>
        prev.map((h) => (h.id === id ? { ...h, summary } : h))
      );
    } catch (err) {
      console.error("useHistory.updateSummary error:", err);
    }
  };

  const remove = async (id) => {
    try {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("useHistory.remove error:", err);
    }
  };

  const clear = async () => {
    try {
      await fetch(API, { method: "DELETE" });
      setHistory([]);
    } catch (err) {
      console.error("useHistory.clear error:", err);
    }
  };

  return { history, save, updateSummary, remove, clear };
}
