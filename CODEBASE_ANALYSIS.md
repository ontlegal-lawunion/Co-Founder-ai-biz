# Codebase Analysis: AI ADHD Coach - Gemini Live Voice Assistant

## 📋 Project Overview

**Name:** AI ADHD Coach / Gemini Live Audio Template  
**Type:** Real-time voice conversation web application  
**Technology Stack:** React 18 + TypeScript + Vite (Frontend), Node.js + Express (Backend), Google Gemini 2.0 Live API  
**Status:** Production Ready ✅

This is a full-stack real-time voice conversation application that uses Google's Gemini 2.0 Live API to provide an interactive ADHD coaching assistant. Users can speak naturally, and the AI responds with real-time audio and transcriptions.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ App.tsx - Main component managing session lifecycle    │ │
│  │ Components: Controls, StatusIndicator, AudioVisualizer│ │
│  │ Utils: audioUtils, voiceActivityDetection            │ │
│  └────────────────────────────────────────────────────────┘ │
│                              ↕ WebSocket (localhost:8080)
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Audio Input (Mic → 16kHz PCM) & Output (24kHz Audio) │ │
│  │  Voice Activity Detection (barge-in detection)        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               BACKEND (Node.js + Express + WS)              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ index.ts - WebSocket server managing client sessions  │ │
│  │ - Handles multiple concurrent WebSocket connections   │ │
│  │ - Manages Gemini Live API session per client          │ │
│  │ - PCM audio encoding/decoding                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                              ↕ Gemini Live API
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Google Gemini 2.0 Live (gemini-2.5-flash-native)    │ │
│  │  - Real-time audio streaming                          │ │
│  │  - Live transcription (input & output)                │ │
│  │  - Voice synthesis ("Zephyr" voice)                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
.
├── README.md                          # Quick start guide & architecture
├── ROADMAP.md                         # Feature roadmap & completion status
├── CODEBASE_ANALYSIS.md              # This file
│
├── backend/
│   ├── package.json                   # Node.js dependencies
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── src/
│   │   └── index.ts                   # Main backend server
│   └── prompts/
│       ├── adhd-coach.txt             # Default system prompt
│       └── adhd-coach-detailed.txt    # Extended system prompt
│
└── frontend/
    ├── package.json                   # React dependencies
    ├── tsconfig.json                  # TypeScript configuration
    ├── vite.config.ts                 # Vite build config
    ├── tailwind.config.js             # Tailwind CSS config
    ├── postcss.config.js              # PostCSS config
    ├── index.html                     # Entry HTML file
    └── src/
        ├── index.tsx                  # React entry point
        ├── App.tsx                    # Main application component
        ├── types.ts                   # TypeScript type definitions
        ├── index.css                  # Global styles
        ├── components/                # React components
        │   ├── AudioVisualizer.tsx    # Real-time audio visualization
        │   ├── Controls.tsx           # Start/Stop microphone button
        │   ├── ConversationMessage.tsx # Message display component
        │   ├── ErrorBoundary.tsx      # React error boundary
        │   ├── Icons.tsx              # Icon components
        │   ├── Spinner.tsx            # Loading spinner
        │   └── StatusIndicator.tsx    # Connection status display
        └── utils/                     # Utility functions
            ├── audioUtils.ts          # Audio encoding/decoding
            └── voiceActivityDetection.ts # VAD for barge-in detection
```

---

## 🔄 Data Flow

### 1. **Session Initialization**
```
1. User clicks microphone button → handleStartSession()
2. Browser requests microphone permissions
3. Creates WebSocket connection to backend (ws://localhost:8080)
4. Backend accepts connection → initializes Gemini Live session
5. Gemini session opens → sends 'session_ready' message to frontend
6. Frontend transitions to ACTIVE state
```

### 2. **Audio Input Flow**
```
Microphone → MediaStream
    ↓
16kHz PCM Audio Context
    ↓
ScriptProcessor (4096 sample chunks)
    ↓
Binary PCM data
    ↓
WebSocket → Backend
    ↓
Backend encodes to base64
    ↓
Gemini Live API (sendRealtimeInput)
```

### 3. **Audio Output Flow**
```
Gemini Live API
    ↓
Backend receives audio chunks (base64 encoded)
    ↓
WebSocket → Frontend (JSON: {type: 'audio', audio: base64})
    ↓
Frontend decodes base64 → PCM data
    ↓
Decode to 24kHz AudioBuffer
    ↓
AudioBufferSourceNode queued with timing
    ↓
Speaker output
```

### 4. **Transcription Flow**
```
Gemini Live API
    ↓
Backend extracts inputAudioTranscription & outputAudioTranscription
    ↓
WebSocket → Frontend (JSON: {type: 'transcription', who: 'user|ai', text: '...'})
    ↓
Frontend accumulates interim transcript
    ↓
On turn_complete → moves to final transcript display
```

### 5. **Barge-In (Interruption) Flow**
```
User starts speaking while AI is speaking
    ↓
Voice Activity Detection (VAD) triggers
    ↓
handleBargeIn() called
    ↓
1. Sets isBargeInActiveRef.current = true (blocks new audio chunks)
2. Stops all playing AudioBufferSourceNodes
3. Suspends output AudioContext
4. Sends interrupt signal to backend
    ↓
Frontend remains in VAD "cooldown" for 500ms
    ↓
VAD resets, ready for next AI response
```

---

## 🔑 Key Components

### **Frontend**

#### `App.tsx` (455 lines)
**Purpose:** Main React component orchestrating the entire application flow

**Key Features:**
- Session state management (IDLE, CONNECTING, ACTIVE, ERROR)
- WebSocket connection lifecycle
- Audio context management (input @ 16kHz, output @ 24kHz)
- VAD (Voice Activity Detection) for barge-in
- Retry logic (max 3 attempts with 2s delay)
- Audio playback with queue management
- Transcription handling

**Key Hooks & Refs:**
- `sessionState` - Current connection state
- `transcript` - Final messages
- `interimTranscript` - Real-time typing effect
- `wsRef` - WebSocket reference
- `inputAudioContextRef` / `outputAudioContextRef` - Audio contexts
- `vadRef` - Voice Activity Detector
- `isBargeInActiveRef` - Barge-in state flag

**Critical Functions:**
- `handleStartSession()` - Initialize WebSocket & audio streams
- `handleStopSession()` - Clean up all resources
- `handleRetry()` - Exponential backoff reconnection
- `playAudioChunk()` - Queue audio for playback
- `handleBargeIn()` - Emergency interrupt & audio stop

#### `Components/`
- **Controls.tsx** - Microphone button with loading state
- **StatusIndicator.tsx** - Connection status badge
- **ConversationMessage.tsx** - Message display with sender role
- **AudioVisualizer.tsx** - Real-time frequency bars visualization
- **ErrorBoundary.tsx** - Catches React errors with reload button
- **Spinner.tsx** - Loading animation
- **Icons.tsx** - SVG icons (mic, stop, check)

#### `Utils/`
- **audioUtils.ts**
  - `prepareAudioChunk()` - Convert Float32 to 16-bit PCM
  - `decode()` - Base64 → Uint8Array
  - `decodeAudioData()` - PCM → AudioBuffer

- **voiceActivityDetection.ts**
  - `VoiceActivityDetector` class
  - Real-time frequency analysis
  - Threshold-based voice detection
  - Energy level tracking

#### `types.ts`
```typescript
interface Message {
  sender: 'user' | 'ai';
  text: string;
}

enum SessionState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR',
}
```

### **Backend**

#### `index.ts` (413 lines)
**Purpose:** Express + WebSocket server managing Gemini Live API sessions

**Key Features:**
- WebSocket server on port 8080
- One Gemini Live session per connected WebSocket client
- Session timeout (5 minutes inactivity)
- Audio encoding/decoding (base64 ↔ PCM)
- Error handling with retry flags
- Graceful shutdown with SIGTERM/SIGINT
- Health check endpoint (`/health`)
- System prompt loading from file

**Key Data Structures:**
```typescript
sessions: Map<WebSocket, LiveSession>           // Active Gemini sessions
sessionTimeouts: Map<WebSocket, NodeJS.Timeout> // Inactivity timers

interface Blob {
  data: string;        // base64 encoded
  mimeType: string;    // 'audio/pcm;rate=16000'
}

type LiveSession = Awaited<ReturnType<typeof ai.live.connect>>;
```

**Key Functions:**
- `setSessionTimeout(ws)` - Reset 5-min inactivity timer
- `clearSessionTimeout(ws)` - Clear timer
- `encode(bytes)` - Buffer → base64
- WebSocket message handler - Routes JSON vs binary

**Gemini Configuration:**
```typescript
{
  model: 'gemini-2.5-flash-native-audio-preview-09-2025',
  config: {
    responseModalities: [Modality.AUDIO],
    inputAudioTranscription: {},      // Live user transcription
    outputAudioTranscription: {},     // Live AI transcription
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: 'Zephyr'         // AI voice
        }
      }
    },
    systemInstruction: systemPrompt   // From file
  }
}
```

**Message Types:**

Frontend → Backend:
- Binary PCM audio (streamed continuously)
- `{type: 'interrupt'}` - Interrupt signal

Backend → Frontend:
- `{type: 'session_ready'}` - Connection established
- `{type: 'audio', audio: '...base64...'}` - Audio chunk
- `{type: 'transcription', who: 'user'|'ai', text: '...'}` - Transcription
- `{type: 'turn_complete'}` - Message exchange complete
- `{type: 'interrupted'}` - Server-side interruption detected
- `{type: 'error', message: '...', canRetry: boolean}` - Error occurred

---

## 🎯 Key Features & Implementation Details

### 1. **Real-Time Bidirectional Audio**
- **Input:** Browser captures microphone, converts to 16kHz PCM, sends continuously
- **Output:** Gemini sends 24kHz PCM chunks, frontend plays sequentially with timing sync
- **Timing:** `nextStartTimeRef` tracks cumulative duration to queue chunks correctly

### 2. **Live Transcription**
- Separate input & output transcription streams
- User text accumulates in interim, finalized on turn_complete
- AI text shows real-time typing effect in UI

### 3. **Voice Activity Detection (Barge-In)**
- Uses frequency analysis on audio buffer
- Triggers interrupt when user speaks while AI is speaking
- Ultra-responsive (80ms threshold, 20ms check interval)
- Blocks new audio chunks from playing after interruption

### 4. **Error Handling & Retry Logic**
- **Exponential Backoff:** 3 attempts, 2 second delay
- **Session Timeout:** 5-minute inactivity timeout on backend
- **Connection Recovery:** Auto-reconnect on unexpected close
- **Error Messages:** Retryable vs non-retryable error types

### 5. **Session Management**
- One WebSocket per client
- One Gemini Live session per WebSocket
- Timeout resets on every audio message
- Graceful cleanup on disconnect

### 6. **Audio Visualization**
- Real-time frequency bars based on input audio
- Uses AnalyserNode for frequency data
- Gradient coloring for visual appeal

### 7. **System Prompt Customization**
- Loads from file (`prompts/adhd-coach.txt`)
- Fallback default if file missing
- Environment variable `PROMPT_FILE` to select different prompts

---

## 🔧 Configuration & Environment

### Backend Environment Variables
```env
API_KEY=your_gemini_api_key_here    # Required: Google AI API key
PORT=8080                            # Optional: Server port (default 8080)
PROMPT_FILE=adhd-coach.txt          # Optional: System prompt file
```

### Audio Parameters
- **Input:** 16kHz mono PCM (Web Audio API native)
- **Output:** 24kHz mono PCM (Gemini native)
- **Chunk Size:** 4096 samples per ScriptProcessor callback
- **Voice:** "Zephyr" (Gemini's female voice)

### Timeouts & Thresholds
- **Session Inactivity:** 5 minutes (backend)
- **Retry Delay:** 2 seconds
- **Max Retries:** 3 attempts
- **Barge-In Threshold:** 80ms sustained voice activity
- **VAD Check Interval:** 20ms
- **Barge-In Cooldown:** 500ms

---

## 📊 State Diagram

```
                    ┌─────────┐
                    │  IDLE   │
                    └────┬────┘
                         │
                    User clicks mic
                         │
                         ▼
                  ┌──────────────────┐
                  │   CONNECTING     │
                  │ (WebSocket setup)│
                  └────┬─────────────┘
                       │
              Connection established
                       │
                       ▼
                  ┌──────────────┐
                  │    ACTIVE    │◄──┐
                  │ (streaming)  │   │
                  └────┬─────────┘   │
                       │             │
         ┌─────────────┴─────────────┴─────────────┐
         │                                         │
    User clicks   Session timeout        Connection
      stop or     or network error       error
    connection    
      error       
         │                                         │
         ▼                                         ▼
    ┌────────┐                                ┌───────┐
    │  IDLE  │◄──────────────────────────────│ ERROR │
    └────────┘     Auto-retry or             └───────┘
                   User action

     ┌─────────────────────┐
     │ Auto-Retry Logic    │
     │ (on ERROR state)    │
     │                     │
     │ Attempt 1: 2s delay │
     │ Attempt 2: 2s delay │
     │ Attempt 3: 2s delay │
     │ → Fail after 3      │
     └─────────────────────┘
```

---

## 🚀 Tech Stack Details

### Frontend Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@vitejs/plugin-react": "^4.2.1",
  "vite": "^5.2.0",
  "tailwindcss": "^3.4.4"
}
```

### Backend Dependencies
```json
{
  "@google/genai": "^1.28.0",
  "express": "^4.19.2",
  "ws": "^8.18.0",
  "cors": "^2.8.5",
  "dotenv": "^16.4.5"
}
```

### Build Tools
- **Frontend:** Vite (fast dev server, optimized builds)
- **Backend:** TypeScript with tsc compiler
- **Runtime:** Node.js 18+

---

## 📝 System Prompts

### Default: `adhd-coach.txt`
```
You are an AI ADHD Coach. Your goal is to be a supportive, empathetic, 
and motivating partner. Keep your responses concise, actionable, and 
encouraging. Focus on helping the user with tasks related to focus, 
procrastination, organization, and emotional regulation. Break down 
complex tasks into smaller steps. Use a calm and reassuring tone. 
Ask clarifying questions to understand the user's challenges.
```

### Extended: `adhd-coach-detailed.txt`
(More detailed ADHD-specific coaching instructions)

**To use different prompt:**
```bash
PROMPT_FILE=adhd-coach-detailed.txt npm start
```

---

## 🔐 Security Considerations

### Current Implementation
- API key stored in `.env` (gitignored)
- CORS enabled for localhost development
- No authentication on WebSocket (local only)

### Production Recommendations
1. **Authentication:** Implement JWT or OAuth for WebSocket connections
2. **Rate Limiting:** Add rate limiting on WebSocket messages
3. **Input Validation:** Validate message formats and sizes
4. **HTTPS/WSS:** Use secure WebSocket (wss://) in production
5. **CORS:** Restrict to specific origins
6. **API Key Rotation:** Implement key rotation strategy

---

## 🎓 How It Works (User Journey)

1. **User arrives at app** → Sees welcome screen with mic button
2. **Clicks microphone** → Requests permissions → Connects to backend
3. **Backend initializes Gemini** → Sends ready signal
4. **User speaks** → Real-time mic audio captured, sent to Gemini
5. **Gemini responds** → Audio + transcription streamed back
6. **Frontend plays audio** → User hears AI response
7. **Transcriptions appear** → Live typing effect, then finalized
8. **User can interrupt** → Starts speaking while AI is speaking
9. **VAD detects voice** → Triggers barge-in, stops audio playback
10. **New AI response** → Responds to interruption
11. **Cycle repeats** → Until session timeout or user stops

---

## ✅ Production Ready Features

From ROADMAP.md completion:

- ✅ Real-time audio streaming with Gemini 2.0 Live
- ✅ Bidirectional WebSocket communication
- ✅ Live transcription (input & output)
- ✅ Error boundaries & graceful error handling
- ✅ Retry logic with exponential backoff
- ✅ Session timeout management (5 min inactivity)
- ✅ Audio visualization
- ✅ Barge-in detection with VAD
- ✅ Health check endpoint
- ✅ Graceful shutdown handlers
- ✅ System prompt customization
- ✅ Comprehensive documentation

---

## 🐛 Known Limitations & Future Enhancements

### Current Limitations
1. **Local Only:** No production deployment (localhost only)
2. **Single Browser:** One browser session per backend session
3. **No Persistence:** Conversation history not saved
4. **No Authentication:** Any client can connect
5. **VAD Sensitivity:** Fixed threshold (may need tuning per user)

### Potential Enhancements
1. **Database Integration:** Store conversations with Supabase
2. **User Authentication:** Auth0 or custom JWT
3. **Multi-language Support:** Dynamic language switching
4. **Custom Voices:** Select different Gemini voices
5. **Session Export:** Download conversation as PDF/text
6. **Usage Analytics:** Track session metrics
7. **Advanced VAD:** ML-based voice detection
8. **Mobile App:** React Native version
9. **Offline Support:** Service Workers for partial offline use
10. **Voice Settings:** User-configurable audio parameters

---

## 🔗 Integration Opportunities

### Supabase Integration (Available MCP)
- **Authentication:** Supabase Auth for user management
- **Database:** Store conversations, user profiles, settings
- **Real-time Sync:** Supabase Realtime for multi-device sync
- **Storage:** File storage for exported conversations
- **Edge Functions:** Server-side logic deployment

### Example Schema:
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  created_at TIMESTAMP,
  messages JSONB,
  duration_seconds INTEGER,
  ai_coach_prompt TEXT
);

CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY,
  preferred_voice TEXT,
  theme TEXT,
  language TEXT,
  created_at TIMESTAMP
);
```

---

## 📚 Documentation Files

- **README.md** - Quick start, architecture, configuration
- **ROADMAP.md** - Feature completion tracking
- **docs/SYSTEM-PROMPTS.md** - Prompt engineering guide
- **docs/CONFIGURATION.md** - Detailed configuration options
- **docs/BARGE-IN.md** - Barge-in feature documentation

---

## 🎓 Summary

This is a **production-ready real-time voice AI assistant** built with:
- **Modern Frontend:** React 18 with TypeScript + Vite
- **Fast Backend:** Node.js + Express with WebSocket
- **Cutting-Edge AI:** Google Gemini 2.0 Live API with native audio
- **Polish:** Error handling, retries, timeouts, VAD, visualization
- **Scalability:** Per-client session management, can handle multiple concurrent users

The codebase is clean, well-documented, and ready for deployment with authentication and database integration.
