// models/community.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: {
    type: String,
    default: 'Anonymous'
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const postSchema = new mongoose.Schema({
  author: {
    type: String,
    default: 'Anonymous',
    trim: true
  },
  content: {
    type: String,
    trim: true,
    maxlength: 5000
  },
  imageUrl: {
    type: String,
    trim: true
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: [commentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for sorting by creation date
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);