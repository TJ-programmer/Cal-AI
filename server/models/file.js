const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true
  },
  fileId: {
    type: String,
    required: true,
    unique: true
  },
  fileExtension: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  uploaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  chatId: {
    type: String, 
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  Rag:{
    type: String,
    default: "Not available"
  },

});

fileSchema.statics.findByChatId = function (
  chatId,
  sortBy = "createdAt",
  sortOrder = -1
) {
  return this.find({ chatId })
    .sort({ [sortBy]: sortOrder });
};

// Virtual property to get full filename
fileSchema.virtual('fullFilename').get(function() {
  return `${this.fileId}${this.fileExtension}`;
});

// Ensure virtuals are included in JSON
fileSchema.set('toJSON', { virtuals: true });
fileSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("File", fileSchema);