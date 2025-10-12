Architecture Overview
Dear AI is a full-stack conversational AI application with persistent data storage. The system consists of three main components:

Frontend: React-based chat interface with voice input
Backend: Node.js/Express server with LangGraph AI orchestration
Database: SQLite for permanent data storage

Data Persistence Explained
How It Works
When you chat with Dear AI, your conversation needs to be remembered across page reloads. Here's how the system achieves this:

FIRST VISIT FLOW:-

1. User opens app
   ↓
2. Frontend checks browser storage for conversation ID
   ↓
3. No ID found → Request backend to create new conversation
   ↓
4. Backend generates unique ID (UUID)
   ↓
5. ID stored in THREE places:
   - Frontend: localStorage (browser memory)
   - Backend: SQLite database (server disk)
   - Response: Sent back to frontend
   ↓
6. User starts chatting

After Page Reload

1. User refreshes browser
   ↓
2. Frontend retrieves ID from localStorage
   ↓
3. Frontend sends ID to backend requesting conversation history
   ↓
4. Backend queries SQLite database using the ID
   ↓
5. All previous messages returned
   ↓
6. Chat history displayed on screen ✅

UUID & SQLite

What is UUID?
UUID = Universally Unique Identifier
A 36-character random string that guarantees uniqueness:
Example: 550e8400-e29b-41d4-a716-446655440000


Why UUID?

✅ Unique across the entire world
✅ No conflicts even with multiple servers
✅ Can be generated anywhere without central database
✅ Random and unpredictable (secure)


import { v4 as uuidv4 } from "uuid";

// Each conversation gets a unique ID
const conversationId = uuidv4();
// Result: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"


What is SQLite?
SQLite = Lightweight SQL Database
A database that stores data in a single .db file on your server.
Why SQLite?

✅ No setup required (just a file)
✅ Perfect for small to medium applications
✅ Data persists on disk (not in RAM)
✅ Fast and reliable
✅ Stores structured data in tables


// Creates two tables
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,           // UUID of conversation
  createdAt DATETIME,             // When created
  updatedAt DATETIME              // Last updated
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,            // UUID of message
  conversationId TEXT,            // Links to conversation
  role TEXT,                      // "user" or "assistant"
  content TEXT,                   // Message text
  createdAt DATETIME              // When sent
);

Why Together?
Real World Analogy:

UUID = Library card number
SQLite = Library shelf with all books
Match ID → Find your books

Alternative: Cookies
Cookies offer automatic, more persistent storage.

// Backend sets cookie
res.cookie("conversationId", "abc-123", {
  maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
  httpOnly: true,                     // Secure
  secure: true,                       // HTTPS only
  sameSite: "lax"                     // CSRF protection
});

// Browser automatically stores and sends cookie
// NO manual setup needed!

// On next request, cookie sent automatically
fetch("/chat", {
  credentials: "include"  // Include cookies
  // Cookie sent automatically ✅
});

Advantages

✅ Automatic (browser sends automatically)
✅ More persistent (can survive cache clears)
✅ Secure (HTTPOnly prevents JS access)
✅ Server has control
✅ Works across devices (if server tracks)

Disadvantages

❌ Still deleted when user clears cookies
⚠️ More complex setup



initial visit - create conversation

┌─────────────────────────────────────────────────────────────┐
│                      FIRST VISIT                              │
└─────────────────────────────────────────────────────────────┘

USER OPENS APP
    │
    ↓
┌─────────────────────────────────────────┐
│  FRONTEND CHECKS localStorage           │
│  "Is there a conversationId?"           │
└─────────────────────────────────────────┘
    │
    ├─→ Found? → Skip to Load History
    │
    └─→ Not Found? ↓
        │
        ↓
    ┌─────────────────────────────────────────────────────────┐
    │  FRONTEND REQUESTS: POST /conversation/start            │
    └─────────────────────────────────────────────────────────┘
        │
        ↓
    ┌─────────────────────────────────────────────────────────┐
    │  BACKEND CREATES NEW CONVERSATION                       │
    │  • Generate UUID: "abc-123-uuid"                        │
    │  • Insert into SQLite: conversations table              │
    │  • Return UUID to frontend                             │
    └─────────────────────────────────────────────────────────┘
        │
        ↓
    ┌─────────────────────────────────────────────────────────┐
    │  FRONTEND RECEIVES UUID                                 │
    │  • Store in localStorage: "abc-123-uuid"               │
    │  • Store in memory (React state)                        │
    │  • Send to Load History function                        │
    └─────────────────────────────────────────────────────────┘


Diagram 2: Page Reload - Retrieve Conversation


 ┌─────────────────────────────────────────────────────────────┐
│                   PAGE RELOAD                                 │
└─────────────────────────────────────────────────────────────┘

USER REFRESHES BROWSER
    │
    ↓
┌─────────────────────────────────────────┐
│  FRONTEND CHECKS localStorage           │
│  "Is there a conversationId?"           │
└─────────────────────────────────────────┘
    │
    └─→ FOUND: "abc-123-uuid" ✅
        │
        ↓
    ┌─────────────────────────────────────────────────────────┐
    │  FRONTEND REQUESTS:                                     │
    │  GET /conversation/abc-123-uuid                         │
    └─────────────────────────────────────────────────────────┘
        │
        ↓
    ┌─────────────────────────────────────────────────────────┐
    │  BACKEND QUERIES SQLite                                 │
    │  SELECT * FROM messages                                 │
    │  WHERE conversationId = "abc-123-uuid"                  │
    │                                                          │
    │  Result: [                                              │
    │    {role: "user", content: "Hello"},                    │
    │    {role: "assistant", content: "Hi there!"},          │
    │    ...                                                   │
    │  ]                                                       │
    └─────────────────────────────────────────────────────────┘
        │
        ↓
    ┌─────────────────────────────────────────────────────────┐
    │  FRONTEND RECEIVES MESSAGES                             │
    │  • Display all previous messages                        │
    │  • Chat history restored ✅                             │
    └─────────────────────────────────────────────────────────┘



Diagram 3: Send Message - Save to Database

  ┌─────────────────────────────────────────────────────────────┐
│              USER SENDS MESSAGE                               │
└─────────────────────────────────────────────────────────────┘

USER TYPES: "Hello Dear" + SEND
    │
    ↓
┌─────────────────────────────────────────┐
│  FRONTEND                               │
│  • Get message from input field         │
│  • Get conversationId from localStorage │
│  • Prepare payload                      │
└─────────────────────────────────────────┘
    │
    ↓
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND SENDS:                                            │
│  POST /chat                                                 │
│  {                                                          │
│    message: "Hello Dear",                                   │
│    conversationId: "abc-123-uuid"                           │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
    │
    ↓
┌─────────────────────────────────────────────────────────────┐
│  BACKEND RECEIVES REQUEST                                   │
│  1. Extract conversationId: "abc-123-uuid"                  │
│  2. Extract message: "Hello Dear"                           │
│  3. Query SQLite for previous messages (for context)        │
└─────────────────────────────────────────────────────────────┘
    │
    ↓
┌─────────────────────────────────────────────────────────────┐
│  BACKEND SAVES USER MESSAGE                                 │
│  INSERT INTO messages:                                      │
│  {                                                          │
│    id: "msg-uuid-1",                                        │
│    conversationId: "abc-123-uuid",  ← LINK TO CONVERSATION  │
│    role: "user",                                            │
│    content: "Hello Dear",                                   │
│    createdAt: current_timestamp                             │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
    │
    ↓
┌─────────────────────────────────────────────────────────────┐
│  AI GENERATES RESPONSE                                      │
│  (Using context from previous messages)                     │
│  Response: "Hi! How can I help you today?"                  │
└─────────────────────────────────────────────────────────────┘
    │
    ↓
┌─────────────────────────────────────────────────────────────┐
│  BACKEND SAVES AI RESPONSE                                  │
│  INSERT INTO messages:                                      │
│  {                                                          │
│    id: "msg-uuid-2",                                        │
│    conversationId: "abc-123-uuid",  ← SAME CONVERSATION ID  │
│    role: "assistant",                                       │
│    content: "Hi! How can I help you today?",               │
│    createdAt: current_timestamp                             │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
    │
    ↓
┌─────────────────────────────────────────┐
│  FRONTEND DISPLAYS                      │
│  • User message in chat                 │
│  • AI response in chat                  │
│  • Both now in database ✅              │
└─────────────────────────────────────────┘


    
        │
        ↓
    DISPLAY WELCOME MESSAGE ✅




Diagram 4: Data Storage Locations


┌──────────────────────────────────────────────────────────────────┐
│                     DATA STORAGE OVERVIEW                         │
└──────────────────────────────────────────────────────────────────┘

                          USER'S BROWSER
                                │
                    ┌───────────┴───────────┐
                    │                       │
              ┌─────────────┐          ┌──────────┐
              │ localStorage│          │   RAM    │
              │             │          │          │
              │ Key: "conv- │          │ React    │
              │ Id123"      │          │ State    │
              │             │          │          │
              │ Value:      │          │ Messages │
              │ abc-123-... │          │ UI data  │
              └─────────────┘          └──────────┘


                    BACKEND SERVER (dear-backend.onrender.com)
                                │
                    ┌───────────┴────────────┐
                    │                        │
                ┌──────────────┐        ┌─────────────┐
                │ SQLite DB    │        │   Memory    │
                │              │        │  (Variables)│
                │conversations│        │             │
                │   table      │        │ API keys,   │
                │              │        │ Config      │
                ├──────────────┤        └─────────────┘
                │ id: abc-123  │
                │ created_at   │
                │ updated_at   │
                └──────────────┘
                        │
                ┌───────┴─────────┐
                │                 │
            ┌───────────────┐  ┌──────────────┐
            │  messages     │  │  messages    │
            │   table       │  │   table      │
            │               │  │              │
            │ id: msg-1     │  │ id: msg-2    │
            │ convId: abc   │  │ convId: abc  │
            │ role: user    │  │ role: asst   │
            │ content: "Hi" │  │ content: ... │
            └───────────────┘  └──────────────┘


CONNECTION FLOW:
├─ Browser (localStorage) has KEY: "abc-123-uuid"
│
├─ KEY sent to Backend with each request
│
├─ Backend uses KEY to query SQLite
│
└─ All messages with matching KEY returned
   (and KEY becomes conversationId foreign key)



Diagram 5: What Happens When Cache is Cleared


┌──────────────────────────────────────────────────────────────────┐
│             CACHE CLEAR SCENARIO                                  │
└──────────────────────────────────────────────────────────────────┘

BEFORE CLEAR:
┌─ Browser localStorage: "abc-123-uuid" ✅
├─ SQLite Database: All messages stored ✅
└─ User can access everything ✅


USER: Browser Settings → Clear Cache/Cookies


AFTER CLEAR:
┌─ Browser localStorage: DELETED ❌
├─ SQLite Database: All messages STILL THERE ✅ (but orphaned)
└─ Problem: Can't match old messages without KEY


RESULT:
┌─ User refreshes page
├─ No localStorage ID found
├─ NEW conversationId generated: "xyz-789-uuid"
├─ OLD messages unreachable (different ID)
└─ Effectively: ❌ DATA LOST (connection broken)


OLD DATA STATUS:
├─ Still exists on server: ✅ YES
├─ Can be retrieved: ❌ NO (without matching ID)
├─ Accessible after login: ⚠️ DEPENDS (on login system)
└─ Lost permanently: ⚠️ UNLESS RECOVERED


Troubleshooting
"Failed to initialize conversation"

✅ Check backend is running
✅ Verify CORS configuration
✅ Check API_URL matches backend URL

Messages not persisting

✅ Verify SQLite database exists
✅ Check conversationId is being saved
✅ Verify database queries

Cache cleared, data lost

✅ Expected behavior (use login system for prevention)
✅ Consider adding authentication
