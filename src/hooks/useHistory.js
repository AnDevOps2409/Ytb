import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:3001/api/history";
const META_KEY = "ytb_history_meta"; // { [id]: { saved, collection } }
const COLL_KEY = "ytb_collections";  // string[]

function loadMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY) || "{}"); } catch { return {}; }
}
function saveMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}
function loadCollections() {
  try { return JSON.parse(localStorage.getItem(COLL_KEY) || "[]"); } catch { return []; }
}
function saveCollections(cols) {
  localStorage.setItem(COLL_KEY, JSON.stringify(cols));
}

export function useHistory() {
  const [history, setHistory] = useState([]);
  const [meta, setMetaState] = useState(loadMeta);
  const [collections, setCollectionsState] = useState(loadCollections);

  // Merge server history with local meta
  const mergeHistory = useCallback((raw) => {
    const m = loadMeta();
    return raw.map((item) => ({
      ...item,
      saved: m[item.id]?.saved || false,
      collection: m[item.id]?.collection || "Chung",
    }));
  }, []);

  // Load on mount
  useEffect(() => {
    fetch(API)
      .then((r) => r.json())
      .then((raw) => setHistory(mergeHistory(raw)))
      .catch(() => setHistory([]));
  }, [mergeHistory]);

  const updateMeta = (id, patch) => {
    const m = loadMeta();
    m[id] = { ...m[id], ...patch };
    saveMeta(m);
    setMetaState({ ...m });
    setHistory((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...patch } : h))
    );
  };

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
        id, createdAt,
        url: item.url,
        title: item.video?.title || "Không rõ",
        channel: item.video?.channel || "",
        duration: item.video?.duration || "",
        source: item.source,
        transcript: item.transcript,
        summary: item.summary || null,
        saved: false,
        collection: "Chung",
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
      // Clean up meta
      const m = loadMeta();
      delete m[id];
      saveMeta(m);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("useHistory.remove error:", err);
    }
  };

  // Clear only unsaved items
  const clear = async () => {
    try {
      const toDelete = history.filter((h) => !h.saved);
      await Promise.all(
        toDelete.map((h) => fetch(`${API}/${h.id}`, { method: "DELETE" }))
      );
      // Clean up meta for deleted items
      const m = loadMeta();
      toDelete.forEach((h) => delete m[h.id]);
      saveMeta(m);
      setHistory((prev) => prev.filter((h) => h.saved));
    } catch (err) {
      console.error("useHistory.clear error:", err);
    }
  };

  // Toggle saved status
  const toggleSave = (id) => {
    const item = history.find((h) => h.id === id);
    if (!item) return;
    updateMeta(id, { saved: !item.saved });
  };

  // Set collection for an item
  const setCollection = (id, collection) => {
    updateMeta(id, { collection });
    // Auto-add collection if new
    if (collection && collection !== "Chung" && !collections.includes(collection)) {
      const newCols = [...collections, collection];
      saveCollections(newCols);
      setCollectionsState(newCols);
    }
  };

  // Add a new collection
  const addCollection = (name) => {
    const trimmed = name.trim();
    if (!trimmed || collections.includes(trimmed)) return;
    const newCols = [...collections, trimmed];
    saveCollections(newCols);
    setCollectionsState(newCols);
  };

  // Remove a collection (items revert to "Chung")
  const removeCollection = (name) => {
    const newCols = collections.filter((c) => c !== name);
    saveCollections(newCols);
    setCollectionsState(newCols);
    // Revert items in that collection
    const m = loadMeta();
    Object.keys(m).forEach((id) => {
      if (m[id]?.collection === name) m[id].collection = "Chung";
    });
    saveMeta(m);
    setHistory((prev) =>
      prev.map((h) => (h.collection === name ? { ...h, collection: "Chung" } : h))
    );
  };

  return {
    history, save, updateSummary, remove, clear,
    toggleSave, setCollection, collections, addCollection, removeCollection,
  };
}
