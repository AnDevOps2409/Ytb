const SERVER = "http://localhost:3001";

export const chatService = {
  /**
   * Send a message to the chat API
   * @param {string} transcript The context video transcript
   * @param {Array} messages Array of message objects {role: 'user' | 'assistant', content: string}
   * @param {boolean} webSearch Whether to perform web search
   * @param {object} apiConfig The API settings
   * @returns {Promise<{reply: string, webSearched: boolean}>}
   */
  async sendMessage(transcript, messages, webSearch = false, apiConfig = {}) {
    const res = await fetch(`${SERVER}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, messages, webSearch, apiConfig }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Lỗi kết nối Server" }));
      throw new Error(err.error || "Không thể gọi API Chat");
    }

    const data = await res.json();
    return { reply: data.reply, webSearched: data.webSearched || false };
  },
};
