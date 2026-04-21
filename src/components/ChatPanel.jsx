import { useState, useRef, useEffect } from "react";
import { chatService } from "../services/chatService";
import "./ChatPanel.css";

export default function ChatPanel({ isOpen, onClose, transcript }) {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  async function handleSend(e) {
    e.preventDefault();
    if (!inputVal.trim() || isLoading) return;

    const userMessage = { role: "user", content: inputVal.trim() };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInputVal("");
    setIsLoading(true);

    try {
      // Send raw array of {role, content} to server
      const replyContent = await chatService.sendMessage(transcript, newMessages);
      const aiMessage = { role: "assistant", content: replyContent };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = { role: "assistant", content: `❌ Lỗi: ${err.message}` };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  return (
    <div className={`chat-drawer ${isOpen ? "open" : ""}`}>
      <div className="chat-header">
        <h3>💬 Chat với Video</h3>
        <button onClick={onClose} className="chat-close-btn" aria-label="Close Chat">
          ✕
        </button>
      </div>

      <div className="chat-body">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>Hãy hỏi tôi bất cứ điều gì về nội dung video hoặc kiến thức liên quan!</p>
            <div className="chat-suggestions">
              <button onClick={() => setInputVal("Video này nói về ai?")}>Video này nói về ai?</button>
              <button onClick={() => setInputVal("Giải thích chi tiết hơn về tựa game này?")}>Giải thích game?</button>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.role}`}>
              <div className="chat-bubble">{msg.content}</div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="chat-message assistant">
            <div className="chat-bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <form className="chat-footer" onSubmit={handleSend}>
        <textarea
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập câu hỏi (Shift+Enter để xuống dòng)..."
          rows={2}
          autoFocus
        />
        <button type="submit" disabled={!inputVal.trim() || isLoading}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  );
}
