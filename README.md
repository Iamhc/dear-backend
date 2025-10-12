<pre>
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


</pre>
<pre>
1   initial visit - create conversation
User opens app
    ↓
Check localStorage for ID
    ↓
No ID? Request /conversation/start
    ↓
Backend generates UUID
    ↓
Insert into SQLite
    ↓
Return UUID to frontend
    ↓
Save to localStorage
    ↓
Display welcome message ✅


Diagram 2: Page Reload - Retrieve Conversation
User refreshes browser
    ↓
Get ID from localStorage
    ↓
Send GET /conversation/{id}
    ↓
Backend queries SQLite
    ↓
SELECT * FROM messages WHERE conversationId = id
    ↓
Return all previous messages
    ↓
Display chat history ✅

Diagram 3: Send Message - Save to Database
User types message
    ↓
Get conversationId from localStorage
    ↓
Send POST /chat with message + conversationId
    ↓
Backend saves user message to SQLite
    ↓
Generate AI response
    ↓
Save AI response to SQLite
    ↓
Return response to frontend
    ↓
Display in chat ✅
    
Diagram 4: Data Storage Locations
graph LR
   Browser (localStorage)
├─ conversationId: "abc-123-uuid"

Backend Server (SQLite)
├─ conversations table
│  └─ id: "abc-123-uuid", createdAt, updatedAt
│
└─ messages table
   ├─ id: "msg-1", conversationId: "abc-123-uuid", role: "user", content: "Hello"
   ├─ id: "msg-2", conversationId: "abc-123-uuid", role: "assistant", content: "Hi!"
   └─ ...more messages...

Connection:
ID in localStorage → Matches ID in SQLite → Returns all matching messages ✅

Diagram 5: What Happens When Cache is Cleared
BEFORE CLEAR:
├─ localStorage: "abc-123-uuid" ✅
└─ SQLite: All messages stored ✅

AFTER CLEAR:
├─ localStorage: DELETED ❌
└─ SQLite: Messages orphaned (can't access without ID) ❌

RESULT:
├─ New ID generated: "xyz-789-uuid"
├─ Old messages unreachable
└─ Data lost (connection broken)

   
</pre>
<pre>
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
✅ Consider adding authentication  </pre>
