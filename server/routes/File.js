const express = require('express');
const router = express.Router();
const File = require("../models/file");
const upload = require("../middleware/upload");
const auth = require("../middleware/auth");
const Chat = require("../models/chat");

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const UPLOAD_DIR = path.join(__dirname, "../uploads");
const { retrieveFileContent } = require("../services/contextretrieve");

// Get all files for a chat
router.get("/:chatId/files", auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      chatId: chatId,
      userId: userId,
      isActive: true
    });

    if (!chat) {
      return res.status(403).json({ message: "Access denied" });
    }

    const files = await File.findByChatId(chatId);

    res.json(files);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching files",
      error: error.message
    });
  }
});

// Download/retrieve a specific file from local uploads directory
router.get("/download/:fileId", auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user._id;

    const file = await File.findOne({ fileId });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Verify user has access to this file's chat
    const chat = await Chat.findOne({
      chatId: file.chatId,
      userId,
      isActive: true,
    });

    if (!chat) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Construct file path with extension from database
    const filePath = path.join(UPLOAD_DIR, `${file.fileId}${file.fileExtension}`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);

    // Stream the file from local directory
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    res.status(500).json({
      message: "Error downloading file",
      error: error.message
    });
  }
});

// Upload file to local directory
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const { chatId, fileId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const chat = await Chat.findOne({
      chatId,
      userId: req.user._id,
    });


  if (!chat) {
    // Clean up uploaded file from local directory if chat not found
    const uploadedPath = path.join(UPLOAD_DIR, req.file.filename);
    if (fs.existsSync(uploadedPath)) {
      fs.unlinkSync(uploadedPath);
    }
    return res.status(403).json({ message: "Access denied" });
  }

  const filePath = path.join(UPLOAD_DIR, req.file.filename);

  try {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("file_path", filePath);
    // optional: form.append("document_id", documentId || "");

    const ingestResponse = await axios.post(
      "http://127.0.0.1:8001/ingest",
      form,
      {
        headers: form.getHeaders()  // ⚠️ important
      }
    );

    console.log("Ingest response:", ingestResponse.data);
  } catch (err) {
    if (err.response) {
      console.error("FastAPI error:", err.response.status, err.response.data);
    } else {
      console.error("Error sending to /ingest:", err.message);
    }
  }


    
    const newFile = new File({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploaderId: req.user._id,
      chatId,
      fileId,
      fileExtension: req.fileExtension, // From middleware
    });

    await newFile.save();

    res.status(201).json({
      success: true,
      file: newFile,
    });
  } catch (error) {
    // Clean up file from local directory on error
    if (req.file) {
      const uploadedPath = path.join(UPLOAD_DIR, req.file.filename);
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete file from both database and local directory
router.delete("/files/:fileId", auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user._id;

    const file = await File.findOne({ fileId });

    if (!file) {
      return res.status(404).json({ 
        success: false,
        message: "File not found" 
      });
    }

    const chat = await Chat.findOne({
      chatId: file.chatId,
      userId,
      isActive: true,
    });

    if (!chat) {
      return res.status(403).json({ 
        success: false,
        message: "Access denied" 
      });
    }

    // CRITICAL FIX: Construct proper file path WITH extension
    const filePath = path.join(UPLOAD_DIR, `${file.fileId}${file.fileExtension}`);

    // Delete physical file from local uploads directory
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file from disk: ${filePath}`);
    } else {
      console.warn(`File not found on disk: ${filePath}`);
    }

    // Delete database record
    await File.deleteOne({ _id: file._id });

    res.json({
      success: true,
      message: "File deleted successfully",
    });

  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/Getfilecontent", auth, async (req, res) => {
  try {
    const { chat_id, query, top_k } = req.query;
    console.log("[Getfilecontent] Received request:", req.query);

    if (!chat_id || !query) {
      return res.status(400).json({
        success: false,
        message: "Missing required query parameters: chat_id or query",
      });
    }

    const k = top_k ? Number(top_k) : 5;

    const data = await retrieveFileContent({
      chatId: chat_id,
      query,
      topK: k
    });

    res.json({
      success: true,
      data
    });

  } catch (err) {
    if (err.response) {
      console.error("[Getfilecontent] FastAPI error:", err.response.data);
      return res.status(err.response.status).json({
        success: false,
        error: err.response.data
      });
    }

    console.error("[Getfilecontent] Internal error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;