
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HistoryItem {
  id: string;
  type: 'summary' | 'quiz' | 'video' | 'chat';
  title: string;
  timestamp: string;
}

const STORAGE_KEY = 'hedra_user_history';

export const HistoryService = {
  add: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    try {
      const history = HistoryService.get();
      const newItem: HistoryItem = {
        ...item,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      };
      // Keep last 50 items
      localStorage.setItem(STORAGE_KEY, JSON.stringify([newItem, ...history].slice(0, 50)));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  },

  get: (): HistoryItem[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
