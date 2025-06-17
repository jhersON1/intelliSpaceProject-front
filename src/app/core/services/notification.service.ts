import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer, interval } from 'rxjs';
import { takeWhile, map, filter, switchMap } from 'rxjs/operators';

import { LoggerService } from './logger.service';
import { AuthService } from '../../auth/services/auth.service';
import { AnalyticsService } from './analytics.service';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'critical';
  productId?: string;
  productName?: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface NotificationSettings {
  enablePush: boolean;
  enableSound: boolean;
  enableDesktop: boolean;
  criticalProductThreshold: number; // Factor ρ >= este valor
  warningProductThreshold: number; // Factor ρ >= este valor
  checkInterval: number; // Segundos entre checks
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private logger = inject(LoggerService);
  private authService = inject(AuthService);
  private analyticsService = inject(AnalyticsService);

  // Signals para el estado de notificaciones
  notifications = signal<Notification[]>([]);
  unreadCount = signal(0);
  isConnected = signal(false);
  settings = signal<NotificationSettings>({
    enablePush: true,
    enableSound: true,
    enableDesktop: true,
    criticalProductThreshold: 0.8,
    warningProductThreshold: 0.5,
    checkInterval: 30
  });

  // Computed signals
  criticalNotifications = computed(() => 
    this.notifications().filter(n => !n.isRead && (n.type === 'critical' || n.priority === 'critical'))
  );

  recentNotifications = computed(() => 
    this.notifications()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
  );

  // Private subjects
  private notificationSubject = new Subject<Notification>();
  private pollingSubscription: any;

  // Audio para notificaciones
  private notificationSound = new Audio('data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAAAM='); // Placeholder
  constructor() {
    this.loadSettings();
    this.setupNotificationPermissions();
    this.startPolling();

    // Actualizar contador cuando cambian las notificaciones usando effect
    effect(() => {
      const notifications = this.notifications();
      const unread = notifications.filter(n => !n.isRead).length;
      this.unreadCount.set(unread);
    });
  }

  /**
   * Configurar permisos de notificaciones del navegador
   */
  private async setupNotificationPermissions() {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  }

  /**
   * Iniciar polling para verificar estados críticos
   */
  startPolling() {
    const settings = this.settings();
    
    // Detener polling anterior si existe
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }    // Solo hacer polling si el usuario está autenticado
    this.pollingSubscription = interval(settings.checkInterval * 1000).pipe(
      filter(() => this.authService.isAuthenticated()),
      switchMap(() => this.checkCriticalProducts())
    ).subscribe();

    this.isConnected.set(true);
    this.logger.info('Notification polling started', { interval: settings.checkInterval });
  }

  /**
   * Detener polling
   */
  stopPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
    this.isConnected.set(false);
    this.logger.info('Notification polling stopped');
  }

  /**
   * Verificar productos críticos y generar notificaciones
   */
  private checkCriticalProducts(): Observable<any> {
    return this.analyticsService.getCriticalProducts().pipe(
      map(criticalProducts => {
        const settings = this.settings();
        
        criticalProducts.forEach(product => {
          const analytics = (product as any).analytics;
          if (!analytics) return;

          const rho = analytics.utilizationFactor || 0;
          
          // Verificar si ya existe una notificación reciente para este producto
          const existingNotification = this.notifications().find(n => 
            n.productId === product.id && 
            n.type === 'critical' &&
            (Date.now() - n.timestamp.getTime()) < 3600000 // Última hora
          );

          if (existingNotification) return; // No duplicar notificaciones

          if (rho >= settings.criticalProductThreshold) {
            this.addNotification({
              id: this.generateId(),
              title: '🚨 Producto Crítico',              message: `${product.name} necesita reposición urgente (ρ=${rho.toFixed(2)})`,
              type: 'critical',
              productId: product.id,
              productName: product.name,
              timestamp: new Date(),
              isRead: false,
              actionUrl: `/vendor/analytics/advanced/${product.id}`,
              priority: 'critical'
            });
          } else if (rho >= settings.warningProductThreshold) {
            this.addNotification({
              id: this.generateId(),
              title: '⚠️ Producto en Advertencia',              message: `${product.name} requiere atención (ρ=${rho.toFixed(2)})`,
              type: 'warning',
              productId: product.id,
              productName: product.name,
              timestamp: new Date(),
              isRead: false,
              actionUrl: `/vendor/analytics/advanced/${product.id}`,
              priority: 'medium'
            });
          }
        });
      })
    );
  }

  /**
   * Agregar una nueva notificación
   */
  addNotification(notification: Notification) {
    const currentNotifications = this.notifications();
    const updatedNotifications = [notification, ...currentNotifications];
    
    // Mantener solo las últimas 50 notificaciones
    if (updatedNotifications.length > 50) {
      updatedNotifications.splice(50);
    }
    
    this.notifications.set(updatedNotifications);
    this.notificationSubject.next(notification);

    // Mostrar notificación del navegador
    this.showBrowserNotification(notification);
    
    // Reproducir sonido
    this.playNotificationSound(notification);

    this.logger.info('Notification added', { 
      id: notification.id, 
      type: notification.type,
      priority: notification.priority 
    });
  }

  /**
   * Marcar notificación como leída
   */
  markAsRead(notificationId: string) {
    const notifications = this.notifications();
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    this.notifications.set(updated);
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  markAllAsRead() {
    const notifications = this.notifications();
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    this.notifications.set(updated);
  }

  /**
   * Eliminar una notificación
   */
  removeNotification(notificationId: string) {
    const notifications = this.notifications();
    const filtered = notifications.filter(n => n.id !== notificationId);
    this.notifications.set(filtered);
  }

  /**
   * Limpiar todas las notificaciones
   */
  clearAll() {
    this.notifications.set([]);
  }

  /**
   * Limpiar todas las notificaciones
   */
  clearAllNotifications() {
    this.notifications.set([]);
    this.logger.info('Todas las notificaciones han sido limpiadas', {}, 'NotificationService');
  }

  /**
   * Actualizar configuración
   */
  updateSettings(newSettings: Partial<NotificationSettings>) {
    const currentSettings = this.settings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    this.settings.set(updatedSettings);
    
    // Guardar en localStorage
    localStorage.setItem('notification-settings', JSON.stringify(updatedSettings));
    
    // Reiniciar polling si cambió el intervalo
    if (newSettings.checkInterval) {
      this.startPolling();
    }

    this.logger.info('Notification settings updated', updatedSettings);
  }

  /**
   * Obtener stream de notificaciones
   */
  getNotificationStream(): Observable<Notification> {
    return this.notificationSubject.asObservable();
  }

  /**
   * Mostrar notificación del navegador
   */
  private showBrowserNotification(notification: Notification) {
    const settings = this.settings();
    
    if (!settings.enableDesktop || Notification.permission !== 'granted') {
      return;
    }

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.priority === 'critical'
    });

    browserNotification.onclick = () => {
      window.focus();
      if (notification.actionUrl) {
        // Navegar a la URL de acción
        window.location.href = notification.actionUrl;
      }
      browserNotification.close();
    };

    // Auto-cerrar después de 5 segundos (excepto críticas)
    if (notification.priority !== 'critical') {
      setTimeout(() => browserNotification.close(), 5000);
    }
  }

  /**
   * Reproducir sonido de notificación
   */
  private playNotificationSound(notification: Notification) {
    const settings = this.settings();
    
    if (!settings.enableSound) return;

    try {
      // Crear diferentes tonos según la prioridad
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Frecuencias según prioridad
      const frequencies: { [key: string]: number } = {
        'critical': 800,
        'high': 600,
        'medium': 500,
        'low': 400
      };

      oscillator.frequency.setValueAtTime(frequencies[notification.priority] || 500, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      // Doble beep para críticas
      if (notification.priority === 'critical') {
        setTimeout(() => {
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          
          oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime);
          oscillator2.type = 'sine';
          
          gainNode2.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator2.start(audioContext.currentTime);
          oscillator2.stop(audioContext.currentTime + 0.3);
        }, 400);
      }
    } catch (error) {
      this.logger.warn('Could not play notification sound', error);
    }
  }

  /**
   * Cargar configuración desde localStorage
   */
  private loadSettings() {
    try {
      const saved = localStorage.getItem('notification-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.settings.set({ ...this.settings(), ...settings });
      }
    } catch (error) {
      this.logger.warn('Could not load notification settings', error);
    }
  }

  /**
   * Generar ID único para notificaciones
   */
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Crear notificación de prueba (para testing)
   */
  createTestNotification(type: Notification['type'] = 'info') {
    this.addNotification({
      id: this.generateId(),
      title: '🧪 Notificación de Prueba',
      message: `Esta es una notificación de prueba de tipo ${type}`,
      type,
      timestamp: new Date(),
      isRead: false,
      priority: type === 'critical' ? 'critical' : 'medium'
    });
  }
}
