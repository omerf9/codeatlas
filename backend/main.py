from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import httpx
from openai import OpenAI

app = FastAPI(title="CodeAtlas API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# ── Helpers ───────────────────────────────────────────────────────────────────

def github_headers():
    h = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"token {GITHUB_TOKEN}"
    return h

def parse_github_url(url: str):
    url = url.strip().rstrip("/")
    if "github.com" not in url:
        raise ValueError("Not a valid GitHub URL")
    parts = url.split("github.com/")[-1].split("/")
    if len(parts) < 2:
        raise ValueError("Could not parse owner/repo from URL")
    return parts[0], parts[1].replace(".git", "")

async def fetch_tree(owner: str, repo: str):
    async with httpx.AsyncClient() as c:
        r = await c.get(f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1", headers=github_headers(), timeout=20)
        if r.status_code == 404:
            raise HTTPException(404, "Repository not found or is private")
        if r.status_code == 403:
            raise HTTPException(403, "GitHub rate limit hit. Try again in a minute.")
        r.raise_for_status()
        return r.json()

async def fetch_repo_info(owner: str, repo: str):
    async with httpx.AsyncClient() as c:
        r = await c.get(f"https://api.github.com/repos/{owner}/{repo}", headers=github_headers(), timeout=10)
        r.raise_for_status()
        return r.json()

async def fetch_file_content(owner: str, repo: str, path: str):
    async with httpx.AsyncClient() as c:
        r = await c.get(f"https://api.github.com/repos/{owner}/{repo}/contents/{path}", headers=github_headers(), timeout=10)
        if r.status_code != 200:
            return None
        data = r.json()
        if data.get("encoding") == "base64":
            import base64
            return base64.b64decode(data["content"]).decode("utf-8", errors="ignore")
        return None

def detect_tech_stack(files: list):
    stack = []
    file_names = [f["path"].lower() for f in files]
    all_paths = " ".join(file_names)

    checks = [
        (["package.json"], "Node.js"),
        (["next.config.js", "next.config.ts"], "Next.js"),
        (["vite.config.js", "vite.config.ts"], "Vite"),
        (["tailwind.config.js", "tailwind.config.ts"], "Tailwind CSS"),
        (["tsconfig.json"], "TypeScript"),
        (["requirements.txt", "setup.py", "pyproject.toml"], "Python"),
        (["manage.py"], "Django"),
        (["app.py", "wsgi.py"], "Flask/FastAPI"),
        (["dockerfile", "docker-compose.yml", "docker-compose.yaml"], "Docker"),
        (["prisma/schema.prisma"], "Prisma"),
        (["supabase"], "Supabase"),
        ([".env.example", ".env.local"], "Environment Config"),
        (["jest.config.js", "vitest.config.js"], "Testing"),
        (["vercel.json"], "Vercel"),
    ]

    for patterns, name in checks:
        if any(p in all_paths for p in patterns):
            stack.append(name)

    # Check for React
    if any(".tsx" in f or ".jsx" in f for f in file_names):
        stack.append("React")

    # Check for Vue
    if any(".vue" in f for f in file_names):
        stack.append("Vue.js")

    return list(dict.fromkeys(stack))  # dedupe

def detect_entry_points(files: list):
    entry_patterns = [
        "src/main.tsx", "src/main.ts", "src/main.jsx", "src/main.js",
        "src/index.tsx", "src/index.ts", "src/index.jsx", "src/index.js",
        "src/App.tsx", "src/App.jsx",
        "app/page.tsx", "app/layout.tsx", "pages/index.tsx", "pages/index.js",
        "main.py", "app.py", "server.py", "index.js", "server.js",
        "manage.py", "wsgi.py", "asgi.py",
    ]
    file_paths = [f["path"] for f in files]
    return [p for p in entry_patterns if p in file_paths]

def build_tree(files: list):
    """Build nested tree structure from flat file list."""
    tree = {}
    for f in files:
        if f["type"] != "blob":
            continue
        parts = f["path"].split("/")
        node = tree
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = f["path"]
    return tree

def get_important_files(files: list, entry_points: list):
    """Pick the most important files to read for analysis."""
    priority = [
        "README.md", "package.json", "requirements.txt", "pyproject.toml",
        "docker-compose.yml", "Dockerfile", ".env.example",
        "prisma/schema.prisma", "src/App.tsx", "src/App.jsx",
        "src/main.tsx", "src/main.py", "app.py", "server.js", "index.js",
        "src/router.tsx", "src/routes.tsx", "src/store.ts",
    ]
    file_paths = [f["path"] for f in files]
    important = []

    # Add entry points first
    for ep in entry_points:
        if ep in file_paths and ep not in important:
            important.append(ep)

    # Add priority files
    for p in priority:
        if p in file_paths and p not in important:
            important.append(p)

    return important[:8]  # max 8 files to avoid token overload

async def read_key_files(owner: str, repo: str, important_files: list):
    contents = {}
    for path in important_files[:6]:
        content = await fetch_file_content(owner, repo, path)
        if content:
            contents[path] = content[:3000]  # truncate large files
    return contents

def call_ai(prompt: str, system: str, max_tokens: int = 2000):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "CodeAtlas API running"}

class AnalyzeRequest(BaseModel):
    url: str

@app.post("/analyze")
async def analyze_repo(req: AnalyzeRequest):
    try:
        owner, repo = parse_github_url(req.url)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Fetch repo info + tree
    try:
        repo_info, tree_data = await fetch_repo_info(owner, repo), None
        tree_data = await fetch_tree(owner, repo)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch repository: {str(e)}")

    files = [f for f in tree_data.get("tree", []) if f["type"] == "blob"]

    # Filter out noise
    ignore = [".git", "node_modules", ".next", "dist", "build", "__pycache__", ".venv", "venv"]
    files = [f for f in files if not any(ig in f["path"] for ig in ignore)]

    tech_stack = detect_tech_stack(files)
    entry_points = detect_entry_points(files)
    important_files = get_important_files(files, entry_points)
    file_contents = await read_key_files(owner, repo, important_files)

    # Build file tree (top level only for performance)
    tree = build_tree(files[:200])

    # File structure summary for AI
    file_list = [f["path"] for f in files[:150]]
    file_summary = "\n".join(file_list)
    contents_summary = "\n\n".join([f"=== {path} ===\n{content}" for path, content in file_contents.items()])

    # AI analysis
    analysis_prompt = f"""Repository: {owner}/{repo}
Description: {repo_info.get('description', 'No description')}
Language: {repo_info.get('language', 'Unknown')}
Stars: {repo_info.get('stargazers_count', 0)}
Tech Stack Detected: {', '.join(tech_stack)}
Entry Points: {', '.join(entry_points) if entry_points else 'Not detected'}

File Structure (first 150 files):
{file_summary}

Key File Contents:
{contents_summary}

Provide a comprehensive codebase analysis. Return ONLY valid JSON:
{{
  "architecture_overview": "3-4 sentence high-level explanation of what this codebase does and how it's structured",
  "project_type": "What kind of project this is (e.g. Full-stack web app, REST API, CLI tool, etc.)",
  "onboarding": {{
    "where_to_start": "Which file to open first and why",
    "key_concepts": ["concept 1", "concept 2", "concept 3"],
    "estimated_complexity": "Simple/Medium/Complex",
    "ramp_up_time": "Estimated time for a developer to get comfortable (e.g. 1-2 days)"
  }},
  "important_files": [
    {{"path": "file/path.ts", "role": "What this file does", "importance": "high/medium"}}
  ],
  "dependencies": {{
    "summary": "Brief summary of key dependencies",
    "notable": ["dep1 - what it does", "dep2 - what it does"]
  }},
  "potential_issues": ["issue 1", "issue 2"],
  "architecture_layers": [
    {{"layer": "Frontend", "description": "what it does", "files": ["key files"]}},
    {{"layer": "Backend", "description": "what it does", "files": ["key files"]}}
  ]
}}"""

    try:
        raw = call_ai(analysis_prompt, "You are an expert software architect. Analyze codebases and return precise, actionable insights. Return ONLY valid JSON, no markdown.", 2500)
        raw = raw.replace("```json", "").replace("```", "").strip()
        analysis = json.loads(raw)
    except Exception as e:
        analysis = {
            "architecture_overview": f"This is a {repo_info.get('language', 'software')} project. Analysis parsing failed — try again.",
            "project_type": "Unknown",
            "onboarding": {"where_to_start": "Check README.md", "key_concepts": [], "estimated_complexity": "Unknown", "ramp_up_time": "Unknown"},
            "important_files": [],
            "dependencies": {"summary": "", "notable": []},
            "potential_issues": [],
            "architecture_layers": []
        }

    return {
        "owner": owner,
        "repo": repo,
        "description": repo_info.get("description", ""),
        "language": repo_info.get("language", ""),
        "stars": repo_info.get("stargazers_count", 0),
        "forks": repo_info.get("forks_count", 0),
        "tech_stack": tech_stack,
        "entry_points": entry_points,
        "total_files": len(files),
        "tree": tree,
        "file_list": file_list,
        "analysis": analysis,
    }

class ChatRequest(BaseModel):
    question: str
    repo_context: str
    history: list = []

@app.post("/chat")
async def chat(req: ChatRequest):
    system = """You are CodeAtlas, an expert code navigator and software architect assistant.
You help developers understand codebases quickly.
Answer questions about the codebase based on the context provided.
Be specific, reference actual files and functions when possible.
Keep answers concise but precise — like a senior engineer explaining to a teammate."""

    messages = [{"role": "system", "content": system}]
    messages.append({"role": "user", "content": f"Repository context:\n{req.repo_context}\n\nQuestion: {req.question}"})

    for h in req.history[-6:]:
        messages.append(h)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.4,
        max_tokens=600,
    )
    return {"answer": response.choices[0].message.content}
