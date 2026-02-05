# QueryMate 🤖

A modern, powerful AI chat application that lets you interact with multiple AI providers in one place. Built with Next.js 15, featuring real-time streaming responses, voice input, file attachments, and a beautiful mobile-responsive UI.

![QueryMate UI](public/Querymate_UI.png)

## ✨ Key Features

### 🎯 Multi-AI Provider Support (10+ Models)

- **Google Gemini**: Gemini 2.5 Flash & Flash Lite - Fast and intelligent with web search
- **Perplexity AI**: Sonar & Sonar Pro - Real-time web search with citations
- **Groq**: Lightning-fast inference with Llama 3.3 70B, Llama 3.1 8B, Llama 4 Scout, Llama 4 Maverick, Qwen 3 32B, and Kimi K2
- Switch between AI models seamlessly within conversations

### 💬 Advanced Chat Features

- Real-time streaming responses with elegant typing indicators
- **🎤 Voice Input**: Speech-to-text for hands-free messaging
- **📎 File Attachments**: Upload images and PDFs (Gemini & Perplexity)
- **🔍 Web Search Toggle**: Enable/disable web search for Gemini models
- **🎨 Canvas Mode**: Live code preview with React/Tailwind rendering
- **🐍 Code Execution**: Run Python/JavaScript in secure E2B sandbox
- Markdown support with syntax-highlighted code blocks
- Conversation history with persistent storage
- Auto-generated conversation titles using AI

### 🔐 Secure Authentication

- Email/Password authentication
- OAuth support (Google & GitHub)
- JWT token-based session management
- Protected API routes with Bearer authentication

### 🎨 Modern UI/UX

- **Claude-style sidebar** with QueryMate branding
- Beautiful dark/light mode support
- **Fully mobile-responsive design**
- Collapsible user profile section
- Toast notifications for all actions
- Loading states and error handling

### 📱 Conversation Management

- Create unlimited conversations
- Update conversation titles
- Delete conversations with cascade message deletion
- **📤 Export all conversations** (JSON format)
- **📥 Import conversations** from backup
- **📄 Export to PDF** per conversation
- **📊 Analytics Dashboard** with usage statistics
- Search/filter conversations

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **Authentication**: Better Auth
- **AI Providers**:
  - Google Gemini (via @ai-sdk/google)
  - Perplexity AI (via @ai-sdk/perplexity)
  - Groq (via @ai-sdk/groq)
- **AI SDK**: Vercel AI SDK
- **Code Execution**: E2B Code Interpreter (secure sandbox)
- **UI Components**: Radix UI, Shadcn/ui
- **Styling**: Tailwind CSS
- **Markdown**: react-markdown with Shiki syntax highlighting
- **PDF Export**: jsPDF
- **Data Fetching**: SWR

## 🎯 What Makes QueryMate Special?

1. **10+ AI Models in One Place**: Switch between Google Gemini, Perplexity, and Groq models instantly
2. **🎨 Canvas Mode**: ChatGPT-style live code preview - see React components render in real-time
3. **🐍 Code Execution**: Run Python/JavaScript code in a secure E2B sandbox with instant results
4. **Real-time Streaming**: See AI responses as they're generated
5. **Voice Input**: Speak your messages with built-in speech recognition
6. **File Support**: Upload images and PDFs for AI analysis
7. **Export Everything**: JSON export, PDF export, and import functionality
8. **Mobile-First Design**: Fully responsive with optimized mobile layouts
9. **Type-Safe**: Built with TypeScript for reliable code

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
SUPABASE_DB_URL=your_supabase_db_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# --- BETTER AUTH ---
BETTER_AUTH_SECRET=your_secret_key_min_32_chars
BETTER_AUTH_URL=http://localhost:3000

# --- GOOGLE OAUTH ---
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# --- GITHUB OAUTH ---
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# --- GOOGLE GEMINI ---
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key

# --- PERPLEXITY AI ---
PERPLEXITY_API_KEY=your_perplexity_api_key

# --- GROQ ---
GROQ_API_KEY=your_groq_api_key

# --- E2B CODE EXECUTION ---
E2B_KEY=your_e2b_api_key
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
  "model": "gemini-2.5-flash",
  "useSearch": true
}
```

**Parameters:**

- `message` (required): The user's message text
- `model` (required): AI model ID (see table below)
- `conversationId` (optional): ID of existing conversation
- `useSearch` (optional): Enable web search for Gemini models

**Available Models:**

| Provider   | Model ID                | Description                |
| ---------- | ----------------------- | -------------------------- |
| Google     | `gemini-2.5-flash`      | Fast and efficient         |
| Google     | `gemini-2.5-flash-lite` | Ultra fast, cost-efficient |
| Perplexity | `sonar`                 | Web-connected AI search    |
| Perplexity | `sonar-pro`             | Advanced web-connected AI  |
| Groq       | `llama-3.3-70b`         | Versatile large model      |
| Groq       | `llama-3.1-8b`          | Fast instant responses     |
| Groq       | `llama-4-scout`         | Latest Llama 4 model       |
| Groq       | `llama-4-maverick`      | Extended context Llama 4   |
| Groq       | `qwen3-32b`             | Alibaba's Qwen model       |
| Groq       | `kimi-k2`               | Moonshot AI model          |

**Response:** Streaming text response from AI (Server-Sent Events)

## 🔑 Key Concepts

### Multi-AI Architecture

QueryMate supports three AI providers with 10+ models:

1. **Google Gemini**
   - Fast, general-purpose AI with web search
   - Supports file uploads (images, PDFs)
   - Token usage tracking
   - Models: `gemini-2.5-flash`, `gemini-2.5-flash-lite`

2. **Perplexity AI**
   - Real-time web search with citations
   - Supports file uploads
   - Models: `sonar`, `sonar-pro`

3. **Groq**
   - Lightning-fast inference (fastest in the world!)
   - Multiple open-source models
   - Models: `llama-3.3-70b`, `llama-3.1-8b`, `llama-4-scout`, `llama-4-maverick`, `qwen3-32b`, `kimi-k2`

### Voice Input

- Click the microphone button to start voice input
- Speech is transcribed in real-time
- Works on Chrome, Edge, and Safari

### File Attachments

- Click the + button → "Add File"
- Supported: Images (JPEG, PNG, GIF, WebP), PDFs
- Works with Gemini and Perplexity models
- Groq models do not support attachments

### 🎨 Canvas Mode (Live Code Preview)

Canvas mode enables ChatGPT-style live code previews directly in the chat interface:

- **Toggle Canvas**: Click the `<> Canvas` button in the input area to enable
- **Generate Code**: Ask for React components, games, tools, etc.
- **Preview Button**: Click "Preview" on any code block to see it render live
- **Split View**: Resizable panel shows preview alongside chat
- **Tabs**: Switch between Preview, Code, and Console views

**Example Prompts for Canvas:**
```
Create a calculator app with a modern dark theme
Build a Tic-Tac-Toe game with AI opponent
Design a beautiful pricing card with 3 tiers
Create an animated loading spinner using CSS
Build a Pomodoro timer with start, pause, reset
```

**How it works:**
1. Enable Canvas mode (purple `<> Canvas` button)
2. Send a prompt asking for a React component
3. AI generates complete, self-contained code with Tailwind CSS
4. Click "Preview" on the code block
5. See the component render live in the side panel

### 🐍 Code Execution (E2B Sandbox)

Run Python or JavaScript code in a secure cloud sandbox:

- **Automatic Detection**: AI uses code execution for computational tasks
- **Python Support**: Full Python 3 with common libraries
- **JavaScript Support**: Node.js runtime
- **Secure Sandbox**: Code runs in isolated E2B containers
- **Real-time Output**: See stdout, stderr, and results

**Example Prompts:**
```
Write a Python script that generates the first 20 Fibonacci numbers
Calculate the factorial of 100
Find all prime numbers between 1 and 1000
Create a Python script to sort a list using bubble sort
```

**Output Display:**
- Code is shown with syntax highlighting
- Execution results appear below the code
- Errors are clearly highlighted
- Images/charts are rendered inline

### Export/Import Features

- **Export All**: Download all conversations as JSON backup
- **Import**: Restore conversations from JSON backup
- **PDF Export**: Export individual chats as formatted PDFs

### Conversation vs Chat

- **Conversation**: A container/thread that holds multiple messages (like a WhatsApp chat)
- **Chat**: The action of sending/receiving messages within a conversation
- You can start chatting without explicitly creating a conversation - the `/api/chat` endpoint auto-creates one!
- Each conversation maintains its own history and context

### Authentication Flow

1. User signs up/signs in → Receives JWT token
2. Store token in localStorage/cookies/state
3. Include token in `Authorization: Bearer {token}` header for all API requests
4. Backend validates token and extracts user session

### Message Flow

1. **New Chat**: POST to `/api/chat` with `message` + `model` → Backend creates conversation → Returns AI response
2. **Continue Chat**: POST to `/api/chat` with `conversationId` + `message` + `model` → AI responds with full conversation context
3. **Load History**: GET `/api/messages?conversationId={id}` → Returns all messages in conversation
4. **Switch Models**: Change `model` parameter mid-conversation to get responses from different AI providers

### Streaming Responses

All AI responses use Server-Sent Events (SSE) for real-time streaming:

- Responses appear word-by-word as they're generated
- Better user experience with immediate feedback
- More efficient than waiting for complete responses

## � API Rate Limits

| Provider   | Model                 | RPM         | RPD   | TPM  |
| ---------- | --------------------- | ----------- | ----- | ---- |
| Google     | Gemini 2.5 Flash      | 5           | 20    | 250K |
| Google     | Gemini 2.5 Flash Lite | 10          | 20    | 250K |
| Groq       | Llama 3.3 70B         | 30          | 1000  | 12K  |
| Groq       | Llama 3.1 8B          | 30          | 14400 | 6K   |
| Groq       | Llama 4 Scout         | 30          | 1000  | 30K  |
| Groq       | Qwen 3 32B            | 60          | 1000  | 6K   |
| Perplexity | Sonar/Pro             | Pay-per-use | -     | -    |

## �🗂️ Database Schema

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

### Quick Testing Flow

1. **Sign Up**:

   ```
   POST /api/auth/sign-up/email
   Body: { "email": "test@example.com", "password": "password123", "name": "Test User" }
   ```

   → Copy the `token` from response

2. **Get Session** (Verify authentication):

   ```
   GET /api/auth/sessions
   Headers: Authorization: Bearer {your_token}
   ```

3. **Start New Chat with Gemini**:

   ```
   POST /api/chat
   Headers: Authorization: Bearer {your_token}
   Body: { "message": "Hello! Tell me about AI", "model": "gemini" }
   ```

4. **Try Different AI Model**:

   ```
   POST /api/chat
   Headers: Authorization: Bearer {your_token}
   Body: { "message": "What's the latest tech news?", "model": "perplexity" }
   ```

5. **Load Conversations**:

   ```
   GET /api/conversations
   Headers: Authorization: Bearer {your_token}
   ```

6. **Get Message History**:

   ```
   GET /api/messages?conversationId={conversation_id}
   Headers: Authorization: Bearer {your_token}
   ```

7. **Sign Out**:

   ```
   POST /api/auth/sign-out
   Headers: Authorization: Bearer {your_token}
   ```

> **Note**: The `/api/chat` endpoint returns streaming responses. In Postman you'll see 200 status, but the response streams over time. Check your database `messages` table to verify AI responses are saved correctly.

## 🚀 Deployment

### Environment Variables for Production

**Required:**

- `SUPABASE_DB_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Secure random string (min 32 chars)
- `BETTER_AUTH_URL`: Your production domain

**AI Providers (at least one):**

- `GOOGLE_GENERATIVE_AI_API_KEY`: For Gemini
- `PERPLEXITY_API_KEY`: For Perplexity
- `GROQ_API_KEY`: For Groq

**Optional (OAuth):**

- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`

### Deploy on Vercel

1. Fork/Clone the repository
2. Import to Vercel, add environment variables
3. Deploy!
4. Run `npx drizzle-kit push` for database

## 🎯 Use Cases

- **Developers**: Get coding help, compare AI responses
- **Researchers**: Real-time web search with Perplexity citations
- **Students**: Learn from multiple AI perspectives
- **Writers**: Generate content with different models
- **Everyone**: Fast answers with Groq's lightning inference

## 🌟 Roadmap

- [x] Voice input support
- [x] File upload and analysis
- [x] Export conversations to PDF
- [x] Export/Import conversations (JSON)
- [x] Analytics dashboard
- [x] Mobile-responsive design
- [x] Groq integration (10+ models)
- [x] Canvas mode (live code preview)
- [x] Code execution (E2B sandbox)
- [ ] Shared conversations with public links
- [ ] Custom AI parameters (temperature, max tokens)
- [ ] Team workspaces
- [ ] Plugin system

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. 🐛 **Report Bugs**: Open an issue with details
2. 💡 **Suggest Features**: Share your ideas in discussions
3. 🔧 **Submit PRs**: Fix bugs or add features
4. 📖 **Improve Docs**: Help make documentation clearer

### Development Setup for Contributors

```bash
git clone https://github.com/Jaswanth1406/QueryMate.git
npm install
cp .env.example .env.local  # Add your API keys
npx drizzle-kit push
npm run dev
```

## 📧 Support & Contact

- **GitHub**: [@Jaswanth1406](https://github.com/Jaswanth1406)
- **Issues**: [Report bugs or request features](https://github.com/Jaswanth1406/QueryMate/issues)

## 🙏 Acknowledgments

- [Vercel AI SDK](https://sdk.vercel.ai) for seamless AI integration
- [E2B](https://e2b.dev) for secure code execution sandbox
- [Better Auth](https://better-auth.com) for robust authentication
- [Drizzle ORM](https://orm.drizzle.team) for type-safe database queries
- [Radix UI](https://radix-ui.com) & [Shadcn/ui](https://ui.shadcn.com) for components
- [Tailwind CSS](https://tailwindcss.com) for styling
- [jsPDF](https://github.com/parallax/jsPDF) for PDF generation
- [Shiki](https://shiki.style) for syntax highlighting

---

<div align="center">

**Built with ❤️ by [Jaswanth1406](https://github.com/Jaswanth1406)**

If you find this project helpful, please ⭐ star the repository!

[Demo](https://querymate.vercel.app) · [Documentation](https://github.com/Jaswanth1406/QueryMate#readme) · [Report Bug](https://github.com/Jaswanth1406/QueryMate/issues)

</div>
