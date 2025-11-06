# Supabase Integration Guide

This guide explains how Supabase is integrated into the AI ADHD Coach application.

## 📊 Database Schema

### Tables

#### `conversations`
Stores conversation sessions with metadata.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `session_id` | TEXT | Unique session identifier |
| `title` | TEXT | Conversation title (auto-generated timestamp) |
| `created_at` | TIMESTAMP | When conversation started |
| `updated_at` | TIMESTAMP | Last update time |
| `duration_seconds` | INTEGER | Total session duration |
| `message_count` | INTEGER | Total messages in conversation |
| `archived` | BOOLEAN | Archive flag |
| `notes` | TEXT | User notes about the conversation |

#### `messages`
Stores individual messages within conversations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `conversation_id` | UUID | Foreign key to conversations |
| `sender` | TEXT | 'user' or 'ai' |
| `text` | TEXT | Message content |
| `created_at` | TIMESTAMP | When message was sent |
| `sequence_number` | INTEGER | Order in conversation |

#### `user_preferences`
Stores user settings and preferences.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `preferred_voice` | TEXT | Selected AI voice (default: 'Zephyr') |
| `theme` | TEXT | UI theme (default: 'dark') |
| `language` | TEXT | Interface language (default: 'en') |
| `created_at` | TIMESTAMP | When preferences were created |
| `updated_at` | TIMESTAMP | Last update time |

### Indexes
- `idx_conversations_session_id` - Fast lookup by session ID
- `idx_conversations_created_at` - Sort conversations by date
- `idx_messages_conversation_id` - Retrieve messages by conversation
- `idx_messages_created_at` - Sort messages by date

---

## 🔐 Configuration

### Supabase Project Details

**URL:** `https://cdvftmxxjvdqjrvjzbtw.supabase.co`  
**Anon Key:** (Auto-configured in `supabaseClient.ts`)

### Setup Steps

1. **Frontend already configured** ✅
   - Supabase client is created in `frontend/src/utils/supabaseClient.ts`
   - API credentials are built into the client
   - No additional frontend setup needed!

2. **Database schema is ready** ✅
   - All tables and indexes already created
   - Ready to save conversations

---

## 💾 How Data Flows

### Saving a Conversation

```
User clicks "Stop" or closes session
    ↓
handleStopSession() called
    ↓
Checks if transcript has messages
    ↓
Calls saveConversation(sessionId, messages, duration)
    ↓
1. Creates conversation record with metadata
2. Inserts all messages with sequence numbers
    ↓
Supabase returns created conversation record
    ↓
Local state updated optimistically
    ↓
✅ Conversation saved!
```

**Code:**
```tsx
const { saveCurrentConversation } = useConversations();

const handleStopSession = useCallback(async () => {
  if (transcript.length > 0) {
    const sessionId = `session-${Date.now()}`;
    const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
    await saveCurrentConversation(sessionId, transcript, duration);
  }
  // ... cleanup code
}, [transcript, sessionStartTime, saveCurrentConversation]);
```

### Loading Conversations

```
App mounts or user navigates to history view
    ↓
Calls loadConversations()
    ↓
Queries Supabase for all conversations
    ↓
Ordered by created_at (newest first)
    ↓
State updated with conversation list
    ↓
✅ Conversations displayed!
```

---

## 🎯 Available Functions

All functions are in `frontend/src/utils/supabaseClient.ts`:

### `saveConversation(sessionId, messages, durationSeconds)`
Save a new conversation to database.

```typescript
const conversation = await saveConversation(
  'session-123',
  [
    { sender: 'user', text: 'Hello' },
    { sender: 'ai', text: 'Hi there!' }
  ],
  45 // seconds
);
```

### `getConversations(limit)`
Get list of conversations (default: 50 most recent).

```typescript
const conversations = await getConversations(100);
```

### `getConversationWithMessages(conversationId)`
Get a specific conversation with all its messages.

```typescript
const { conversation, messages } = await getConversationWithMessages(
  'uuid-here'
);
```

### `updateConversation(conversationId, updates)`
Update conversation metadata (title, notes, archived status).

```typescript
await updateConversation(id, {
  title: 'Important coaching session',
  notes: 'Discussed ADHD management strategies'
});
```

### `deleteConversation(conversationId)`
Permanently delete a conversation (cascade deletes messages).

```typescript
await deleteConversation('uuid-here');
```

### `archiveConversation(conversationId)`
Archive a conversation (soft delete - still in database).

```typescript
await archiveConversation('uuid-here');
```

### `getUserPreferences()` & `updateUserPreferences(updates)`
Manage user settings.

```typescript
const prefs = await getUserPreferences();

await updateUserPreferences({
  preferred_voice: 'Amber',
  theme: 'light'
});
```

---

## 🪝 React Hook: `useConversations()`

Custom hook for managing conversations in React components.

```typescript
import { useConversations } from './utils/useConversations';

function MyComponent() {
  const {
    conversations,
    isLoading,
    error,
    savingConversation,
    
    loadConversations,
    saveCurrentConversation,
    loadConversation,
    updateConversationTitle,
    addNotesToConversation,
    archiveConversationRecord,
    deleteConversationRecord,
  } = useConversations();

  // Use the hook...
}
```

### Hook Properties

- **`conversations`** - Array of conversation records
- **`isLoading`** - Boolean, true while fetching
- **`error`** - Error message if operation failed
- **`savingConversation`** - Boolean, true while saving

### Hook Methods

All methods are optimistic (update UI immediately, sync with DB):

- **`loadConversations()`** - Fetch all conversations
- **`saveCurrentConversation(...)`** - Save new conversation
- **`loadConversation(id)`** - Load specific conversation + messages
- **`updateConversationTitle(id, title)`** - Rename conversation
- **`addNotesToConversation(id, notes)`** - Add notes
- **`archiveConversationRecord(id)`** - Archive conversation
- **`deleteConversationRecord(id)`** - Delete conversation

---

## 🔄 Current Integration Status

### ✅ Implemented

- Database schema with migrations
- Supabase client configuration
- Functions for CRUD operations
- React hook for state management
- Auto-save on session end
- Session duration tracking
- Optimistic UI updates

### ⏳ Not Yet Implemented (Phase 5)

- Conversation history viewer UI
- Export conversations (PDF/text)
- Advanced search/filtering
- User authentication
- Multi-user data isolation
- Real-time sync with other devices
- Conversation sharing

---

## 📱 Future: Authentication

When ready to add authentication, these functions will be updated to:

1. Associate conversations with specific users
2. Add RLS (Row Level Security) policies
3. Ensure users can only access their own data
4. Support sharing between authenticated users

---

## 🧪 Testing

### Manual Testing

1. **Start a conversation** - Talk to the AI
2. **Stop the session** - Click stop button
3. **Check Supabase Dashboard** - Verify conversation was saved
4. **Load conversations** - Call `loadConversations()`
5. **Verify data** - Check message count and timestamps

### Debugging

Check browser console for:
- `✅ Conversation saved: <id>`
- `❌ Error saving conversation: <error>`

Check Supabase dashboard:
- Queries tab shows all operations
- Data browser shows stored conversations
- Realtime tab shows subscription activity

---

## 📚 Resources

- [Supabase JavaScript Client Docs](https://supabase.com/docs/reference/javascript)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## Next Steps

1. **Build conversation history UI** - Display saved conversations
2. **Add conversation export** - Download as PDF/text
3. **Implement search/filter** - Find conversations by date, duration, etc.
4. **Add authentication** - Associate with users
5. **Enable real-time sync** - See conversations across devices

---

**Supabase integration is ready! 🎉**
