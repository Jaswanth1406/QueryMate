# QueryMate 🤖

A modern AI-powered chat application built with Next.js, featuring secure authentication, conversation management, and Google Gemini AI integration.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **Authentication**: Better Auth
- **AI Model**: Google Gemini (gemini-1.5-flash-latest)
- **AI SDK**: Vercel AI SDK

## 📋 Features

- ✅ Email/Password Authentication with Better Auth
- ✅ OAuth Support (Google, GitHub)
- ✅ Real-time AI Chat powered by Google Gemini
- ✅ Conversation Management (Create, List, History)
- ✅ Message History Storage
- ✅ Auto-conversation Creation
- ✅ Bearer Token Authentication for REST APIs
- ✅ Secure Session Management

## 🛠️ Installation

### Prerequisites

- Node.js 20+ installed
- PostgreSQL database (Supabase account recommended)
- Google AI API key
- (Optional) GitHub & Google OAuth credentials

### Setup Steps

1. **Clone the repository**

```bash
git clone https://github.com/Jaswanth1406/QueryMate.git
cd QueryMate/querymate
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create `.env.local` file in the project root:

```env
# --- SUPABASE ---
SUPABASE_DB_URL=xxxx
NEXT_PUBLIC_SUPABASE_URL=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx

# --- BETTER AUTH ---
BETTER_AUTH_SECRET=xxxx

# --- GOOGLE OAUTH ---
GOOGLE_CLIENT_ID=xxxx
GOOGLE_CLIENT_SECRET=xxxx

# --- GITHUB OAUTH ---
GITHUB_CLIENT_ID=xxxx
GITHUB_CLIENT_SECRET=xxxx

# --- AWS BEDROCK ---
AWS_ACCESS_KEY_ID=xxxx
AWS_SECRET_ACCESS_KEY=xxxx
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# --- GOOGLE GEMINI ---
GOOGLE_API_KEY=xxxx
GEMINI_MODEL=gemini-2.5-flash

```

4. **Push database schema**

```bash
npx drizzle-kit push
```

5. **Run development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📚 API Documentation

### Authentication Endpoints

#### Sign Up

```http
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Sign In

```http
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Get Current Session

```http
GET /api/auth/sessions
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response:**

```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "id": "session_456",
    "expiresAt": "2025-12-25T00:00:00.000Z"
  }
}
```

#### Sign Out

```http
POST /api/auth/sign-out
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Response:**

```json
{
  "success": true
}
```

### Conversation Endpoints

#### Create New Conversation

```http
POST /api/conversations
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "title": "My Chat About AI"
}
```

**Response:**

```json
{
  "conversation": {
    "id": "conv_789",
    "userId": "user_123",
    "title": "My Chat About AI",
    "createdAt": "2025-11-25T10:00:00.000Z"
  }
}
```

#### Get All Conversations

```http
GET /api/conversations
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response:**

```json
{
  "conversations": [
    {
      "id": "conv_789",
      "userId": "user_123",
      "title": "My Chat About AI",
      "createdAt": "2025-11-25T10:00:00.000Z",
      "updatedAt": "2025-11-25T10:00:00.000Z"
    }
  ]
}
```

#### Update Conversation Title

```http
PUT /api/conversations
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "id": "conv_789",
  "title": "Updated Title"
}
```

**Response:**

```json
{
  "conversation": {
    "id": "conv_789",
    "userId": "user_123",
    "title": "Updated Title",
    "createdAt": "2025-11-25T10:00:00.000Z",
    "updatedAt": "2025-11-25T10:30:00.000Z"
  }
}
```

#### Delete Conversation

```http
DELETE /api/conversations
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "id": "conv_789"
}
```

**Response:**

```json
{
  "message": "Conversation & messages deleted"
}
```

> **Note**: Deleting a conversation will also delete all associated messages. This action cannot be undone.

### Message Endpoints

#### Get Messages for a Conversation

```http
GET /api/messages?conversationId=conv_789
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response:**

```json
{
  "messages": [
    {
      "id": "msg_001",
      "conversationId": "conv_789",
      "role": "user",
      "content": "Hello, what is AI?",
      "createdAt": "2025-11-25T10:00:00.000Z"
    },
    {
      "id": "msg_002",
      "conversationId": "conv_789",
      "role": "assistant",
      "content": "AI stands for Artificial Intelligence...",
      "createdAt": "2025-11-25T10:00:05.000Z"
    }
  ]
}
```

### Chat Endpoint

#### Send Message & Get AI Response

```http
POST /api/chat
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "message": "What is machine learning?",
  "conversationId": "conv_789",
  "title": "ML Discussion"
}
```

**Parameters:**

- `message` (required): The user's message text
- `conversationId` (optional): ID of existing conversation. If omitted, creates new conversation
- `title` (optional): Title for new conversation (only used when conversationId not provided)

**Response:** Streaming text response from AI (Server-Sent Events)

> **Note**: The `/api/chat` endpoint returns streaming responses. For testing in Postman, you'll see status 200 but the response body streams over time. Check the database `messages` table to verify AI responses are saved.

## 🎨 Frontend Integration Guide

### Setup Authentication

```javascript
// Sign up new user
async function signUp(email, password, name) {
  const response = await fetch('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  const data = await response.json();
  
  // Save token to localStorage or state management
  localStorage.setItem('token', data.token);
  return data;
}

// Sign in existing user
async function signIn(email, password) {
  const response = await fetch('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  
  localStorage.setItem('token', data.token);
  return data;
}

// Get current user session
async function getCurrentUser(token) {
  const response = await fetch('/api/auth/sessions', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}

// Sign out user
async function signOut(token) {
  const response = await fetch('/api/auth/sign-out', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  // Clear token from storage
  localStorage.removeItem('token');
  
  return await response.json();
}
```

### Load User's Conversations (Sidebar)

```javascript
async function getConversations(token) {
  const response = await fetch('/api/conversations', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  
  // data.conversations = [{ id, title, createdAt }, ...]
  return data.conversations;
}
```

### Update Conversation Title

```javascript
async function updateConversationTitle(token, conversationId, newTitle) {
  const response = await fetch('/api/conversations', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: conversationId,
      title: newTitle
    })
  });
  const data = await response.json();
  
  return data.conversation;
}
```

### Delete Conversation

```javascript
async function deleteConversation(token, conversationId) {
  const response = await fetch('/api/conversations', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: conversationId
    })
  });
  const data = await response.json();
  
  // data.message = "Conversation & messages deleted"
  return data;
}
```

### Start New Chat

```javascript
// When user types first message in new chat
async function startNewChat(token, userMessage, chatTitle = "New Chat") {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: userMessage,
      title: chatTitle
    })
  });
  
  // Response is streaming, but conversationId is returned
  // Save this conversationId for subsequent messages
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  let conversationId = null;
  let aiResponse = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
  
    const text = decoder.decode(value);
    aiResponse += text;
  
    // Update UI with streaming response
    updateChatUI(text);
  }
  
  return { conversationId, aiResponse };
}
```

### Continue Existing Chat

```javascript
// When user sends message in existing conversation
async function sendMessage(token, conversationId, userMessage) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversationId: conversationId, // Pass existing conversation ID
      message: userMessage
    })
  });
  
  // Handle streaming response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let aiResponse = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
  
    const text = decoder.decode(value);
    aiResponse += text;
    updateChatUI(text);
  }
  
  return aiResponse;
}
```

### Load Chat History

```javascript
// When user clicks a conversation from sidebar
async function loadChatHistory(token, conversationId) {
  const response = await fetch(
    `/api/messages?conversationId=${conversationId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const data = await response.json();
  
  // data.messages = [{ role: 'user'|'assistant', content, createdAt }, ...]
  return data.messages;
}
```

### Complete React Example

```jsx
import { useState, useEffect } from 'react';

function ChatApp() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [user, setUser] = useState(null);
  // Load conversations and user on mount
  useEffect(() => {
    if (token) {
      loadConversations();
      loadUser();
    }
  }, [token]);

  async function loadUser() {
    const response = await fetch('/api/auth/sessions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setUser(data.user);
  }
  }, [token]);

  async function loadConversations() {
    const response = await fetch('/api/conversations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setConversations(data.conversations);
  }

  async function loadMessages(conversationId) {
    const response = await fetch(
      `/api/messages?conversationId=${conversationId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const data = await response.json();
    setMessages(data.messages);
    setCurrentConversationId(conversationId);
  }

  async function deleteConversation(conversationId) {
    const response = await fetch('/api/conversations', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: conversationId })
    });
    
    if (response.ok) {
      // Remove from UI
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      // Clear messages if deleting current conversation
      if (currentConversationId === conversationId) {
        setMessages([]);
        setCurrentConversationId(null);
      }
    }
  }

  async function updateTitle(conversationId, newTitle) {
    const response = await fetch('/api/conversations', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: conversationId, title: newTitle })
    });
    
    if (response.ok) {
      const data = await response.json();
      setConversations(prev => 
        prev.map(c => c.id === conversationId ? data.conversation : c)
      );
    }
  }

  async function sendMessage() {
    if (!inputMessage.trim()) return;

    // Add user message to UI immediately
    const userMsg = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMsg]);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversationId: currentConversationId,
        message: inputMessage,
        title: currentConversationId ? undefined : 'New Chat'
      })
    });

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
  
      const chunk = decoder.decode(value);
      aiResponse += chunk;
  
      // Update AI message in real-time
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
    
        if (lastMsg?.role === 'assistant') {
          lastMsg.content = aiResponse;
        } else {
          newMessages.push({ role: 'assistant', content: aiResponse });
        }
    
    }
  }

  async function handleSignOut() {
    await fetch('/api/auth/sign-out', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Clear state and redirect to login
    localStorage.removeItem('token');
    setToken(null);
    setConversations([]);
    setMessages([]);
    setCurrentConversationId(null);
    setUser(null);
  }

  return (
    <div className="chat-app">
      {/* Sidebar with conversations */}
      <aside>
        <div className="user-info">
          {user && (
            <>
              <span>{user.name || user.email}</span>
              <button onClick={handleSignOut}>Sign Out</button>
            </>
          )}
        </div>
        
        {conversations.map(conv => (
          <div key={conv.id} className="conversation-item">
            <span onClick={() => loadMessages(conv.id)}>
              {conv.title}
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const newTitle = prompt('Enter new title:', conv.title);
                if (newTitle) updateTitle(conv.id, newTitle);
              }}
            >
              ✏️
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this conversation?')) {
                  deleteConversation(conv.id);
                }
              }}
            >
              🗑️
            </button>
          </div>
        ))}
      </aside>
    <div className="chat-app">
      {/* Sidebar with conversations */}
      <aside>
        {conversations.map(conv => (
          <div key={conv.id} onClick={() => loadMessages(conv.id)}>
            {conv.title}
          </div>
        ))}
      </aside>

      {/* Chat area */}
      <main>
        <div className="messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={msg.role}>
              {msg.content}
            </div>
          ))}
        </div>
    
        <input
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
      </main>
    </div>
  );
}
```

## 🔑 Key Concepts

### Conversation vs Chat

- **Conversation**: A container/thread that holds multiple messages (like a WhatsApp chat)
- **Chat**: The action of sending/receiving messages within a conversation
- You can start chatting without explicitly creating a conversation - the `/api/chat` endpoint auto-creates one!

### Authentication Flow

1. User signs up/signs in → Receives JWT token
2. Store token in localStorage/cookies/state
3. Include token in `Authorization: Bearer {token}` header for all API requests
4. Backend validates token and extracts user session

### Message Flow

1. **New Chat**: POST to `/api/chat` with just `message` → Backend creates conversation → Returns AI response + conversationId
2. **Continue Chat**: POST to `/api/chat` with `conversationId` + `message` → AI responds with context
3. **Load History**: GET `/api/messages?conversationId={id}` → Returns all messages in conversation

## 🗂️ Database Schema

```
user
├── id (text, primary key)
├── name (text)
├── email (text, unique)
├── emailVerified (boolean)
└── timestamps
1. **Sign Up**: POST to `/api/auth/sign-up/email` → Save token
2. **Get Session**: GET `/api/auth/sessions` with Bearer token
3. **Create Conversation**: POST to `/api/conversations` with Bearer token
4. **Send Message**: POST to `/api/chat` with Bearer token and message
5. **Load Messages**: GET `/api/messages?conversationId=...` with Bearer token
6. **Sign Out**: POST to `/api/auth/sign-out` with Bearer token
├── expiresAt (timestamp)
└── metadata (ipAddress, userAgent)

conversations
├── id (text, primary key)
├── userId (text, foreign key → user.id)
├── title (text)
└── timestamps

messages
├── id (text, primary key)
├── conversationId (text, foreign key → conversations.id)
├── role (text: 'user' | 'assistant')
├── content (text)
└── createdAt (timestamp)
```

## 🧪 Testing with Postman

1. **Sign Up**: POST to `/api/auth/sign-up/email` → Save token
2. **Get Session**: GET `/api/auth/sessions` with Bearer token
3. **Create Conversation**: POST to `/api/conversations` with Bearer token
4. **Send Message**: POST to `/api/chat` with Bearer token and message
5. **Load Messages**: GET `/api/messages?conversationId=...` with Bearer token

> **Note**: The chat endpoint returns streaming responses. In Postman you'll see 200 status, but the response streams over time. Check your database to verify messages are saved.

## 🚀 Deployment

### Environment Variables for Production

Ensure these are set in your hosting platform (Vercel, Railway, etc.):

- `DATABASE_URL`: Your production PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Secure random string (min 32 characters)
- `BETTER_AUTH_URL`: Your production domain (e.g., https://querymate.com)
- `GOOGLE_GENERATIVE_AI_API_KEY`: Google AI API key
- OAuth credentials (if using social login)

### Deploy on Vercel

```bash
npm run build
vercel deploy
```

Or connect your GitHub repo to Vercel for automatic deployments.

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, reach out to [Jaswanth1406](https://github.com/Jaswanth1406).
