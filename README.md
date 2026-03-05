# Cal AI

AI-assisted calorie tracker with photo-based meal/workout analysis, verified logging, daily macro progress, and coach notes.

![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat-square&logo=react)
![Node](https://img.shields.io/badge/Backend-Node%20%2B%20Express-3C873A?style=flat-square&logo=node.js)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-13AA52?style=flat-square&logo=mongodb)
![Vision](https://img.shields.io/badge/Vision-YOLO%20%2F%20Gemini%20%2F%20OpenAI-ff7a00?style=flat-square)

## What it does

- User signup and login with JWT auth
- Upload meal/workout images for AI calorie estimation
- Review and edit AI output before saving
- Track daily net calories + macros (protein, carbs, fat, fiber)
- View 7-day progress bars
- Generate daily coach notes from verified logs

## Tech Stack

### Client (`client/`)
- React 19 + Vite
- React Router
- Axios with auth interceptor
- CSS Modules

### Server (`server/`)
- Node.js + Express
- MongoDB + Mongoose
- Joi validation
- JWT authentication middleware
- Vision providers:
  - YOLO (`server/ml/yolo_analyze.py`)
  - Gemini API
  - OpenAI Responses API
  - Local Ollama vision fallback
  - Mock fallback

## Project Structure

```text
Cal AI/
  client/                 # React app
    src/components/pages/ # Login/Signup/Home/Forgot/Reset pages
  server/                 # Express API
    routes/               # auth, users, vision, logs, reset/forgot helpers
    models/               # User, Log schemas
    middleware/           # auth guard
    ml/                   # YOLO analysis script + Python deps
    yolov8n.pt            # YOLO model weights
```

## Local Setup

### 1) Clone and install

```bash
git clone <your-repo-url>
cd "Cal AI"

cd server && npm install
cd ../client && npm install
```

### 2) Configure server environment

Create `server/.env`:

```env
PORT=5000
DB=mongodb://127.0.0.1:27017/cal-ai
SALT=10
SESSIONKEY=your_access_token_secret
REFRESH_SECRET=your_refresh_token_secret

# AI provider: auto | yolo | gemini | openai | local
AI_PROVIDER=auto

# Optional providers
OPENAI_API_KEY=
VISION_MODEL=gpt-4.1

GEMINI_API_KEY=

GROQ_API_KEY=

LOCAL_VISION_MODEL=llama3.2-vision
OLLAMA_URL=http://127.0.0.1:11434

# Password reset email (Gmail)
USER=your_email@gmail.com
PASS=your_app_password

# Optional Python path override
PYTHON_BIN=python
```

### 3) (Optional) Enable YOLO Python analyzer

```bash
cd server
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r ml/requirements.txt
```

> `server/yolov8n.pt` is already present in this repository.

### 4) Run both apps

Terminal 1:
```bash
cd server
npm start
```

Terminal 2:
```bash
cd client
npm start
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `GET /api/health`

## API Overview

### Auth & Users
- `POST /api/users` - register
- `POST /api/auth` - login

### Vision
- `POST /api/vision/analyze` (auth required)
  - body: `{ mode: "meal" | "workout", imageDataUrl: "data:image/..." }`
- `POST /api/vision/coach-notes` (auth required)
  - body: `{ logs: [...] }`

### Logs
- `GET /api/logs` (auth required)
- `POST /api/logs` (auth required)
- `DELETE /api/logs/:id` (auth required)

## Vision Provider Order

With `AI_PROVIDER=auto`, the server tries:
1. YOLO
2. Local vision (Ollama)
3. OpenAI (if key exists)
4. Mock fallback

## Known Gaps (Current Codebase)

- `refresh`, `forgot-password`, and `reset-password` route files exist but are not mounted in `server/server.js` right now.
- Client currently calls:
  - `POST /api/forgot-password`
  - `POST /api/resetpassword/:id/:token`
  These endpoint paths do not match mounted routes in current backend wiring.
- Auth middleware has verbose debug logging enabled.

## Scripts

### Client
- `npm start` - run Vite dev server
- `npm run build` - production build
- `npm run lint` - lint code
- `npm run preview` - preview build

### Server
- `npm start` - run API with nodemon

## Security Notes

- Replace all secrets in `.env` before deployment.
- Keep JWT secrets and DB URI out of version control.
- Use HTTPS + secure cookie strategy if enabling refresh-token flow.

---

Built for verified, AI-assisted nutrition tracking with human confirmation before logging.
