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
1   initial visit - create conversation

graph TD
    A["User Opens App"] --> B["Frontend checks localStorage"]
    B --> C{Conversation ID found?}
    C -->|Yes| D["Load from localStorage"]
    C -->|No| E["POST /conversation/start"]
    E --> F["Backend generates UUID"]
    F --> G["Insert into SQLite conversations table"]
    G --> H["Return UUID to frontend"]
    H --> I["Store in localStorage"]
    I --> J["Store in React state"]
    J --> K["Display Welcome Message ✅"]
    D --> K


Diagram 2: Page Reload - Retrieve Conversation
graph TD
    A["User Refreshes Browser"] --> B["Frontend checks localStorage"]
    B --> C["Retrieve conversationId"]
    C --> D["GET /conversation/conversationId"]
    D --> E["Backend queries SQLite"]
    E --> F["SELECT * FROM messages<br/>WHERE conversationId = ?"]
    F --> G["Return all previous messages"]
    G --> H["Frontend displays chat history ✅"]

Diagram 3: Send Message - Save to Database
graph TD
    A["User types message"] --> B["Click Send"]
    B --> C["Prepare payload:<br/>message + conversationId"]
    C --> D["POST /chat"]
    D --> E["Backend receives request"]
    E --> F["Extract conversationId from body"]
    F --> G["Query previous messages for context"]
    G --> H["Save user message to SQLite"]
    H --> I["Generate AI response"]
    I --> J["Save AI response to SQLite"]
    J --> K["Return response to frontend"]
    K --> L["Display in chat ✅"]
    
Diagram 4: Data Storage Locations
graph LR
    A["Before Clear"] --> B["localStorage: abc-123 ✅<br/>SQLite: All messages ✅"]
    
    B --> C["User clears browser cache"]
    
    C --> D["After Clear"]
    D --> E["localStorage: DELETED ❌<br/>SQLite: Messages ORPHANED ⚠️"]
    
    E --> F["New conversation created<br/>New ID: xyz-789"]
    
    F --> G["Old messages unreachable<br/>DATA LOST 🔴"]
    
    style B fill:#90EE90
    style E fill:#FFB6C6
    style G fill:#FF6B6B


Diagram 5: What Happens When Cache is Cleared

graph TD
    A["User Creates Account"] --> B["Email + Password stored"]
    B --> C["User logs in"]
    C --> D["Backend verifies credentials"]
    D --> E["Create JWT token"]
    E --> F["Link all conversations to userId"]
    F --> G["User chats"]
    G --> H["Conversation linked to userId"]
    H --> I["User clears cache"]
    I --> J["User logs back in"]
    J --> K["Retrieve all conversations for user"]
    K --> L["Data NEVER lost ✅"]
    
    style L fill:#90EE90
USER: Browser Settings → Clear Cache/Cookies

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
