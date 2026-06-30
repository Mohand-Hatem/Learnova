import { Injectable, computed, signal } from '@angular/core';

export type SessionNotificationType = 'info' | 'success' | 'warning' | 'error';

export interface SessionNotificationItem {
  id: string;
  message: string;
  type: SessionNotificationType;
  createdAt: number;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class SessionNotificationsService {
  private static readonly STORAGE_KEY = 'learnova.admin.sessionNotifications';
  private readonly itemsSignal = signal<SessionNotificationItem[]>(this.readFromStorage());

  readonly items = computed(() => this.itemsSignal());
  readonly unreadCount = computed(() => this.itemsSignal().filter((item) => !item.read).length);

  add(message: string, type: SessionNotificationType = 'info'): void {
    const next: SessionNotificationItem = {
      id: this.createId(),
      message,
      type,
      createdAt: Date.now(),
      read: false,
    };

    this.itemsSignal.update((items) => {
      const updated = [next, ...items].slice(0, 50);
      this.writeToStorage(updated);
      return updated;
    });
  }

  markAllRead(): void {
    this.itemsSignal.update((items) => {
      const updated = items.map((item) => ({ ...item, read: true }));
      this.writeToStorage(updated);
      return updated;
    });
  }

  clear(): void {
    this.itemsSignal.set([]);
    this.writeToStorage([]);
  }

  private createId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private readFromStorage(): SessionNotificationItem[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem(SessionNotificationsService.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && typeof item.message === 'string')
        .map((item) => ({
          id: String(item.id ?? this.createId()),
          message: String(item.message),
          type: this.normalizeType(item.type),
          createdAt: Number(item.createdAt) || Date.now(),
          read: Boolean(item.read),
        }))
        .slice(0, 50);
    } catch {
      return [];
    }
  }

  private writeToStorage(items: SessionNotificationItem[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(SessionNotificationsService.STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota / browser privacy errors.
    }
  }

  private normalizeType(value: unknown): SessionNotificationType {
    return value === 'success' || value === 'warning' || value === 'error' ? value : 'info';
  }
}
