const axios = require("axios");

async function retrieveFileContent({ chatId, query, topK = 5 }) {
  if (!chatId || !query) {
    throw new Error("chatId and query are required");
  }

  console.log("[FileContentService] Calling FastAPI /retrieve", {
    chatId,
    query,
    topK
  });

  const response = await axios.get("http://127.0.0.1:8001/retrieve", {
    params: {
      chat_id: chatId,
      query,
      top_k: topK
    }
  });

  console.log("[FileContentService] FastAPI response received");

  return response.data; // 👈 raw FastAPI payload
}

module.exports = {
  retrieveFileContent
};
