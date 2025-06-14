import { Injectable, signal, computed } from '@angular/core';

export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  timestamp: number;
}

/**
 * Servicio global para manejar notificaciones con Angular Signals
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationStateService {
  private readonly _notifications = signal<NotificationState[]>([]);
  
  // Señales públicas de solo lectura
  public readonly notifications = computed(() => this._notifications());
  public readonly hasNotifications = computed(() => this._notifications().length > 0);
  public readonly latestNotification = computed(() => {
    const notifications = this._notifications();
    return notifications.length > 0 ? notifications[notifications.length - 1] : null;
  });

  /**
   * Agrega una nueva notificación
   */
  addNotification(type: NotificationState['type'], message: string, duration = 5000): string {
    const id = this.generateId();
    const notification: NotificationState = {
      id,
      type,
      message,
      duration,
      timestamp: Date.now()
    };

    this._notifications.update(current => [...current, notification]);

    // Auto-remover después del tiempo especificado
    if (duration > 0) {
      setTimeout(() => this.removeNotification(id), duration);
    }

    return id;
  }

  /**
   * Remueve una notificación por ID
   */
  removeNotification(id: string): void {
    this._notifications.update(current => 
      current.filter(notification => notification.id !== id)
    );
  }

  /**
   * Limpia todas las notificaciones
   */
  clearAll(): void {
    this._notifications.set([]);
  }

  /**
   * Métodos de conveniencia para diferentes tipos de notificación
   */
  success(message: string, duration?: number): string {
    return this.addNotification('success', message, duration);
  }

  error(message: string, duration?: number): string {
    return this.addNotification('error', message, duration);
  }

  warning(message: string, duration?: number): string {
    return this.addNotification('warning', message, duration);
  }

  info(message: string, duration?: number): string {
    return this.addNotification('info', message, duration);
  }

  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
