# 🗣️ JustTalks

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-latest-brightgreen)](https://www.mongodb.com/)

**JustTalks** is an intelligent **chatbot application for the judiciary ecosystem**. It integrates:

* **RAG with IPC code PDFs** 📚
* **Web search for latest content** 🌐
* **File upload for RAG** 📂
* **Community page for sharing thoughts** 💬
* **Law map to locate nearby police, lawyers, or law firms** 🗺️

Designed for **law students, legal professionals, and the general public**, JustTalks provides accurate, real-time legal assistance.

---

## ✨ Features

### 🤖 Intelligent Chatbot

* RAG-enabled: answers questions using **IPC PDFs**
* Web search: fetches latest legal content
* Context-aware responses in legal scenarios

### 📁 File Upload (RAG)

* Upload **PDF/DOCX files**
* Chatbot references uploaded documents for accurate answers

### 💬 Community Page

* Share ideas, experiences, and queries
* Like, comment, and engage with other users

### 🗺️ Law Map

* Find **nearby police stations, lawyers, or law firms**
* Interactive map with **contact & address details**

### ⚖️ Judiciary-focused

* Tailored legal guidance
* Access latest laws, regulations, and case laws

---

## 🛠️ Technologies Used

* **Frontend:** React.js, Tailwind CSS, React Router
* **Backend:** Node.js, Express.js
* **Database:** MongoDB
* **AI:** OpenAI GPT, RAG with PDFs, Web search
* **Maps & Location:** Google Maps API / Leaflet.js
* **File Handling:** Multer
* **Real-time:** Socket.io

---

## 🖼️ Screenshots / Demo

| Chat Interface                  | Community Page                            |
| ------------------------------- | ----------------------------------------- |
| ![Chat](./screenshots/chat.png) | ![Community](./screenshots/community.png) |

| Law Map                              |
| ------------------------------------ |
| ![Law Map](./screenshots/lawmap.png) |

---

## 🚀 Getting Started

### Prerequisites

* Node.js >= 18
* MongoDB
* Groq API Key


### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/justtalks.git
cd justtalks

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Variables

Create a `.env` file in `backend/`:

```env
PORT=5000
MONGO_URI=your_mongodb_uri

```

### Run Application

```bash
# Backend
cd backend
npm run dev

# Frontend
cd ../frontend
npm start
```

Visit [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📂 Folder Structure

```
justtalks/
│
├─ backend/             # Node.js backend
│   ├─ controllers/     # API logic
│   ├─ models/          # MongoDB models
│   ├─ routes/          # API routes
│   └─ server.js
│
├─ frontend/            # React frontend
│   ├─ components/
│   ├─ pages/
│   ├─ assets/
│   └─ App.jsx
│
├─ uploads/             # Uploaded RAG PDFs
└─ README.md
```

---

## 🌐 Features in Action

* **RAG Chat**: Upload PDF → Ask questions → Get accurate answers 📚
* **Web Search**: Get latest legal info online 🌐
* **Community**: Share thoughts and discuss 💬
* **Law Map**: Find lawyers or police stations 🗺️

---

## 🤝 Contribution

We welcome contributions!

1. Fork the repo
2. Create a branch: `git checkout -b feature/YourFeature`
3. Commit changes: `git commit -m "Add some feature"`
4. Push branch: `git push origin feature/YourFeature`
5. Open a Pull Request

---

✅ **JustTalks** – Intelligent legal guidance at your fingertips!

---

