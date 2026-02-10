
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SupportMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

const SUPPORT_STORAGE_KEY = 'hedra_support_chat';

export const NotesService = {
  getHistory: (): SupportMessage[] => {
    try {
        const data = localStorage.getItem(SUPPORT_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
  },

  addMessage: (message: SupportMessage) => {
    const history = NotesService.getHistory();
    const newHistory = [...history, message];
    // Keep last 50 messages to avoid localstorage bloat
    if (newHistory.length > 50) newHistory.shift();
    localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(newHistory));
  },

  clearHistory: () => {
      localStorage.removeItem(SUPPORT_STORAGE_KEY);
  }
};
