# Quick Start: Testing Supabase Integration

## ⚡ 5-Minute Setup & Test

### Step 1: Install Dependencies (if not done)
```bash
cd frontend
npm install
cd ..
```

### Step 2: Start Backend
```bash
cd backend
npm install
npm start
```

Output should show:
```
✓ Loaded system prompt from: adhd-coach.txt
Backend server is running on http://localhost:8080
```

### Step 3: Start Frontend
In a new terminal:
```bash
cd frontend
npm run dev
```

Output should show:
```
VITE v5.4.21 ready in XXX ms
➜ Local: http://localhost:5173/
```

### Step 4: Test Conversation & Auto-Save

1. **Open browser** → http://localhost:5173
2. **Click microphone button** (allow permissions)
3. **Say something** like: "Hey, help me focus on my project"
4. **AI responds** (you'll hear audio and see transcription)
5. **Say something else** to continue conversation
6. **Click stop button** when done

### Step 5: Verify in Browser Console

Open DevTools (F12) → Console tab

You should see:
```
✅ Conversation saved: [uuid-123]
```

This means your conversation was automatically saved to Supabase!

### Step 6: Verify in Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Find your project: `cdvftmxxjvdqjrvjzbtw`
3. Click on it
4. Go to: **SQL Editor** (left sidebar)
5. Run this query:
   ```sql
   SELECT * FROM conversations ORDER BY created_at DESC LIMIT 1;
   ```

You should see your conversation record with:
- `session_id` 
- `title` (timestamp)
- `created_at`
- `duration_seconds` (how long you talked)
- `message_count` (number of messages)

### Step 7: View the Messages

Still in SQL Editor, run:
```sql
SELECT * FROM messages 
WHERE conversation_id = '[copy the id from previous query]'
ORDER BY sequence_number;
```

You should see all your messages in order with:
- `sequence_number` (0, 1, 2, etc.)
- `sender` ("user" or "ai")
- `text` (the message content)

---

## ✅ What You Just Verified

✅ Frontend properly builds  
✅ Backend serves WebSocket  
✅ Supabase client connects  
✅ Conversations auto-save  
✅ Duration tracking works  
✅ Messages are stored with correct sequence  

---

## 🐛 Troubleshooting

### "Conversation saved" doesn't appear in console
- Check backend is running (should see in its terminal)
- Check network tab in DevTools for WebSocket connection
- Verify you stopped the session (clicked stop button)

### No data in Supabase
- Make sure to actually STOP the session (don't just refresh page)
- Check Supabase project URL: https://cdvftmxxjvdqjrvjzbtw.supabase.co
- Verify you ran the SQL query in the correct project

### Messages table is empty
- Same as above - need to actually stop a session
- Messages only save when there are messages in the transcript
- Try a longer conversation (more exchanges)

---

## 🎯 Next: Build History Viewer

Ready to build a UI to display saved conversations?

Would you like to create:
1. **Conversation List Component** - Show all saved conversations
2. **Conversation Detail View** - Display messages from selected conversation
3. **Export Feature** - Download as PDF/text
4. **Search & Filter** - Find conversations by date/duration

---

## 📞 Questions?

Check these files for more info:
- `docs/SUPABASE-INTEGRATION.md` - Complete API reference
- `SUPABASE_INTEGRATION_SUMMARY.md` - Full technical overview
- `frontend/src/utils/supabaseClient.ts` - Implementation details
- `frontend/src/utils/useConversations.ts` - React hook usage

---

**Integration is live! 🚀**
