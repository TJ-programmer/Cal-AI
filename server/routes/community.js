// routes/community.js
const express = require('express');
const router = express.Router();
const Post = require('../models/community');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create public/images directory if it doesn't exist
const uploadDir = 'public/images/community';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// GET all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ message: 'Error fetching posts', error: err.message });
  }
});

// GET single post by ID
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ message: 'Error fetching post', error: err.message });
  }
});

// POST create new post
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { content, author } = req.body;

    // Validate that either content or image is provided
    if (!content && !req.file) {
      return res.status(400).json({ message: 'Either content or image is required' });
    }

    const postData = {
      author: author || 'Anonymous',
      content: content || ''
    };

    // If image was uploaded, add the URL
    if (req.file) {
      postData.imageUrl = `/images/community/${req.file.filename}`;
    }

    const newPost = new Post(postData);
    const savedPost = await newPost.save();

    res.status(201).json(savedPost);
  } catch (err) {
    console.error('Error creating post:', err);
    // Delete uploaded file if post creation failed
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error creating post', error: err.message });
  }
});

// POST like a post
router.post('/:id/like', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.likes += 1;
    const updatedPost = await post.save();

    res.json(updatedPost);
  } catch (err) {
    console.error('Error liking post:', err);
    res.status(500).json({ message: 'Error liking post', error: err.message });
  }
});

// POST add comment to a post
router.post('/:id/comment', async (req, res) => {
  try {
    const { text, author } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const newComment = {
      author: author || 'Anonymous',
      text: text.trim(),
      createdAt: new Date()
    };

    post.comments.push(newComment);
    const updatedPost = await post.save();

    res.json(updatedPost);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ message: 'Error adding comment', error: err.message });
  }
});

// DELETE a post
router.delete('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Delete associated image file if exists
    if (post.imageUrl) {
      const imagePath = path.join(__dirname, '..', post.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ message: 'Error deleting post', error: err.message });
  }
});

// PUT update a post
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { content, author } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (content !== undefined) post.content = content;
    if (author !== undefined) post.author = author;

    // If new image uploaded, delete old one and update
    if (req.file) {
      if (post.imageUrl) {
        const oldImagePath = path.join(__dirname, '..', post.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      post.imageUrl = `/images/community/${req.file.filename}`;
    }

    post.updatedAt = new Date();
    const updatedPost = await post.save();

    res.json(updatedPost);
  } catch (err) {
    console.error('Error updating post:', err);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error updating post', error: err.message });
  }
});

module.exports = router;