
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FeedbackMessage {
  id: string;
  studentName?: string;
  content: string;
  timestamp: string;
}

const FEEDBACK_KEY = 'hedra_admin_feedback';

export const FeedbackService = {
  addMessage: (message: Omit<FeedbackMessage, 'id' | 'timestamp'>) => {
    try {
      const messages = FeedbackService.getMessages();
      const newMessage: FeedbackMessage = {
        ...message,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      };
      // Keep last 100 items
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify([newMessage, ...messages].slice(0, 100)));
      return newMessage;
    } catch (e) {
      console.error("Failed to save feedback", e);
      return null;
    }
  },

  getMessages: (): FeedbackMessage[] => {
    try {
      return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
    } catch {
      return [];
    }
  },

  deleteMessage: (id: string) => {
    try {
      const messages = FeedbackService.getMessages().filter(m => m.id !== id);
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to delete feedback", e);
    }
  },

  clearAll: () => {
    localStorage.removeItem(FEEDBACK_KEY);
  }
};
