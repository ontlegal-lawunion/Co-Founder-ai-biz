# AI Memory & Tagging System

## Overview
This document describes the AI Memory and Tagging features added to the AI Business Co-Founder application.

## Features Added

### 1. **AI Memory / Conversation Context**
The AI now has memory of your past conversations and can reference them in new sessions.

#### How It Works:
1. **On Session Start**: The frontend loads summaries of your last 5 conversations from Supabase
2. **Context Injection**: This context is sent to the backend via an `init` message
3. **Enhanced Prompt**: The backend adds the context to the system prompt before initializing the Gemini session
4. **Personalized Responses**: The AI can now reference past discussions and provide continuity

#### Example Context Format:
```
Previous conversation context:
[11/6/2025] Conversation - 11/6/2025, 11:30 PM
Summary: Discussed time management strategies for ADHD
Key points: Pomodoro technique, break tasks into smaller steps, use visual timers

[11/5/2025] Conversation - 11/5/2025, 3:45 PM
Summary: Explored business ideas for productivity app
Key points: Focus on ADHD users, voice interface, gamification
```

### 2. **Tagging System**
Organize conversations by topic for better retrieval and analysis.

#### Features:
- **Pre-loaded Tags**: 8 default tags covering common topics:
  - Business Strategy (Blue)
  - Product Development (Green)
  - Marketing (Amber)
  - Finance (Red)
  - ADHD Support (Purple)
  - Goal Setting (Pink)
  - Time Management (Teal)
  - Brainstorming (Orange)

- **Custom Tags**: Create new tags with custom names and colors
- **Multi-tag Support**: Add multiple tags to a single conversation
- **Visual Organization**: Tags displayed as colored pills for easy identification

#### UI Location:
- Tag selector appears when session is IDLE (before starting)
- Select tags before starting a conversation
- Tags are automatically saved when conversation ends

### 3. **Database Schema**

#### New Tables:
```sql
-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation-Tag junction table
CREATE TABLE conversation_tags (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, tag_id)
);
```

#### Extended conversations table:
```sql
ALTER TABLE conversations 
ADD COLUMN summary TEXT,
ADD COLUMN key_points TEXT[];
```

## API Functions Added

### Frontend (`supabaseClient.ts`):
- `getTags()` - Get all available tags
- `createTag(name, color)` - Create a new tag
- `getConversationTags(conversationId)` - Get tags for a conversation
- `addTagsToConversation(conversationId, tagIds)` - Add tags to conversation
- `removeTagFromConversation(conversationId, tagId)` - Remove a tag
- `getRecentConversationsForContext(limit)` - Get formatted context for AI
- `updateConversationSummary(conversationId, summary, keyPoints)` - Add metadata

### Backend (`index.ts`):
- Modified WebSocket connection to accept `init` message with conversation context
- Created `initializeSession()` function to handle session setup with context
- Enhanced system prompt dynamically based on conversation history

## Usage Example

### Starting a Session with Memory:
```typescript
// Frontend automatically loads context
const conversationContext = await getRecentConversationsForContext(5);

// Sends to backend via WebSocket
ws.send(JSON.stringify({
  type: 'init',
  conversationContext: conversationContext,
}));
```

### Tagging a Conversation:
```typescript
// 1. User selects tags before session (via UI)
setSelectedTags([businessStrategyTag, brainstormingTag]);

// 2. After conversation ends, tags are saved
const conversation = await saveCurrentConversation(...);
await addTagsToConversation(conversation.id, selectedTags.map(t => t.id));
```

## Future Enhancements

### Potential Features:
1. **Conversation Search by Tags** - Filter past conversations by tag
2. **AI-Generated Summaries** - Automatically summarize conversations using AI
3. **Smart Tag Suggestions** - AI suggests relevant tags based on conversation content
4. **Tag Analytics** - See which topics you discuss most frequently
5. **Export by Tag** - Export all conversations with a specific tag
6. **Multi-session Context** - Load context from specific past conversations (not just recent)
7. **Context Relevance Scoring** - Only include most relevant past conversations

## Implementation Notes

### Performance Considerations:
- Only last 5 conversations loaded for context (configurable)
- Context limited to summaries and key points (not full transcripts)
- Indexes added for fast tag queries

### Privacy & Security:
- All data stored in Supabase with RLS (Row Level Security) support
- Conversation context never shared between users
- Tags are user-specific

## Testing

To test the new features:

1. **AI Memory**:
   - Have a conversation about a topic (e.g., "help me manage my time")
   - End the session
   - Start a new session and mention the topic again
   - AI should reference the previous discussion

2. **Tags**:
   - Select "Time Management" tag before starting
   - Have a conversation
   - Check Supabase database to verify tag association
   - Create a custom tag and verify it appears in the list

## Migration Commands

Run these in Supabase SQL editor or via MCP:
```sql
-- Already applied via MCP tools:
-- add_tags_and_conversation_tags
-- add_conversation_summary_for_ai_memory
```

## Files Modified

### Backend:
- `backend/src/index.ts` - Added init message handling and context injection

### Frontend:
- `frontend/src/App.tsx` - Added tag state, context loading, UI integration
- `frontend/src/utils/supabaseClient.ts` - Added tag and context functions
- `frontend/src/components/TagSelector.tsx` - New tag selection component

### Database:
- New tables: `tags`, `conversation_tags`
- Modified table: `conversations` (added `summary`, `key_points`)
