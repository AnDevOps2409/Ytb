const SERVER = "http://localhost:3001";

export const chatService = {
  /**
   * Send a message to the chat API
   * @param {string} transcript The context video transcript
   * @param {Array} messages Array of message objects {role: 'user' | 'assistant', content: string}
   * @returns {Promise<string>} The AI's reply content
   */
  async sendMessage(transcript, messages) {
    const res = await fetch(`${SERVER}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, messages }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Lỗi kết nối Server" }));
      throw new Error(err.error || "Không thể gọi API Chat");
    }

    const data = await res.json();
    return data.reply;
  },
};
