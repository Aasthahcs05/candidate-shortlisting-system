import { useEffect, useState } from "react";
import API from "./api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

function App() {
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
  const [loadingAI, setLoadingAI] = useState(false);
  const [message, setMessage] = useState("");

  const fetchCandidates = async () => {
    try {
      const res = await API.get(`/api/candidates?search=${search}`);
      setCandidates(res.data.candidates);
    } catch (error) {
      setMessage("Error fetching candidates");
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [search]);

  const handleCandidateChange = (e) => {
    setCandidateForm({
      ...candidateForm,
      [e.target.name]: e.target.value
    });
  };

  const handleJobChange = (e) => {
    setJobForm({
      ...jobForm,
      [e.target.name]: e.target.value
    });
  };

  const addCandidate = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        name: candidateForm.name,
        email: candidateForm.email,
        skills: candidateForm.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        experience: Number(candidateForm.experience),
        bio: candidateForm.bio,
        projects: candidateForm.projects
      };

      await API.post("/api/candidates", payload);

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

  const getJobPayload = () => {
    return {
      requiredSkills: jobForm.requiredSkills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      minExperience: Number(jobForm.minExperience),
      preferredSkills: jobForm.preferredSkills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
    };
  };

  const basicShortlist = async (e) => {
    e.preventDefault();

    try {
      const res = await API.post("/api/match", getJobPayload());
      setShortlisted(res.data.shortlistedCandidates);
      setAiRecommendation("");
      setMessage("Basic shortlisting completed");
    } catch (error) {
      setMessage(error.response?.data?.message || "Error shortlisting candidates");
    }
  };

  const aiShortlist = async () => {
    try {
      setLoadingAI(true);
      const res = await API.post("/api/ai/shortlist", getJobPayload());
      setShortlisted(res.data.basicRanking);
      setAiRecommendation(res.data.aiRecommendation);
      setMessage("AI shortlisting completed");
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
    } catch (error) {
      setMessage("Error saving shortlisted candidate");
    }
  };

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="tag">MERN + OpenRouter AI</p>
          <h1>Candidate Profile Shortlisting System</h1>
          <p>
            Add candidates, enter job requirements, calculate skill match score,
            and use AI to recommend the best-fit candidates.
          </p>
        </div>
      </header>

      {message && <div className="message">{message}</div>}

      <main className="grid">
        <section className="card">
          <h2>Add Candidate</h2>
          <form onSubmit={addCandidate}>
            <input
              name="name"
              placeholder="Candidate Name"
              value={candidateForm.name}
              onChange={handleCandidateChange}
              required
            />

            <input
              name="email"
              placeholder="Email"
              value={candidateForm.email}
              onChange={handleCandidateChange}
              required
            />

            <input
              name="skills"
              placeholder="Skills comma separated: React, Node.js, MongoDB"
              value={candidateForm.skills}
              onChange={handleCandidateChange}
              required
            />

            <input
              name="experience"
              type="number"
              placeholder="Experience in years"
              value={candidateForm.experience}
              onChange={handleCandidateChange}
              required
            />

            <textarea
              name="bio"
              placeholder="Projects / Bio"
              value={candidateForm.bio}
              onChange={handleCandidateChange}
            />

            <textarea
              name="projects"
              placeholder="Project details"
              value={candidateForm.projects}
              onChange={handleCandidateChange}
            />

            <button type="submit">Add Candidate</button>
          </form>
        </section>

        <section className="card">
          <h2>Job Requirement</h2>
          <form onSubmit={basicShortlist}>
            <input
              name="requiredSkills"
              placeholder="Required Skills: React, Node.js"
              value={jobForm.requiredSkills}
              onChange={handleJobChange}
              required
            />

            <input
              name="minExperience"
              type="number"
              placeholder="Minimum Experience"
              value={jobForm.minExperience}
              onChange={handleJobChange}
              required
            />

            <input
              name="preferredSkills"
              placeholder="Preferred Skills: AWS, MongoDB"
              value={jobForm.preferredSkills}
              onChange={handleJobChange}
            />

            <div className="button-row">
              <button type="submit">Basic Shortlist</button>
              <button type="button" onClick={aiShortlist}>
                {loadingAI ? "AI Thinking..." : "AI Shortlist"}
              </button>
            </div>
          </form>
        </section>
      </main>

      <section className="card full">
        <div className="section-header">
          <h2>Candidate List</h2>
          <input
            className="search"
            placeholder="Search by name, email, or skill"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="candidate-list">
          {candidates.map((candidate) => (
            <div className="candidate-card" key={candidate._id}>
              <h3>{candidate.name}</h3>
              <p>{candidate.email}</p>
              <p>
                <strong>Skills:</strong> {candidate.skills.join(", ")}
              </p>
              <p>
                <strong>Experience:</strong> {candidate.experience} years
              </p>
              {candidate.bio && (
                <p>
                  <strong>Bio:</strong> {candidate.bio}
                </p>
              )}
              {candidate.isShortlisted && (
                <span className="badge saved">Saved Shortlisted</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {shortlisted.length > 0 && (
        <section className="card full">
          <h2>Shortlisted Candidates</h2>

          <div className="chart-box">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={shortlisted}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="matchScore" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="candidate-list">
            {shortlisted.map((candidate) => (
              <div className="candidate-card" key={candidate._id}>
                <div className="candidate-top">
                  <h3>{candidate.name}</h3>
                  <span className={`badge ${candidate.matchLevel.toLowerCase()}`}>
                    {candidate.matchLevel}
                  </span>
                </div>

                <p>
                  <strong>Email:</strong> {candidate.email}
                </p>

                <p>
                  <strong>Match Score:</strong> {candidate.matchScore}%
                </p>

                <p>
                  <strong>Skill Overlap:</strong> {candidate.skillOverlap}%
                </p>

                <p>
                  <strong>Skills Matched:</strong>{" "}
                  {candidate.matchedSkills.length > 0
                    ? candidate.matchedSkills.join(", ")
                    : "None"}
                </p>

                <p>
                  <strong>Experience:</strong> {candidate.experience} years
                </p>

                <p>
                  <strong>Experience Criteria:</strong>{" "}
                  {candidate.experienceEligible ? "Eligible" : "Not Eligible"}
                </p>

                <button onClick={() => saveShortlisted(candidate._id)}>
                  Save Shortlisted
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {aiRecommendation && (
        <section className="card full ai-box">
          <h2>AI Recommendation</h2>
          <pre>{aiRecommendation}</pre>
        </section>
      )}
    </div>
  );
}

export default App;