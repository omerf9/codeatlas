import { useState, useRef, useEffect } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// ── Tech stack icons ──
const STACK_ICONS = {
  "React": "⚛", "Next.js": "▲", "Vue.js": "💚", "TypeScript": "TS",
  "Python": "🐍", "Django": "🟢", "Flask/FastAPI": "⚡", "Node.js": "🟩",
  "Docker": "🐳", "Tailwind CSS": "🌊", "Prisma": "△", "Supabase": "⚡",
  "Vite": "⚡", "Testing": "✓", "Vercel": "▲", "Environment Config": "⚙"
};

// ── File tree component ──
function FileTree({ tree, depth = 0, onSelect, selectedFile }) {
  const [collapsed, setCollapsed] = useState(depth > 1);

  if (!tree || typeof tree !== "object") return null;

  const entries = Object.entries(tree).sort(([, a], [, b]) => {
    const aIsFile = typeof a === "string";
    const bIsFile = typeof b === "string";
    if (aIsFile && !bIsFile) return 1;
    if (!aIsFile && bIsFile) return -1;
    return 0;
  });

  return (
    <div>
      {entries.map(([name, value]) => {
        const isFile = typeof value === "string";
        const isSelected = selectedFile === value;

        if (isFile) {
          const ext = name.split(".").pop();
          const extColors = { tsx: "#61DAFB", jsx: "#61DAFB", ts: "#3178C6", js: "#F7DF1E", py: "#3776AB", css: "#563D7C", json: "#90A959", md: "#aaa", yml: "#CC3514", yaml: "#CC3514" };
          return (
            <div key={name} onClick={() => onSelect(value, name)}
              style={{
                padding: "3px 8px 3px " + (depth * 12 + 8) + "px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                borderRadius: "4px", margin: "1px 4px",
                background: isSelected ? "rgba(59,130,246,0.15)" : "transparent",
                transition: "all 0.1s"
              }}
              onMouseEnter={e => !isSelected && (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={e => !isSelected && (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ color: extColors[ext] || "#6B7280", fontSize: "9px", fontFamily: "'Geist Mono', monospace", width: "16px", textAlign: "center", flexShrink: 0 }}>
                {ext?.toUpperCase().slice(0, 2) || "•"}
              </span>
              <span style={{ color: isSelected ? "#93C5FD" : "#9CA3AF", fontSize: "11px", fontFamily: "'Geist Mono', monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
            </div>
          );
        }

        return (
          <div key={name}>
            <div onClick={() => setCollapsed(!collapsed)}
              style={{ padding: "3px 8px 3px " + (depth * 12 + 8) + "px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", borderRadius: "4px", margin: "1px 4px" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ color: "#4B5563", fontSize: "8px", width: "8px" }}>{collapsed ? "▶" : "▼"}</span>
              <span style={{ fontSize: "10px" }}>📁</span>
              <span style={{ color: "#D1D5DB", fontSize: "11px", fontFamily: "'Geist Mono', monospace", fontWeight: "600" }}>{name}</span>
            </div>
            {!collapsed && <FileTree tree={value} depth={depth + 1} onSelect={onSelect} selectedFile={selectedFile} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Chat panel ──
function ChatPanel({ repoContext, repoName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  const SUGGESTIONS = [
    "Where is auth handled?",
    "How does the API work?",
    "Where is the database connected?",
    "What are the main components?",
    "How do I run this locally?",
  ];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text) => {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput("");
    const userMsg = { role: "user", content: q };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, repo_context: repoContext, history: messages.slice(-6) })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Failed to get response. Try again." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #1F2937" }}>
        <div style={{ color: "#F9FAFB", fontSize: "12px", fontWeight: "700", marginBottom: "2px" }}>Ask CodeAtlas</div>
        <div style={{ color: "#374151", fontSize: "10px", fontFamily: "'Geist Mono', monospace" }}>{repoName}</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {messages.length === 0 && (
          <div>
            <div style={{ color: "#374151", fontSize: "10px", letterSpacing: "1px", fontFamily: "'Geist Mono', monospace", marginBottom: "10px" }}>SUGGESTED</div>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => send(s)} style={{
                display: "block", width: "100%", textAlign: "left", padding: "8px 10px",
                background: "rgba(255,255,255,0.02)", border: "1px solid #1F2937",
                borderRadius: "7px", color: "#6B7280", fontSize: "11px", cursor: "pointer",
                marginBottom: "5px", fontFamily: "'Geist Mono', monospace", transition: "all 0.1s"
              }}
              onMouseEnter={e => { e.target.style.borderColor = "#3B82F6"; e.target.style.color = "#93C5FD"; }}
              onMouseLeave={e => { e.target.style.borderColor = "#1F2937"; e.target.style.color = "#6B7280"; }}
              >{s}</button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: "12px" }}>
            <div style={{ color: msg.role === "user" ? "#3B82F6" : "#374151", fontSize: "9px", letterSpacing: "1px", fontFamily: "'Geist Mono', monospace", marginBottom: "4px" }}>
              {msg.role === "user" ? "YOU" : "CODEATLAS"}
            </div>
            <div style={{ color: msg.role === "user" ? "#E5E7EB" : "#9CA3AF", fontSize: "12px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{msg.content}</div>
          </div>
        ))}

        {loading && (
          <div>
            <div style={{ color: "#374151", fontSize: "9px", letterSpacing: "1px", fontFamily: "'Geist Mono', monospace", marginBottom: "4px" }}>CODEATLAS</div>
            <div style={{ display: "flex", gap: "3px" }}>
              {[0,1,2].map(i => <div key={i} style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#3B82F6", animation: `pulse 1.2s ${i*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "10px 12px", borderTop: "1px solid #1F2937" }}>
        <div style={{ display: "flex", gap: "6px", background: "#111827", border: "1px solid #1F2937", borderRadius: "8px", padding: "6px 10px" }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }}
            placeholder="Ask about this codebase..."
            style={{ flex: 1, background: "none", border: "none", color: "#E5E7EB", fontSize: "11px", outline: "none", fontFamily: "'Geist Mono', monospace" }} />
          <button onClick={() => send()} disabled={!input.trim() || loading} style={{
            background: input.trim() && !loading ? "#3B82F6" : "#1F2937", border: "none",
            borderRadius: "5px", color: "#fff", cursor: "pointer", padding: "4px 8px", fontSize: "11px"
          }}>↑</button>
        </div>
      </div>
    </div>
  );
}

// ── Main content ──
function MainContent({ data, selectedFile, onFileSelect }) {
  const [activeTab, setActiveTab] = useState("overview");
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "onboarding", label: "Start Here" },
    { id: "files", label: "Key Files" },
    { id: "deps", label: "Dependencies" },
    { id: "issues", label: "Issues" },
  ];

  const a = data.analysis;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Repo header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #1F2937", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ color: "#6B7280", fontSize: "12px" }}>{data.owner} /</span>
              <span style={{ color: "#F9FAFB", fontSize: "14px", fontWeight: "700", fontFamily: "'Geist Mono', monospace" }}>{data.repo}</span>
              {data.stars > 0 && <span style={{ background: "#1F2937", color: "#9CA3AF", fontSize: "10px", padding: "2px 7px", borderRadius: "4px", fontFamily: "'Geist Mono', monospace" }}>★ {data.stars.toLocaleString()}</span>}
            </div>
            {data.description && <div style={{ color: "#6B7280", fontSize: "12px" }}>{data.description}</div>}
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {data.tech_stack.slice(0, 5).map(t => (
              <span key={t} style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "#93C5FD", fontSize: "10px", padding: "3px 8px", borderRadius: "5px", fontFamily: "'Geist Mono', monospace" }}>
                {STACK_ICONS[t] || "•"} {t}
              </span>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "16px", marginTop: "10px" }}>
          {[
            { label: "Files", value: data.total_files },
            { label: "Language", value: data.language || "Mixed" },
            { label: "Complexity", value: a.onboarding?.estimated_complexity || "—" },
            { label: "Ramp-up", value: a.onboarding?.ramp_up_time || "—" },
            { label: "Type", value: a.project_type || "—" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ color: "#374151", fontSize: "9px", letterSpacing: "1px", fontFamily: "'Geist Mono', monospace" }}>{s.label.toUpperCase()}</div>
              <div style={{ color: "#E5E7EB", fontSize: "11px", fontFamily: "'Geist Mono', monospace", marginTop: "2px" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid #1F2937", flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "10px 16px", background: "none", border: "none",
            borderBottom: `2px solid ${activeTab === t.id ? "#3B82F6" : "transparent"}`,
            color: activeTab === t.id ? "#93C5FD" : "#4B5563",
            cursor: "pointer", fontSize: "11px", fontWeight: "600", transition: "all 0.15s",
            fontFamily: "'Geist Mono', monospace"
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

        {activeTab === "overview" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ color: "#374151", fontSize: "9px", letterSpacing: "2px", fontFamily: "'Geist Mono', monospace", marginBottom: "10px" }}>ARCHITECTURE OVERVIEW</div>
              <p style={{ color: "#D1D5DB", fontSize: "13px", lineHeight: "1.8" }}>{a.architecture_overview}</p>
            </div>

            {a.architecture_layers?.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ color: "#374151", fontSize: "9px", letterSpacing: "2px", fontFamily: "'Geist Mono', monospace", marginBottom: "12px" }}>ARCHITECTURE LAYERS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {a.architecture_layers.map((layer, i) => (
                    <div key={i} style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: "10px", padding: "14px 16px", borderLeft: "3px solid #3B82F6" }}>
                      <div style={{ color: "#93C5FD", fontSize: "11px", fontFamily: "'Geist Mono', monospace", fontWeight: "700", marginBottom: "4px" }}>{layer.layer}</div>
                      <div style={{ color: "#6B7280", fontSize: "12px", marginBottom: "6px" }}>{layer.description}</div>
                      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        {layer.files?.map((f, j) => (
                          <span key={j} style={{ background: "#1F2937", color: "#9CA3AF", fontSize: "10px", padding: "2px 7px", borderRadius: "4px", fontFamily: "'Geist Mono', monospace" }}>{f}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.entry_points?.length > 0 && (
              <div>
                <div style={{ color: "#374151", fontSize: "9px", letterSpacing: "2px", fontFamily: "'Geist Mono', monospace", marginBottom: "10px" }}>ENTRY POINTS</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {data.entry_points.map((ep, i) => (
                    <div key={i} onClick={() => onFileSelect(ep, ep.split("/").pop())} style={{
                      background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
                      borderRadius: "6px", padding: "5px 10px", cursor: "pointer",
                      color: "#93C5FD", fontSize: "11px", fontFamily: "'Geist Mono', monospace"
                    }}>▶ {ep}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "onboarding" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
              <div style={{ color: "#93C5FD", fontSize: "11px", fontFamily: "'Geist Mono', monospace", marginBottom: "8px" }}>▶ WHERE TO START</div>
              <p style={{ color: "#D1D5DB", fontSize: "13px", lineHeight: "1.7" }}>{a.onboarding?.where_to_start}</p>
            </div>

            {a.onboarding?.key_concepts?.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ color: "#374151", fontSize: "9px", letterSpacing: "2px", fontFamily: "'Geist Mono', monospace", marginBottom: "10px" }}>KEY CONCEPTS TO UNDERSTAND</div>
                {a.onboarding.key_concepts.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: "1px solid #111827" }}>
                    <span style={{ color: "#3B82F6", fontFamily: "'Geist Mono', monospace", fontSize: "11px" }}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{ color: "#9CA3AF", fontSize: "12px" }}>{c}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "files" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ color: "#374151", fontSize: "9px", letterSpacing: "2px", fontFamily: "'Geist Mono', monospace", marginBottom: "12px" }}>IMPORTANT FILES</div>
            {a.important_files?.map((f, i) => (
              <div key={i} onClick={() => onFileSelect(f.path, f.path.split("/").pop())} style={{
                background: "#111827", border: "1px solid #1F2937", borderRadius: "10px",
                padding: "14px 16px", marginBottom: "8px", cursor: "pointer", transition: "all 0.15s",
                borderLeft: `3px solid ${f.importance === "high" ? "#3B82F6" : "#1F2937"}`
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#3B82F6"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#1F2937"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ color: "#93C5FD", fontSize: "11px", fontFamily: "'Geist Mono', monospace" }}>{f.path}</span>
                  {f.importance === "high" && <span style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6", fontSize: "9px", padding: "2px 6px", borderRadius: "4px", fontFamily: "'Geist Mono', monospace" }}>HIGH</span>}
                </div>
                <p style={{ color: "#6B7280", fontSize: "12px", margin: 0 }}>{f.role}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "deps" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ color: "#374151", fontSize: "9px", letterSpacing: "2px", fontFamily: "'Geist Mono', monospace", marginBottom: "8px" }}>DEPENDENCY SUMMARY</div>
              <p style={{ color: "#9CA3AF", fontSize: "13px", lineHeight: "1.7" }}>{a.dependencies?.summary}</p>
            </div>
            {a.dependencies?.notable?.length > 0 && (
              <div>
                <div style={{ color: "#374151", fontSize: "9px", letterSpacing: "2px", fontFamily: "'Geist Mono', monospace", marginBottom: "10px" }}>NOTABLE DEPENDENCIES</div>
                {a.dependencies.notable.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: "1px solid #111827" }}>
                    <span style={{ color: "#3B82F6", flexShrink: 0 }}>→</span>
                    <span style={{ color: "#9CA3AF", fontSize: "12px" }}>{d}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "issues" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ color: "#374151", fontSize: "9px", letterSpacing: "2px", fontFamily: "'Geist Mono', monospace", marginBottom: "12px" }}>POTENTIAL ISSUES DETECTED</div>
            {a.potential_issues?.length > 0 ? (
              a.potential_issues.map((issue, i) => (
                <div key={i} style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "8px", padding: "12px 14px", marginBottom: "8px", display: "flex", gap: "10px" }}>
                  <span style={{ color: "#EF4444", flexShrink: 0 }}>⚠</span>
                  <span style={{ color: "#9CA3AF", fontSize: "12px", lineHeight: "1.6" }}>{issue}</span>
                </div>
              ))
            ) : (
              <div style={{ color: "#374151", fontSize: "12px", textAlign: "center", padding: "32px" }}>No major issues detected.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Landing / Input ──
function Landing({ onAnalyze, loading, progress }) {
  const [url, setUrl] = useState("");
  const examples = [
    "https://github.com/vercel/next.js",
    "https://github.com/facebook/react",
    "https://github.com/tiangolo/fastapi",
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: "560px", width: "100%", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#0D1117", border: "1px solid #1F2937", borderRadius: "6px", padding: "5px 12px", marginBottom: "24px" }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#3B82F6", animation: "pulse 2s infinite" }} />
          <span style={{ color: "#374151", fontSize: "10px", fontFamily: "'Geist Mono', monospace", letterSpacing: "2px" }}>CODEBASE INTELLIGENCE</span>
        </div>

        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: "700", letterSpacing: "-2px", lineHeight: "1.05", marginBottom: "14px", color: "#F9FAFB" }}>
          Google Maps<br />
          <span style={{ color: "#3B82F6" }}>for your codebase.</span>
        </h1>

        <p style={{ color: "#4B5563", fontSize: "14px", lineHeight: "1.7", marginBottom: "32px" }}>
          Paste any public GitHub repo. CodeAtlas maps the architecture, explains key files, detects the tech stack, and answers any question about the code.
        </p>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && url.trim()) onAnalyze(url); }}
            placeholder="https://github.com/owner/repo"
            style={{
              flex: 1, background: "#0D1117", border: "1px solid #1F2937", borderRadius: "10px",
              color: "#F9FAFB", padding: "12px 16px", fontSize: "13px",
              fontFamily: "'Geist Mono', monospace", outline: "none",
              transition: "border-color 0.15s"
            }}
            onFocus={e => e.target.style.borderColor = "#3B82F6"}
            onBlur={e => e.target.style.borderColor = "#1F2937"}
          />
          <button
            onClick={() => url.trim() && onAnalyze(url)}
            disabled={!url.trim() || loading}
            style={{
              padding: "12px 20px", background: url.trim() && !loading ? "#3B82F6" : "#1F2937",
              border: "none", borderRadius: "10px", color: "#fff", cursor: url.trim() && !loading ? "pointer" : "default",
              fontSize: "13px", fontWeight: "700", transition: "all 0.15s", whiteSpace: "nowrap"
            }}
          >{loading ? "..." : "Analyze →"}</button>
        </div>

        {loading && (
          <div style={{ color: "#3B82F6", fontSize: "11px", fontFamily: "'Geist Mono', monospace", letterSpacing: "1px", marginBottom: "16px", animation: "pulse 1.5s infinite" }}>
            {progress}
          </div>
        )}

        <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
          {examples.map(ex => (
            <button key={ex} onClick={() => setUrl(ex)} style={{
              background: "none", border: "1px solid #1F2937", borderRadius: "6px",
              color: "#374151", fontSize: "10px", padding: "4px 10px", cursor: "pointer",
              fontFamily: "'Geist Mono', monospace", transition: "all 0.1s"
            }}
            onMouseEnter={e => { e.target.style.borderColor = "#3B82F6"; e.target.style.color = "#93C5FD"; }}
            onMouseLeave={e => { e.target.style.borderColor = "#1F2937"; e.target.style.color = "#374151"; }}
            >{ex.replace("https://github.com/", "")}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──
export default function CodeAtlas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState(null);

  const analyze = async (url) => {
    setLoading(true);
    setError(null);
    const steps = ["Fetching repository...", "Parsing file tree...", "Detecting tech stack...", "Reading key files...", "Generating architecture map..."];
    let i = 0;
    setProgress(steps[0]);
    const interval = setInterval(() => { if (i < steps.length - 1) setProgress(steps[++i]); }, 1500);

    try {
      const res = await fetch(`${BACKEND_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Analysis failed");
      }
      const result = await res.json();
      clearInterval(interval);
      setData(result);
    } catch (e) {
      clearInterval(interval);
      setError(e.message);
    }
    setLoading(false);
    setProgress("");
  };

  const repoContext = data ? `Repo: ${data.owner}/${data.repo}
Tech: ${data.tech_stack.join(", ")}
Files: ${data.file_list.slice(0, 80).join("\n")}
Architecture: ${data.analysis.architecture_overview}
Entry points: ${data.entry_points.join(", ")}` : "";

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: "#060A10", color: "#E5E7EB", fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
          @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
          ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#1F2937;border-radius:4px}
        `}</style>
        <header style={{ padding: "0 24px", height: "52px", borderBottom: "1px solid #0D1117", display: "flex", alignItems: "center", gap: "10px", background: "rgba(6,10,16,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ width: "20px", height: "20px", background: "#3B82F6", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "8px", height: "8px", background: "#060A10", borderRadius: "1px", transform: "rotate(45deg)" }} />
          </div>
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: "13px", fontWeight: "700", color: "#F9FAFB" }}>CodeAtlas</span>
          <span style={{ color: "#1F2937", fontSize: "13px" }}>/ codebase intelligence</span>
        </header>
        {error && (
          <div style={{ position: "fixed", top: "60px", left: "50%", transform: "translateX(-50%)", background: "#1C1010", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 16px", color: "#EF4444", fontSize: "12px", fontFamily: "'Geist Mono', monospace", zIndex: 30 }}>
            ⚠ {error}
          </div>
        )}
        <Landing onAnalyze={analyze} loading={loading} progress={progress} />
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", background: "#060A10", color: "#E5E7EB", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#1F2937;border-radius:4px}
      `}</style>

      {/* Header */}
      <header style={{ padding: "0 16px", height: "48px", borderBottom: "1px solid #0D1117", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(6,10,16,0.98)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "18px", height: "18px", background: "#3B82F6", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "7px", height: "7px", background: "#060A10", borderRadius: "1px", transform: "rotate(45deg)" }} />
          </div>
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: "12px", fontWeight: "700", color: "#F9FAFB" }}>CodeAtlas</span>
          <span style={{ color: "#1F2937" }}>/</span>
          <span style={{ color: "#3B82F6", fontSize: "12px", fontFamily: "'Geist Mono', monospace" }}>{data.owner}/{data.repo}</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "5px" }}>
            {data.tech_stack.slice(0, 4).map(t => (
              <span key={t} style={{ background: "#0D1117", border: "1px solid #1F2937", color: "#4B5563", fontSize: "9px", padding: "2px 6px", borderRadius: "4px", fontFamily: "'Geist Mono', monospace" }}>{t}</span>
            ))}
          </div>
          <button onClick={() => setData(null)} style={{ background: "none", border: "1px solid #1F2937", borderRadius: "6px", color: "#374151", cursor: "pointer", padding: "4px 10px", fontSize: "10px", fontFamily: "'Geist Mono', monospace" }}>
            NEW REPO
          </button>
        </div>
      </header>

      {/* Three panel layout */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr 280px", overflow: "hidden" }}>

        {/* Left — File tree */}
        <div style={{ borderRight: "1px solid #0D1117", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #0D1117", flexShrink: 0 }}>
            <div style={{ color: "#374151", fontSize: "9px", letterSpacing: "2px", fontFamily: "'Geist Mono', monospace", marginBottom: "4px" }}>FILES</div>
            <div style={{ color: "#4B5563", fontSize: "10px", fontFamily: "'Geist Mono', monospace" }}>{data.total_files} files</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", paddingTop: "8px", paddingBottom: "8px" }}>
            <FileTree tree={data.tree} onSelect={(path, name) => { setSelectedFile(path); setSelectedFileName(name); }} selectedFile={selectedFile} />
          </div>
        </div>

        {/* Center — Main content */}
        <div style={{ overflow: "hidden", borderRight: "1px solid #0D1117" }}>
          <MainContent data={data} selectedFile={selectedFile} onFileSelect={(path, name) => { setSelectedFile(path); setSelectedFileName(name); }} />
        </div>

        {/* Right — Chat */}
        <div style={{ overflow: "hidden" }}>
          <ChatPanel repoContext={repoContext} repoName={`${data.owner}/${data.repo}`} />
        </div>
      </div>
    </div>
  );
}
