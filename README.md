# CodeAtlas — Codebase Intelligence

> Google Maps for your codebase. Paste a GitHub URL. Understand everything instantly.

![Status](https://img.shields.io/badge/Status-Live-brightgreen) ![React](https://img.shields.io/badge/React-18-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-Python-green) ![GPT-4o](https://img.shields.io/badge/OpenAI-GPT--4o--mini-orange)

🔗 Live Demo: https://codeatlas-ten.vercel.app/

## What It Does

CodeAtlas analyzes any public GitHub repository and gives you:

- **Visual file tree** — navigate the entire codebase structure
- **Architecture overview** — what this project does and how it's built
- **Tech stack detection** — auto-detects React, Next.js, Python, Docker, etc.
- **Entry point detection** — finds app.tsx, main.py, server.js automatically
- **Key files explained** — what each important file does
- **Dependency analysis** — what dependencies matter and why
- **Onboarding section** — "where do I start?" for new developers
- **Potential issues** — flags common problems in the codebase
- **AI Q&A chat** — ask anything: "where is auth handled?", "how does login work?"

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Python + FastAPI |
| AI | OpenAI GPT-4o-mini |
| Repo Parsing | GitHub API |
| Deploy | Vercel + Render |

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
export OPENAI_API_KEY=your_key
export GITHUB_TOKEN=your_github_token  # optional, increases rate limit
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
echo "VITE_BACKEND_URL=http://localhost:8000" > .env
npm run dev
```

## Built By
**Omer Yousif** — Software Engineering & AI Student
- GitHub: [@omerf9](https://github.com/omerf9)
