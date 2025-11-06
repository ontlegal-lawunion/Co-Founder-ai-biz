import { useState, useCallback } from 'react';
import {
  saveConversation,
  getConversations,
  getConversationWithMessages,
  updateConversation,
  deleteConversation,
  archiveConversation,
  ConversationRecord,
  MessageRecord,
} from './supabaseClient';

export interface UseConversationsReturn {
  conversations: ConversationRecord[];
  isLoading: boolean;
  error: string | null;
  savingConversation: boolean;
  
  // Actions
  loadConversations: () => Promise<void>;
  saveCurrentConversation: (
    sessionId: string,
    messages: Array<{ sender: 'user' | 'ai'; text: string }>,
    durationSeconds?: number
  ) => Promise<ConversationRecord | null>;
  loadConversation: (
    conversationId: string
  ) => Promise<{ conversation: ConversationRecord; messages: MessageRecord[] } | null>;
  updateConversationTitle: (
    conversationId: string,
    title: string
  ) => Promise<void>;
  addNotesToConversation: (
    conversationId: string,
    notes: string
  ) => Promise<void>;
  archiveConversationRecord: (conversationId: string) => Promise<void>;
  deleteConversationRecord: (conversationId: string) => Promise<void>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingConversation, setSavingConversation] = useState(false);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMsg);
      console.error('Error loading conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveCurrentConversation = useCallback(
    async (
      sessionId: string,
      messages: Array<{ sender: 'user' | 'ai'; text: string }>,
      durationSeconds: number = 0
    ): Promise<ConversationRecord | null> => {
      if (messages.length === 0) {
        console.log('⚠️ No messages to save');
        return null;
      }

      setSavingConversation(true);
      setError(null);
      try {
        const conversation = await saveConversation(sessionId, messages, durationSeconds);
        
        // Add to local state
        setConversations(prev => [conversation as ConversationRecord, ...prev]);
        
        console.log('✅ Conversation saved:', conversation.id);
        return conversation as ConversationRecord;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to save conversation';
        setError(errorMsg);
        console.error('Error saving conversation:', err);
        return null;
      } finally {
        setSavingConversation(false);
      }
    },
    []
  );

  const loadConversation = useCallback(
    async (conversationId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getConversationWithMessages(conversationId);
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load conversation';
        setError(errorMsg);
        console.error('Error loading conversation:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateConversationTitle = useCallback(
    async (conversationId: string, title: string) => {
      setError(null);
      try {
        const updated = await updateConversation(conversationId, { title });
        
        // Update local state
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId ? { ...conv, title: updated.title } : conv
          )
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update title';
        setError(errorMsg);
        console.error('Error updating title:', err);
      }
    },
    []
  );

  const addNotesToConversation = useCallback(
    async (conversationId: string, notes: string) => {
      setError(null);
      try {
        const updated = await updateConversation(conversationId, { notes });
        
        // Update local state
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId ? { ...conv, notes: updated.notes } : conv
          )
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to add notes';
        setError(errorMsg);
        console.error('Error adding notes:', err);
      }
    },
    []
  );

  const archiveConversationRecord = useCallback(
    async (conversationId: string) => {
      setError(null);
      try {
        await archiveConversation(conversationId);
        
        // Update local state
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId ? { ...conv, archived: true } : conv
          )
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to archive conversation';
        setError(errorMsg);
        console.error('Error archiving conversation:', err);
      }
    },
    []
  );

  const deleteConversationRecord = useCallback(
    async (conversationId: string) => {
      setError(null);
      try {
        await deleteConversation(conversationId);
        
        // Update local state
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete conversation';
        setError(errorMsg);
        console.error('Error deleting conversation:', err);
      }
    },
    []
  );

  return {
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
  };
}
