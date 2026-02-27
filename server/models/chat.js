
const mongoose = require('mongoose');
const {nanoid} =require("nanoid");
const messageSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    isBot: {
        type: Boolean,
        required: true,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true 
    },
    messageId: {
        type: String,
        default: function() {
            return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    }
});

const chatSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required:true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    title: {
        type: String,
        default: 'New Chat',
        trim: true
    },
    messages: [messageSchema],
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    roomId: {
        type: String,
        default: null 
    },
    messageType: {
        type: String,
        enum: ['ai', 'public', 'private'],
        default: 'ai'
    },
    targetUser: {
        type: String,
        ref: 'User',
        default: null 
    }

});

chatSchema.index({ userId: 1, isActive: 1, updatedAt: -1 });
chatSchema.index({ sessionId: 1, userId: 1, isActive: 1 });


chatSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

chatSchema.methods.addMessage = function(text, isBot = false) {
    const timestamp = new Date();
    const messageId = `msg_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.messages.push({
        text,
        isBot,
        timestamp: timestamp,
        messageId: messageId
    });
    
    this.updatedAt = timestamp;
    return this.save();
};

chatSchema.methods.getMessages = function() {
    return this.messages
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(msg => ({
            _id: msg._id,
            text: msg.text,
            isBot: msg.isBot,
            timestamp: msg.timestamp,
            messageId: msg.messageId
        }));
};

chatSchema.methods.getRecentMessages = function(limit = 50) {
    return this.messages
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit)
        .reverse()
        .map(msg => ({
            _id: msg._id,
            text: msg.text,
            isBot: msg.isBot,
            timestamp: msg.timestamp,
            messageId: msg.messageId
        }));
};

chatSchema.methods.getMessagesByDateRange = function(startDate, endDate) {
    return this.messages
        .filter(msg => {
            const msgDate = new Date(msg.timestamp);
            return msgDate >= new Date(startDate) && msgDate <= new Date(endDate);
        })
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(msg => ({
            _id: msg._id,
            text: msg.text,
            isBot: msg.isBot,
            timestamp: msg.timestamp,
            messageId: msg.messageId
        }));
};

chatSchema.statics.findBySessionId = function(sessionId, messageLimit = null) {
    const query = this.findOne({ sessionId, isActive: true });
    
    if (messageLimit) {
        
        return this.aggregate([
            { $match: { sessionId, isActive: true } },
            {
                $project: {
                    userId: 1,
                    sessionId: 1,
                    title: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    isActive: 1,
                    messages: { $slice: ['$messages', -messageLimit] }
                }
            }
        ]).then(results => results[0]);
    }
    
    return query;
};

chatSchema.statics.findByUserId = function(userId, sortBy = 'updatedAt', sortOrder = -1) {
    return this.find({ userId, isActive: true })
        .sort({ [sortBy]: sortOrder })
        .select('chatId sessionId title createdAt updatedAt messages');
};

chatSchema.methods.getStats = function() {
    const messages = this.messages;
    const userMessages = messages.filter(msg => !msg.isBot);
    const botMessages = messages.filter(msg => msg.isBot);
    
    return {
        totalMessages: messages.length,
        userMessages: userMessages.length,
        botMessages: botMessages.length,
        firstMessage: messages.length > 0 ? messages[0].timestamp : null,
        lastMessage: messages.length > 0 ? messages[messages.length - 1].timestamp : null,
        duration: messages.length > 1 ? 
            new Date(messages[messages.length - 1].timestamp) - new Date(messages[0].timestamp) : 0
    };
};

module.exports = mongoose.model('Chat', chatSchema);
