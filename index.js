import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";

// Initialize dotenv first
dotenv.config();

// Initialize Express app
const app = express();

// CORS middleware
// Allow all origins (good for local dev), or restrict to frontend origin
app.use(
  cors({
    origin: ["http://localhost:3001", "https://dear-gules.vercel.app/"], // <- fixed typo 'locahost'
    methods: ["GET", "POST"],
  })
);

// Parse JSON bodies
app.use(bodyParser.json());

// Zuki API key
const ZUKI_API_KEY = process.env.ZUKI_API_KEY;

// Conversation memory
let conversation = [
  {
    role: "system",
    content: "You are Neo, a helpful and friendly AI assistant.",
  },
];

// Trim conversation memory to avoid huge requests
function trimMemory(maxTurns = 8) {
  const system = conversation[0];
  const rest = conversation.slice(-maxTurns * 2);
  conversation = [system, ...rest];
}

// Test route
app.get("/", (req, res) => res.send("🤖 Neo (Zukijourney) is running!"));

// Chat route
app.post("/chat", async (req, res) => {
  try {
    const userMsg = req.body.message;
    if (!userMsg) return res.status(400).json({ error: "message is required" });

    conversation.push({ role: "user", content: userMsg });
    trimMemory();

    const response = await fetch(
      "https://api.zukijourney.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ZUKI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: conversation,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.json({
        reply: `🤖 Zukijourney API error: ${response.status}`,
        details: errText,
      });
    }

    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content || "🤖 Sorry, no response.";
    conversation.push({ role: "assistant", content: reply });

    res.json({ reply });
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Neo (Zuki) running on port ${PORT}`));
