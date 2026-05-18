import { useEffect, useMemo, useState } from "react";
import API from "./api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const [candidateForm, setCandidateForm] = useState({
    name: "",
    email: "",
    skills: "",
    experience: "",
    bio: "",
    projects: ""
  });

  const [jobForm, setJobForm] = useState({
    requiredSkills: "",
    minExperience: "",
    preferredSkills: ""
  });

  const [candidates, setCandidates] = useState([]);
  const [shortlisted, setShortlisted] = useState([]);
  const [aiRecommendation, setAiRecommendation] = useState("");
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [message, setMessage] = useState("");

  const [chatMessages, setChatMessages] = useState([
    { role: "ai", content: "Hello! I am your AI HR Assistant. You can ask me to find candidates, analyze their skills, or help with drafting emails. How can I assist you today?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);

  const fetchCandidates = async () => {
    try {
      const res = await API.get(`/api/candidates?search=${search}`);
      setCandidates(res.data.candidates || []);
    } catch {
      setMessage("Error fetching candidates");
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [search]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (!skillFilter) return true;
      return c.skills?.some((s) =>
        s.toLowerCase().includes(skillFilter.toLowerCase())
      );
    });
  }, [candidates, skillFilter]);

  const stats = {
    total: candidates.length,
    high: shortlisted.filter((c) => c.matchLevel === "High").length,
    medium: shortlisted.filter((c) => c.matchLevel === "Medium").length,
    saved: candidates.filter((c) => c.isShortlisted).length
  };

  const handleCandidateChange = (e) => {
    setCandidateForm({ ...candidateForm, [e.target.name]: e.target.value });
  };

  const handleJobChange = (e) => {
    setJobForm({ ...jobForm, [e.target.name]: e.target.value });
  };

  const addCandidate = async (e) => {
    e.preventDefault();

    try {
      await API.post("/api/candidates", {
        name: candidateForm.name,
        email: candidateForm.email,
        skills: candidateForm.skills.split(",").map((s) => s.trim()).filter(Boolean),
        experience: Number(candidateForm.experience),
        bio: candidateForm.bio,
        projects: candidateForm.projects
      });

      setCandidateForm({
        name: "",
        email: "",
        skills: "",
        experience: "",
        bio: "",
        projects: ""
      });

      setMessage("Candidate added successfully");
      fetchCandidates();
    } catch (error) {
      setMessage(error.response?.data?.message || "Error adding candidate");
    }
  };

  const getJobPayload = () => ({
    requiredSkills: jobForm.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
    minExperience: Number(jobForm.minExperience),
    preferredSkills: jobForm.preferredSkills.split(",").map((s) => s.trim()).filter(Boolean)
  });

  const basicShortlist = async (e) => {
    e.preventDefault();

    try {
      const res = await API.post("/api/match", getJobPayload());
      setShortlisted(res.data.shortlistedCandidates || []);
      setMessage("Basic shortlisting completed");
      setActivePage("matching");
    } catch (error) {
      setMessage(error.response?.data?.message || "Error shortlisting candidates");
    }
  };

  const aiShortlist = async () => {
    try {
      setLoadingAI(true);
      const res = await API.post("/api/ai/shortlist", getJobPayload());
      setShortlisted(res.data.basicRanking || []);
      setAiRecommendation(res.data.aiRecommendation || "");
      setMessage("AI shortlisting completed");
      setActivePage("analytics");
    } catch (error) {
      setMessage(error.response?.data?.message || "Error generating AI shortlist");
    } finally {
      setLoadingAI(false);
    }
  };

  const saveShortlisted = async (id) => {
    try {
      await API.post(`/api/candidates/${id}/save-shortlisted`);
      setMessage("Candidate saved as shortlisted");
      fetchCandidates();
    } catch {
      setMessage("Error saving shortlisted candidate");
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessages = [...chatMessages, { role: "user", content: chatInput }];
    setChatMessages(newMessages);
    setChatInput("");
    setLoadingChat(true);

    try {
      const apiMessages = newMessages.slice(1); // excluding the initial welcome message from the history to avoid confusion
      const res = await API.post("/api/ai/chat", { messages: apiMessages });
      setChatMessages([...newMessages, { role: "ai", content: res.data.reply }]);
    } catch (error) {
      setChatMessages([...newMessages, { role: "ai", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>RecruitPro AI</h1>
        <p>Enterprise Recruitment</p>

        <nav>
          <button onClick={() => setActivePage("dashboard")} className={activePage === "dashboard" ? "active" : ""}>Dashboard</button>
          <button onClick={() => setActivePage("candidates")} className={activePage === "candidates" ? "active" : ""}>Candidates</button>
          <button onClick={() => setActivePage("matching")} className={activePage === "matching" ? "active" : ""}>Matching</button>
          <button onClick={() => setActivePage("analytics")} className={activePage === "analytics" ? "active" : ""}>Analytics</button>
          <button onClick={() => setActivePage("ai-assistant")} className={activePage === "ai-assistant" ? "active" : ""}>AI Assistant</button>
        </nav>

        <button className="new-btn" onClick={() => setActivePage("matching")}>+ New Requisition</button>
      </aside>

      <main className="main">
        <header className="topbar">
          <input
            placeholder="Global candidate search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span>🔔</span>
          <span>⚙️</span>
          <div className="avatar">A</div>
        </header>

        {message && <div className="alert">{message}</div>}

        {activePage === "dashboard" && (
          <>
            <section className="hero">
              <h2>Elevate Your Talent Acquisition with RecruitPro AI</h2>
              <p>
                Identify, match, and shortlist the best candidates using skill matching and AI-powered recommendations.
              </p>
              <div>
                <button onClick={() => setActivePage("matching")}>New Requisition</button>
                <button className="outline" onClick={() => setActivePage("candidates")}>View Candidates</button>
              </div>
            </section>

            <section className="stats">
              <div><span>👥</span><p>Total Candidates</p><h3>{stats.total}</h3></div>
              <div><span>🎯</span><p>High Match Candidates</p><h3>{stats.high}</h3></div>
              <div><span>📊</span><p>Medium Match Candidates</p><h3>{stats.medium}</h3></div>
              <div><span>⭐</span><p>Saved Shortlisted</p><h3>{stats.saved}</h3></div>
            </section>

            <section className="feature-grid">
              <div className="feature-card">
                <h3>Cognitive AI Matching</h3>
                <p>Analyze profiles beyond simple keywords and get intelligent candidate suggestions.</p>
              </div>
              <div className="feature-card">
                <h3>Real-time Pipeline Analytics</h3>
                <p>Track match scores, shortlisted profiles, and recruitment quality visually.</p>
              </div>
            </section>
          </>
        )}

        {activePage === "candidates" && (
          <section>
            <div className="page-title">
              <h2>Candidate Management</h2>
              <p>Streamline your hiring pipeline with AI-assisted profile analysis.</p>
            </div>

            <div className="candidate-layout">
              <div className="dark-panel">
                <h3>Recruiter Pro-Tip</h3>
                <p>Add clean skills like React, Node.js, MongoDB, AWS for better matching accuracy.</p>
              </div>

              <form className="form-card" onSubmit={addCandidate}>
                <input name="name" placeholder="Full Name" value={candidateForm.name} onChange={handleCandidateChange} required />
                <input name="email" placeholder="Email Address" value={candidateForm.email} onChange={handleCandidateChange} required />
                <input name="skills" placeholder="Skills: React, Node.js, MongoDB" value={candidateForm.skills} onChange={handleCandidateChange} required />
                <input name="experience" type="number" placeholder="Years of Experience" value={candidateForm.experience} onChange={handleCandidateChange} required />
                <textarea name="bio" placeholder="Professional Bio" value={candidateForm.bio} onChange={handleCandidateChange} />
                <textarea name="projects" placeholder="Projects" value={candidateForm.projects} onChange={handleCandidateChange} />
                <button>Add to Pipeline</button>
              </form>
            </div>

            <div className="filters">
              <input placeholder="Search by name, email, or skill..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <input placeholder="Filter by skill..." value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} />
              <span>Showing {filteredCandidates.length} Candidates</span>
            </div>

            <div className="cards">
              {filteredCandidates.map((c) => (
                <div className="profile-card" key={c._id}>
                  <div className="profile-icon">{c.name?.[0]}</div>
                  <h3>{c.name}</h3>
                  <p>{c.email}</p>
                  <strong>{c.experience} years experience</strong>
                  <p>{c.bio || c.projects || "No bio added"}</p>
                  <div className="skills">
                    {c.skills?.map((s) => <span key={s}>{s}</span>)}
                  </div>
                  {c.isShortlisted && <div className="saved">Saved Shortlisted</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === "matching" && (
          <section className="matching-grid">
            <div>
              <form className="match-form" onSubmit={basicShortlist}>
                <h2>Job Match Intelligence</h2>
                <p>Configure parameters for candidate matching.</p>

                <label>Required Skills</label>
                <input name="requiredSkills" placeholder="React, Node.js" value={jobForm.requiredSkills} onChange={handleJobChange} required />

                <label>Preferred Skills</label>
                <input name="preferredSkills" placeholder="MongoDB, AWS" value={jobForm.preferredSkills} onChange={handleJobChange} />

                <label>Minimum Experience</label>
                <input name="minExperience" type="number" placeholder="2" value={jobForm.minExperience} onChange={handleJobChange} required />

                <button type="button" onClick={aiShortlist}>{loadingAI ? "AI Thinking..." : "AI Shortlist"}</button>
                <button className="outline-dark" type="submit">Basic Shortlist</button>
              </form>

              <div className="tip">
                <h3>Recruiter Pro-Tip</h3>
                <p>AI shortlisting considers semantic relevance, experience, skills, bio and projects.</p>
              </div>
            </div>

            <div>
              <div className="page-title">
                <h2>Top Matches Found</h2>
                <p>{shortlisted.length} potential candidates identified.</p>
              </div>

              <div className="match-cards">
                {shortlisted.map((c) => (
                  <div className="match-card" key={c._id}>
                    <div className="candidate-top">
                      <h3>{c.name}</h3>
                      <span className={`badge ${c.matchLevel?.toLowerCase()}`}>{c.matchLevel}</span>
                    </div>
                    <h2>{c.matchScore}%</h2>
                    <p>{c.email}</p>
                    <p><b>Matched Skills:</b></p>
                    <div className="skills">
                      {c.matchedSkills?.length ? c.matchedSkills.map((s) => <span key={s}>{s}</span>) : <span>None</span>}
                    </div>
                    <p>{c.experience} years experience</p>
                    <button onClick={() => saveShortlisted(c._id)}>Save Shortlist</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activePage === "analytics" && (
          <section>
            <div className="page-title">
              <h2>AI Match Intelligence</h2>
              <p>Real-time candidate pool analysis and AI recommendations.</p>
            </div>

            <div className="analytics-card">
              <h3>Match Score Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={shortlisted}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="matchScore" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="insight-grid">
              <div className="ai-summary">
                <h3>AI Analysis Summary</h3>
                <pre>{aiRecommendation || "Run AI Shortlist to generate candidate explanation, strengths, weaknesses and interview questions."}</pre>
              </div>

              <div className="questions">
                <h3>AI-Generated Interview Questions</h3>
                <div>
                  <b>Focus: Technical</b>
                  <p>Explain one project where your skills directly matched the job requirement.</p>
                </div>
                <div>
                  <b>Focus: Problem Solving</b>
                  <p>Describe a challenging technical issue and how you solved it.</p>
                </div>
                <div>
                  <b>Focus: Adaptability</b>
                  <p>How do you learn a new technology required for a project?</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {activePage === "ai-assistant" && (
          <section className="chat-section">
            <div className="page-title">
              <h2>AI HR Assistant</h2>
              <p>Chat with your intelligent recruitment copilot.</p>
            </div>
            <div className="chat-container">
              <div className="chat-messages">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`message ${msg.role}`}>
                    <div className="bubble">
                      {msg.role === "ai" ? "🤖 " : "👤 "}
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loadingChat && (
                  <div className="message ai">
                    <div className="bubble">🤖 Typing...</div>
                  </div>
                )}
              </div>
              <form className="chat-input-form" onSubmit={handleChatSubmit}>
                <input
                  type="text"
                  placeholder="Ask about candidates, skills, or draft emails..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={loadingChat}
                />
                <button type="submit" disabled={loadingChat}>Send</button>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;