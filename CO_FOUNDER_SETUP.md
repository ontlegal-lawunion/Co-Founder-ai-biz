# Co-Founder Setup Guide

Welcome to the AI ADHD Coach project! This guide will help you get started quickly.

## 🚀 Quick Start (5 minutes)

### 1. Clone the Repository
```bash
git clone https://github.com/adhdhelps/gemini-live-voice-asst.git
cd gemini-live-voice-asst
```

### 2. Set Up Environment Variables

#### Backend Setup
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your Google AI API key:
```env
API_KEY=your_gemini_api_key_here
PORT=8080
```

**Get your API key:** https://aistudio.google.com/app/apikey

#### Frontend Setup
```bash
cd ../frontend
# No .env needed for frontend in local development
```

### 3. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 4. Run the Application

**Terminal 1 - Start Backend:**
```bash
cd backend
npm start
```
Backend will be running on `http://localhost:8080`

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will be running on `http://localhost:5173`

### 5. Test It!
1. Open http://localhost:5173 in your browser
2. Click the microphone button
3. Allow microphone access when prompted
4. Start talking!

---

## 📚 Documentation

- **README.md** - Full project overview, architecture, and features
- **ROADMAP.md** - Feature completion status and future enhancements
- **docs/SYSTEM-PROMPTS.md** - How to customize AI behavior
- **docs/CONFIGURATION.md** - Advanced configuration options
- **docs/BARGE-IN.md** - Voice interruption feature details

---

## 🎯 Project Structure

```
.
├── backend/
│   ├── src/index.ts              # Express + WebSocket server
│   ├── prompts/                  # System prompt files
│   └── package.json
│
├── frontend/
│   ├── src/App.tsx               # Main React component
│   ├── src/components/           # UI components
│   ├── src/utils/                # Audio utilities & VAD
│   └── package.json
│
├── docs/                         # Documentation
├── README.md                     # Main documentation
└── ROADMAP.md                    # Feature tracking
```

---

## 🔑 Key Technologies

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + WebSocket
- **AI:** Google Gemini 2.0 Live API
- **Audio:** Web Audio API with voice activity detection

---

## ✨ Features

✅ Real-time voice conversations with AI  
✅ Live transcription (user & AI)  
✅ Voice interruption (barge-in) detection  
✅ Automatic reconnection with retry logic  
✅ Real-time audio visualization  
✅ Error handling and recovery  
✅ Production-ready code structure  

---

## 🛠️ Development Tips

### Useful Commands

**Backend:**
```bash
npm start          # Build and run
npm run build      # TypeScript compilation only
npm run serve      # Run compiled code
```

**Frontend:**
```bash
npm run dev        # Development server with hot reload
npm run build      # Production build
npm run preview    # Preview production build
```

### Debugging

**Backend Logs:**
- Check console output for WebSocket connection logs
- Health check: `curl http://localhost:8080/health`

**Frontend Logs:**
- Open browser DevTools (F12)
- Check Console tab for errors
- Network tab shows WebSocket messages

### Common Issues

**"ENOENT: no such file or directory" for prompts:**
- Make sure you're running `npm start` from the backend directory
- Check that `backend/prompts/adhd-coach.txt` exists

**"WebSocket connection failed":**
- Ensure backend is running on port 8080
- Check firewall settings
- Try restarting both services

**"Microphone access denied":**
- Check browser permissions
- Try incognito/private mode
- Allow microphone in site settings

---

## 🚀 Next Steps

1. **Customize the AI:** Edit `backend/prompts/adhd-coach.txt`
2. **Adjust UI:** Modify colors/text in `frontend/src/App.tsx` and `tailwind.config.js`
3. **Add Features:** See Phase 4 in ROADMAP.md for enhancement ideas
4. **Deploy:** See README.md for deployment instructions

---

## 🔗 Resources

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [React Documentation](https://react.dev)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

## 💬 Support

For questions or issues:
1. Check the documentation files in `/docs`
2. Review README.md for architecture details
3. Check ROADMAP.md for known limitations

---

**You're all set! Happy coding! 🎉**
