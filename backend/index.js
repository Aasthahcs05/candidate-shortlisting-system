const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();

app.use(
  cors({
//     origin: [
//       "http://localhost:5173",
//       process.env.FRONTEND_URL
//     ],
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

const CandidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  skills: {
    type: [String],
    required: true
  },
  experience: {
    type: Number,
    required: true
  },
  bio: {
    type: String,
    default: ""
  },
  projects: {
    type: String,
    default: ""
  },
  isShortlisted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Candidate = mongoose.model("Candidate", CandidateSchema);

function normalizeSkill(skill) {
  return skill.toLowerCase().trim();
}

function matchCandidates(candidates, job) {
  const requiredSkills = (job.requiredSkills || []).map(normalizeSkill);
  const preferredSkills = (job.preferredSkills || []).map(normalizeSkill);
  const minExperience = Number(job.minExperience || 0);

  return candidates
    .map((candidate) => {
      const candidateSkills = candidate.skills.map(normalizeSkill);

      const matchedSkills = requiredSkills.filter((skill) =>
        candidateSkills.includes(skill)
      );

      const matchedPreferredSkills = preferredSkills.filter((skill) =>
        candidateSkills.includes(skill)
      );

      const skillScore =
        requiredSkills.length > 0
          ? matchedSkills.length / requiredSkills.length
          : 0;

      const experienceEligible = candidate.experience >= minExperience;

      let experienceScore = experienceEligible ? 1 : candidate.experience / minExperience;
      if (!isFinite(experienceScore)) experienceScore = 0;
      if (experienceScore > 1) experienceScore = 1;

      const preferredScore =
        preferredSkills.length > 0
          ? matchedPreferredSkills.length / preferredSkills.length
          : 0;

      const finalScore =
        skillScore * 0.65 + experienceScore * 0.25 + preferredScore * 0.1;

      let matchLevel = "Low";

      if (finalScore >= 0.75 && experienceEligible) {
        matchLevel = "High";
      } else if (finalScore >= 0.45) {
        matchLevel = "Medium";
      }

      return {
        _id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        skills: candidate.skills,
        experience: candidate.experience,
        bio: candidate.bio,
        projects: candidate.projects,
        matchedSkills,
        matchedPreferredSkills,
        matchScore: Number((finalScore * 100).toFixed(2)),
        skillOverlap: Number((skillScore * 100).toFixed(2)),
        experienceEligible,
        matchLevel
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Candidate Shortlisting API is running"
  });
});

app.post("/api/candidates", async (req, res) => {
  try {
    const { name, email, skills, experience, bio, projects } = req.body;

    if (!name || !email || !skills || experience === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, email, skills, and experience are required"
      });
    }

    if (!Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        message: "Skills must be an array"
      });
    }

    const candidate = await Candidate.create({
      name,
      email,
      skills,
      experience,
      bio,
      projects
    });

    res.status(201).json({
      success: true,
      message: "Candidate added successfully",
      candidate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding candidate",
      error: error.message
    });
  }
});

app.get("/api/candidates", async (req, res) => {
  try {
    const search = req.query.search || "";

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { skills: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const candidates = await Candidate.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: candidates.length,
      candidates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching candidates",
      error: error.message
    });
  }
});

app.post("/api/match", async (req, res) => {
  try {
    const { requiredSkills, minExperience, preferredSkills } = req.body;

    if (!requiredSkills || !Array.isArray(requiredSkills)) {
      return res.status(400).json({
        success: false,
        message: "requiredSkills must be an array"
      });
    }

    const candidates = await Candidate.find();
    const shortlistedCandidates = matchCandidates(candidates, {
      requiredSkills,
      minExperience,
      preferredSkills
    });

    res.json({
      success: true,
      job: {
        requiredSkills,
        minExperience,
        preferredSkills: preferredSkills || []
      },
      shortlistedCandidates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error matching candidates",
      error: error.message
    });
  }
});

app.post("/api/ai/shortlist", async (req, res) => {
  try {
    const { requiredSkills, minExperience, preferredSkills } = req.body;

    if (!requiredSkills || !Array.isArray(requiredSkills)) {
      return res.status(400).json({
        success: false,
        message: "requiredSkills must be an array"
      });
    }

    const candidates = await Candidate.find();

    if (candidates.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No candidates found"
      });
    }

    const basicRanking = matchCandidates(candidates, {
      requiredSkills,
      minExperience,
      preferredSkills
    });

    const candidateText = basicRanking
      .map(
        (candidate, index) => `
${index + 1}. ${candidate.name}
Email: ${candidate.email}
Skills: ${candidate.skills.join(", ")}
Experience: ${candidate.experience} years
Projects: ${candidate.projects || "Not provided"}
Bio: ${candidate.bio || "Not provided"}
Basic Match Score: ${candidate.matchScore}%
Matched Required Skills: ${candidate.matchedSkills.join(", ") || "None"}
Match Level: ${candidate.matchLevel}
`
      )
      .join("\n");

    const aiPrompt = `
You are an expert HR recruitment assistant.

Job Requirement:
Required Skills: ${requiredSkills.join(", ")}
Minimum Experience: ${minExperience || 0} years
Preferred Skills: ${(preferredSkills || []).join(", ") || "None"}

Candidates:
${candidateText}

Task:
1. Rank the candidates from best to worst.
2. Explain why each candidate is suitable or not suitable.
3. Mention strengths and weaknesses.
4. Suggest top 3 best-fit candidates.
5. Generate 3 interview questions for each top candidate.
6. Keep the answer clear and professional.
`;

    const aiResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
  model: "openai/gpt-4o-mini",
  max_tokens: 800,
  messages: [
    {
      role: "user",
      content: aiPrompt
    }
  ]
},
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
          "X-Title": "Candidate Shortlisting System"
        }
      }
    );

    const aiRecommendation =
      aiResponse.data?.choices?.[0]?.message?.content ||
      "AI recommendation not available.";

    res.json({
      success: true,
      basicRanking,
      aiRecommendation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error generating AI shortlist",
      error: error.response?.data || error.message
    });
  }
});

app.post("/api/candidates/:id/save-shortlisted", async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { isShortlisted: true },
      { new: true }
    );

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found"
      });
    }

    res.json({
      success: true,
      message: "Candidate saved as shortlisted",
      candidate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error saving shortlisted candidate",
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });