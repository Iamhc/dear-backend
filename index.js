import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";
import { StateGraph, Annotation } from "@langchain/langgraph";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

// ✅ RAG Imports
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

dotenv.config();
const app = express();

app.use(cors({
  origin: "*",
  credentials: true,
}));

app.use(bodyParser.json());

const ZUKI_API_KEY = process.env.ZUKI_API_KEY;

/* =========================
   🗄️ DATABASE SETUP
========================= */
const db = new Database("conversations.db");
db.pragma("foreign_keys = ON");

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

function createConversation() {
  const id = uuidv4();
  db.prepare("INSERT INTO conversations (id) VALUES (?)").run(id);
  return id;
}

function getConversationHistory(conversationId) {
  return db.prepare(
    "SELECT role, content FROM messages WHERE conversationId = ? ORDER BY createdAt ASC"
  ).all(conversationId);
}

function saveMessage(conversationId, role, content) {
  const id = uuidv4();

  db.prepare(
    "INSERT INTO messages (id, conversationId, role, content) VALUES (?, ?, ?, ?)"
  ).run(id, conversationId, role, content);

  db.prepare(
    "UPDATE conversations SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(conversationId);
}

/* =========================
   🧠 RAG SETUP
========================= */

// Embeddings
const embeddings = new OpenAIEmbeddings({
  apiKey: ZUKI_API_KEY,
});

// Vector DB (in-memory)
const vectorStore = new MemoryVectorStore(embeddings);

// Load initial knowledge
async function loadDocs() {
  await vectorStore.addDocuments([
    { pageContent: "LangChain is used to build AI applications." },
    { pageContent: "RAG means Retrieval Augmented Generation." },
    { pageContent: "SQLite stores structured chat history persistently." }
  ]);
}

await loadDocs();

/* =========================
   🔄 LANGGRAPH SETUP
========================= */

const StateAnnotation = Annotation.Root({
  lastMessage: Annotation({ reducer: (x, y) => y }),
  conversationId: Annotation({ reducer: (x, y) => y }),
  memory: Annotation({ reducer: (x, y) => y || [] }),
  reply: Annotation({ reducer: (x, y) => y || "" }),
});

const graph = new StateGraph(StateAnnotation);

graph.addNode("user", async (state) => {
  const { lastMessage, conversationId, memory } = state;

  try {
    // ✅ Save user message
    saveMessage(conversationId, "user", lastMessage);

    /* =========================
       🔍 RAG STEP
    ========================= */
    const docs = await vectorStore.similaritySearch(lastMessage, 3);

    const context = docs.map(d => d.pageContent).join("\n");

    /* =========================
       🤖 LLM CALL
    ========================= */
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
            {
              role: "system",
              content: `You are Neo, an AI assistant. Use this context:\n${context}`,
            },
            ...memory,
            { role: "user", content: lastMessage },
          ],
        }),
      }
    );

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content || "🤖 No response.";

    // ✅ Save reply
    saveMessage(conversationId, "assistant", reply);

    return {
      reply,
      memory: [
        ...memory,
        { role: "user", content: lastMessage },
        { role: "assistant", content: reply },
      ],
      lastMessage,
      conversationId,
    };
  } catch (err) {
    console.error(err);
    return {
      reply: "Error occurred",
      memory,
      lastMessage,
      conversationId,
    };
  }
});

graph.setEntryPoint("user");
graph.setFinishPoint("user");

const compiledGraph = graph.compile();

/* =========================
   🚀 ROUTES
========================= */

app.get("/", (req, res) =>
  res.send("🤖 Neo + RAG is running!")
);

app.post("/conversation/start", (req, res) => {
  const id = createConversation();
  res.json({ conversationId: id });
});

app.post("/chat", async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message || !conversationId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const history = getConversationHistory(conversationId);

  const result = await compiledGraph.invoke({
    lastMessage: message,
    conversationId,
    memory: history,
  });

  res.json({ reply: result.reply });
});

app.get("/conversation/:id", (req, res) => {
  const history = getConversationHistory(req.params.id);
  res.json({ messages: history });
});

/* =========================
   🏁 START SERVER
========================= */

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
