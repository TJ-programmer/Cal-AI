const { nanoid } = require('nanoid');

/**
 * Generate a unique chatId with retry logic.
 * @param {Model} ChatModel - The Mongoose Chat model
 * @param {Number} maxRetries - Maximum number of retries
 * @returns {Promise<string>} - Unique chatId
 */
async function generateUniqueChatId(ChatModel, maxRetries = 5) {
    let attempts = 0;

    while (attempts < maxRetries) {
        const chatId = `chat_${nanoid(4)}_${nanoid(10)}`;
        const exists = await ChatModel.exists({ chatId });

        if (!exists) return chatId;

        attempts++;
    }

    throw new Error('Failed to generate unique chatId after maximum retries');
}

module.exports = generateUniqueChatId;
