import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";
import { StateGraph } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

dotenv.config();
const app = express();
app.use(cors({
  origin: "*", // or your specific frontend URL
  credentials: true
}));
app.use(bodyParser.json());

const ZUKI_API_KEY = process.env.ZUKI_API_KEY;

// Initialize SQLite database
const db = new Database("conversations.db");

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversationId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
  );
`);

// Helper functions for database operations
function createConversation() {
  const conversationId = uuidv4();
  const stmt = db.prepare("INSERT INTO conversations (id) VALUES (?)");
  stmt.run(conversationId);
  return conversationId;
}

function getConversationHistory(conversationId) {
  const stmt = db.prepare(
    "SELECT role, content FROM messages WHERE conversationId = ? ORDER BY createdAt ASC"
  );
  return stmt.all(conversationId);
}

function saveMessage(conversationId, role, content) {
  const messageId = uuidv4();
  const stmt = db.prepare(
    "INSERT INTO messages (id, conversationId, role, content) VALUES (?, ?, ?, ?)"
  );
  stmt.run(messageId, conversationId, role, content);

  // Update conversation's updatedAt timestamp
  const updateStmt = db.prepare(
    "UPDATE conversations SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?"
  );
  updateStmt.run(conversationId);

  return messageId;
}

// Define state schema
const StateAnnotation = Annotation.Root({
  lastMessage: Annotation({
    reducer: (x, y) => y,
  }),
  conversationId: Annotation({
    reducer: (x, y) => y,
  }),
  memory: Annotation({
    reducer: (x, y) => y || [],
  }),
  reply: Annotation({
    reducer: (x, y) => y || "",
  }),
});

// Create the StateGraph
const graph = new StateGraph(StateAnnotation);

// Add the user node
graph.addNode("user", async (state) => {
  const userMessage = state.lastMessage;
  const conversationId = state.conversationId;
  const prevMemory = state.memory || [];

  try {
    // Save user message to database
    saveMessage(conversationId, "user", userMessage);

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
          messages: [
            { role: "system", content: "You are Neo, a helpful AI assistant." },
            ...prevMemory,
            { role: "user", content: userMessage },
          ],
        }),
      }
    );

    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content || "🤖 Sorry, no response.";

    // Save assistant reply to database
    saveMessage(conversationId, "assistant", reply);

    const updatedMemory = [
      ...prevMemory,
      { role: "user", content: userMessage },
      { role: "assistant", content: reply },
    ];

    return {
      reply,
      memory: updatedMemory,
      lastMessage: userMessage,
      conversationId,
    };
  } catch (err) {
    console.error("API Error:", err);
    saveMessage(conversationId, "assistant", "🤖 Error communicating with API");

    return {
      reply: "🤖 Error communicating with API",
      memory: prevMemory,
      lastMessage: userMessage,
      conversationId,
    };
  }
});

// Set entry and finish points
graph.setEntryPoint("user");
graph.setFinishPoint("user");

// Compile the graph
const compiledGraph = graph.compile();

app.get("/", (req, res) =>
  res.send("🤖 Neo (Zuki + LangGraph + SQLite + UUID) is running!")
);

// Start a new conversation
app.post("/conversation/start", (req, res) => {
  try {
    const conversationId = createConversation();
    res.json({ conversationId });
  } catch (err) {
    console.error("Error starting conversation:", err);
    res.status(500).json({ error: String(err) });
  }
});

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const userMsg = req.body.message;
    const conversationId = req.body.conversationId;

    if (!userMsg) return res.status(400).json({ error: "message is required" });
    if (!conversationId)
      return res.status(400).json({ error: "conversationId is required" });

    // Fetch conversation history from database
    const history = getConversationHistory(conversationId);

    const result = await compiledGraph.invoke({
      lastMessage: userMsg,
      conversationId,
      memory: history,
    });

    res.json({ reply: result.reply, conversationId });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// Get conversation history
app.get("/conversation/:conversationId", (req, res) => {
  try {
    const { conversationId } = req.params;
    const history = getConversationHistory(conversationId);
    res.json({ conversationId, messages: history });
  } catch (err) {
    console.error("Error fetching conversation:", err);
    res.status(500).json({ error: String(err) });
  }
});

// Get all conversations
app.get("/conversations", (req, res) => {
  try {
    const stmt = db.prepare(
      "SELECT id, createdAt, updatedAt FROM conversations ORDER BY updatedAt DESC"
    );
    const conversations = stmt.all();
    res.json({ conversations });
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(
    `🚀 Neo (Zuki + LangGraph + SQLite + UUID) running on port ${PORT}`
  )
);
