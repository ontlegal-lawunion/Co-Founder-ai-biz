# Gemini Live Audio Template

A real-time voice conversation application powered by Google's Gemini 2.0 Live API. This template provides a clean foundation for building voice-enabled AI assistants using React, Node.js, and WebSockets.

## 🎯 Features

- **Real-time Voice Streaming**: Capture microphone audio and stream to Gemini's native audio model
- **WebSocket Communication**: Bidirectional audio streaming between client and server
- **Live Transcription**: Real-time transcription of both user and AI speech
- **Conversation History**: Automatically save conversations to Supabase
- **Modern Tech Stack**: React 18, TypeScript, Vite, Tailwind CSS, Supabase
- **Production Ready**: Clean architecture, error handling, and session management

## 🏗️ Architecture

```
┌─────────────┐     WebSocket      ┌─────────────┐     Gemini API     ┌─────────────┐
│   Frontend  │ ←────────────────→ │   Backend   │ ←─────────────────→ │   Gemini    │
│   (React)   │   Audio + Data     │  (Node.js)  │   Audio + Data     │  Live API   │
└─────────────┘                    └─────────────┘                    └─────────────┘
```

### Frontend (React + Vite)
- Captures microphone audio using Web Audio API
- Converts audio to 16kHz PCM format
- Sends via WebSocket to backend
- Receives and plays AI voice responses
- Displays live transcriptions

### Backend (Node.js + Express)
- WebSocket server for real-time communication
- Manages Gemini Live API sessions
- Converts audio formats (PCM ↔ base64)
- Forwards messages between client and Gemini

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google AI Studio API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone this repository** (or use as template)
   ```bash
   git clone <your-repo-url>
   cd <your-repo-name>
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure environment variables**
   
   Create `backend/.env`:
   ```env
   API_KEY=your_gemini_api_key_here
   PORT=8080
   ```

### Running the Application

1. **Start the backend** (in `backend/` directory)
   ```bash
   npm start
   ```
   Backend runs on: `http://localhost:8080`

2. **Start the frontend** (in `frontend/` directory)
   ```bash
   npm run dev
   ```
   Frontend runs on: `http://localhost:5173`

3. **Open your browser** and navigate to `http://localhost:5173`

4. **Click the microphone button** and start talking!

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   └── index.ts          # WebSocket server & Gemini integration
│   ├── .env                   # Environment variables (gitignored)
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main app component
│   │   ├── index.tsx          # Entry point
│   │   ├── types.ts           # TypeScript types
│   │   ├── components/        # React components
│   │   │   ├── Controls.tsx   # Start/stop button
│   │   │   ├── ConversationMessage.tsx
│   │   │   ├── StatusIndicator.tsx
│   │   │   └── ...
│   │   └── utils/
│   │       └── audioUtils.ts  # Audio processing utilities
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```

## 🔧 Configuration

### Backend Configuration

**Environment Variables** (`backend/.env`):
- `API_KEY`: Your Google Gemini API key (required)
- `PORT`: Server port (default: 8080)

**Gemini Model Configuration** (`backend/src/index.ts`):
```typescript
model: 'gemini-2.5-flash-native-audio-preview-09-2025'
responseModalities: [Modality.AUDIO]
speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
```

### Frontend Configuration

**WebSocket URL** (`frontend/src/App.tsx`):
```typescript
const ws = new WebSocket('ws://localhost:8080');
```

**Audio Settings** (`frontend/src/App.tsx`):
- Input: 16kHz sample rate
- Output: 24kHz sample rate
- Format: 16-bit PCM

## 🎨 Customization Guide

### 1. Change the System Prompt

Edit `backend/src/index.ts`:
```typescript
systemInstruction: `Your custom instructions here...`
```

### 2. Change the Voice

Available voices: `Puck`, `Charon`, `Kore`, `Fenrir`, `Aoede`, `Zephyr`

```typescript
speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
```

### 3. Customize UI

The frontend uses Tailwind CSS. Edit components in `frontend/src/components/`.

### 4. Modify Audio Settings

Edit audio context initialization in `frontend/src/App.tsx`:
```typescript
inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
```

## 🔐 Security Notes

- **Never commit `.env` files** - They contain your API key
- **Use environment variables** for all sensitive data
- **Implement rate limiting** for production deployments
- **Add authentication** if deploying publicly
- **Use HTTPS/WSS** in production

## 🚢 Deployment

### Backend (Node.js)
- Deploy to: Heroku, Railway, Render, AWS, Google Cloud
- Set environment variables in platform settings
- Ensure WebSocket support is enabled

### Frontend (Static)
- Deploy to: Vercel, Netlify, GitHub Pages, Cloudflare Pages
- Update WebSocket URL to your backend domain
- Build with: `npm run build`

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run build  # Compile TypeScript
npm start      # Run compiled code
```

### Frontend Development
```bash
cd frontend
npm run dev    # Start dev server with hot reload
npm run build  # Build for production
```

## 📝 Using This as a Template

### Option 1: GitHub Template Repository
1. Push this to GitHub
2. Go to repository Settings → Check "Template repository"
3. Click "Use this template" to create new projects

### Option 2: Manual Clone
```bash
git clone <this-repo> my-new-project
cd my-new-project
rm -rf .git
git init
# Make your changes
git add .
git commit -m "Initial commit from template"
```

### Adapting for Your Project

1. **Rename the project** in `package.json` files
2. **Update system prompt** for your use case
3. **Customize UI components** and styling
4. **Add your specific features**
5. **Update this README** with your project details

## 🐛 Troubleshooting

### "WebSocket connection failed"
- Ensure backend is running on port 8080
- Check firewall settings
- Verify WebSocket URL in frontend

### "No audio playback"
- Check browser permissions for microphone
- Ensure speakers/audio output is enabled
- Check browser console for errors

### "API key invalid"
- Verify API key in `backend/.env`
- Ensure it starts with `AIza`
- Check it's named `API_KEY` (not `GEMINI_API_KEY`)

## 📚 Resources

- [Gemini Live API Documentation](https://ai.google.dev/api/multimodal-live)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

## 📄 License

MIT License - feel free to use this template for any project!

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ using Gemini 2.0 Live API**
