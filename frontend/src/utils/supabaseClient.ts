import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://cdvftmxxjvdqjrvjzbtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdmZ0bXh4anZkcWpydmp6YnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODcxNjQsImV4cCI6MjA3Nzg2MzE2NH0.Czg0kCrXKVmyzumB9o02ztBHmWU6kNORSZ2xCRauTiU';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface ConversationRecord {
  id: string;
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  duration_seconds: number;
  message_count: number;
  archived: boolean;
  notes: string | null;
  summary: string | null;
  key_points: string[] | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ConversationTag {
  id: string;
  conversation_id: string;
  tag_id: string;
  created_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender: 'user' | 'ai';
  text: string;
  created_at: string;
  sequence_number: number;
}

export interface UserPreferences {
  id: string;
  preferred_voice: string;
  theme: string;
  language: string;
  created_at: string;
  updated_at: string;
}

/**
 * Save a complete conversation to Supabase
 */
export async function saveConversation(
  sessionId: string,
  messages: Array<{ sender: 'user' | 'ai'; text: string }>,
  durationSeconds: number = 0
) {
  try {
    // Create conversation record
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        session_id: sessionId,
        title: `Conversation - ${new Date().toLocaleString()}`,
        duration_seconds: durationSeconds,
        message_count: messages.length,
      })
      .select()
      .single();

    if (convError) throw convError;
    if (!conversation) throw new Error('Failed to create conversation');

    // Insert all messages
    const messageRecords = messages.map((msg, index) => ({
      conversation_id: conversation.id,
      sender: msg.sender,
      text: msg.text,
      sequence_number: index,
    }));

    const { error: messagesError } = await supabase
      .from('messages')
      .insert(messageRecords);

    if (messagesError) throw messagesError;

    console.log('✅ Conversation saved:', conversation.id);
    return conversation;
  } catch (error) {
    console.error('❌ Error saving conversation:', error);
    throw error;
  }
}

/**
 * Get all conversations
 */
export async function getConversations(limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Get a specific conversation with all its messages
 */
export async function getConversationWithMessages(conversationId: string) {
  try {
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: true });

    if (messagesError) throw messagesError;

    return { conversation, messages: messages || [] };
  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    throw error;
  }
}

/**
 * Update conversation title or notes
 */
export async function updateConversation(
  conversationId: string,
  updates: Partial<ConversationRecord>
) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error updating conversation:', error);
    throw error;
  }
}

/**
 * Delete a conversation (and its messages via CASCADE)
 */
export async function deleteConversation(conversationId: string) {
  try {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw error;
    console.log('✅ Conversation deleted:', conversationId);
  } catch (error) {
    console.error('❌ Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Archive a conversation
 */
export async function archiveConversation(conversationId: string) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .update({ archived: true })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error archiving conversation:', error);
    throw error;
  }
}

/**
 * Get or create user preferences
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  try {
    let { data: prefs, error } = await supabase
      .from('user_preferences')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected on first call)
      throw error;
    }

    // If no preferences exist, create default ones
    if (!prefs) {
      const { data: newPrefs, error: createError } = await supabase
        .from('user_preferences')
        .insert({
          preferred_voice: 'Zephyr',
          theme: 'dark',
          language: 'en',
        })
        .select()
        .single();

      if (createError) throw createError;
      prefs = newPrefs;
    }

    return prefs;
  } catch (error) {
    console.error('❌ Error getting preferences:', error);
    throw error;
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  updates: Partial<UserPreferences>
) {
  try {
    // Get first preference record (or create one)
    let { data: prefs } = await supabase
      .from('user_preferences')
      .select('id')
      .limit(1)
      .single();

    if (!prefs) {
      prefs = await getUserPreferences();
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prefs.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error updating preferences:', error);
    throw error;
  }
}

/**
 * Tag Management Functions
 */

/**
 * Get all available tags
 */
export async function getTags(): Promise<Tag[]> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching tags:', error);
    throw error;
  }
}

/**
 * Create a new tag
 */
export async function createTag(name: string, color: string = '#6B7280'): Promise<Tag> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .insert({ name, color })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error creating tag:', error);
    throw error;
  }
}

/**
 * Get tags for a specific conversation
 */
export async function getConversationTags(conversationId: string): Promise<Tag[]> {
  try {
    const { data, error } = await supabase
      .from('conversation_tags')
      .select('tag_id, tags(*)')
      .eq('conversation_id', conversationId);

    if (error) throw error;
    return data?.map(ct => ct.tags as unknown as Tag) || [];
  } catch (error) {
    console.error('❌ Error fetching conversation tags:', error);
    throw error;
  }
}

/**
 * Add tags to a conversation
 */
export async function addTagsToConversation(conversationId: string, tagIds: string[]): Promise<void> {
  try {
    const records = tagIds.map(tagId => ({
      conversation_id: conversationId,
      tag_id: tagId,
    }));

    const { error } = await supabase
      .from('conversation_tags')
      .insert(records);

    if (error) throw error;
  } catch (error) {
    console.error('❌ Error adding tags to conversation:', error);
    throw error;
  }
}

/**
 * Remove a tag from a conversation
 */
export async function removeTagFromConversation(conversationId: string, tagId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversation_tags')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('tag_id', tagId);

    if (error) throw error;
  } catch (error) {
    console.error('❌ Error removing tag from conversation:', error);
    throw error;
  }
}

/**
 * AI Memory Functions
 */

/**
 * Get recent conversations for AI context (last 5 conversations with summaries)
 */
export async function getRecentConversationsForContext(limit: number = 5): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('created_at, title, summary, key_points')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    if (!data || data.length === 0) {
      return '';
    }

    // Format conversations into context string
    const contextParts = data.map((conv, index) => {
      const date = new Date(conv.created_at).toLocaleDateString();
      let context = `[${date}] ${conv.title}`;
      
      if (conv.summary) {
        context += `\nSummary: ${conv.summary}`;
      }
      
      if (conv.key_points && conv.key_points.length > 0) {
        context += `\nKey points: ${conv.key_points.join(', ')}`;
      }
      
      return context;
    }).join('\n\n');

    return `Previous conversation context:\n${contextParts}`;
  } catch (error) {
    console.error('❌ Error fetching conversation context:', error);
    return '';
  }
}

/**
 * Update conversation summary and key points (can be done after conversation ends)
 */
export async function updateConversationSummary(
  conversationId: string,
  summary: string,
  keyPoints: string[]
): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({
        summary,
        key_points: keyPoints,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (error) throw error;
  } catch (error) {
    console.error('❌ Error updating conversation summary:', error);
    throw error;
  }
}
