import { useState, useEffect } from "react";
import "./SettingsPanel.css";

const DEFAULT_MODELS = [
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" }
];

export default function SettingsPanel({ onSettingsChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [baseUrl, setBaseUrl] = useState(localStorage.getItem("ai_base_url") || "");
    const [apiKey, setApiKey] = useState(localStorage.getItem("ai_api_key") || "");
    const [model, setModel] = useState(localStorage.getItem("ai_model") || "");
    const [availableModels, setAvailableModels] = useState(DEFAULT_MODELS);
    const [isFetching, setIsFetching] = useState(false);
    const [fetchMsg, setFetchMsg] = useState("");

    // Notify parent on change
    useEffect(() => {
        onSettingsChange({ baseUrl, apiKey, model });
    }, [baseUrl, apiKey, model, onSettingsChange]);

    const handleSave = (key, value, setter) => {
        setter(value);
        localStorage.setItem(key, value);
    };

    const handleFetchModels = async () => {
        setIsFetching(true);
        setFetchMsg("");
        try {
            // Default to OpenAI standard if empty
            const targetUrl = baseUrl.trim() || "https://api.openai.com/v1";
            const u = new URL(targetUrl);
            const host = u.origin;

            // Attempt to hit /v1/models (compatible with OpenAI, OpenRouter, LM Studio)
            const resp = await fetch(`${host}/v1/models`, {
                headers: {
                    "Authorization": `Bearer ${apiKey.trim()}`,
                }
            });
            if (!resp.ok) throw new Error("Fetch failed");
            const data = await resp.json();

            if (data && Array.isArray(data.data)) {
                const models = data.data.map(m => ({ id: m.id, name: m.id }));
                setAvailableModels(models);
                setFetchMsg("Thành công!");
            } else {
                throw new Error("Invalid format");
            }
        } catch (err) {
            setFetchMsg("Lỗi lấy models");
            console.warn("Failed to fetch models:", err);
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <>
            <button
                type="button"
                className="settings-sidebar-btn"
                onClick={() => setIsOpen(true)}
                title="Cấu hình Model AI"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Cấu hình AI</span>
            </button>

            {isOpen && (
                <div className="settings-modal-overlay" onClick={() => setIsOpen(false)}>
                    <div className="settings-modal" onClick={e => e.stopPropagation()}>
                        <div className="settings-modal-header">
                            <h2>Cấu hình AI Server (BYOM)</h2>
                            <button className="settings-close-btn" onClick={() => setIsOpen(false)}>×</button>
                        </div>

                        <div className="settings-modal-body">
                            <div className="settings-field full-width">
                                <label>API Base URL</label>
                                <input
                                    type="url"
                                    placeholder="Để trống sẽ tự động lấy LM Studio (localhost:1234)"
                                    value={baseUrl}
                                    onChange={(e) => handleSave("ai_base_url", e.target.value, setBaseUrl)}
                                />
                            </div>

                            <div className="settings-field">
                                <label>API Key</label>
                                <div className="settings-input-group">
                                    <input
                                        type="password"
                                        placeholder="Để trống nếu dùng LM Studio"
                                        value={apiKey}
                                        onChange={(e) => handleSave("ai_api_key", e.target.value, setApiKey)}
                                    />
                                    <button
                                        type="button"
                                        className="fetch-btn"
                                        onClick={handleFetchModels}
                                        disabled={isFetching}
                                    >
                                        {isFetching ? "..." : "Fetch Models"}
                                    </button>
                                </div>
                                {fetchMsg && <span className={`fetch-msg ${fetchMsg.includes("Lỗi") ? "error" : "success"}`}>{fetchMsg}</span>}
                            </div>

                            <div className="settings-field">
                                <label>Chọn Model</label>
                                <select
                                    value={model}
                                    onChange={(e) => handleSave("ai_model", e.target.value, setModel)}
                                >
                                    <option value="">— Model Mặc định (Tự nhận) —</option>
                                    {availableModels.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="settings-modal-footer">
                            <button className="settings-save-btn" onClick={() => setIsOpen(false)}>Xong</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
