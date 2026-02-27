const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const fileId = req.body.fileId;

    if (!fileId) {
      return cb(new Error("fileId is required"), null);
    }

    const ext = path.extname(file.originalname);
    req.fileExtension = ext; // <-- Ensure fileExtension is set on req
    cb(null, `${fileId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = upload;
