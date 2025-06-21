import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <!-- Notification Bell Button -->
      <button 
        (click)="togglePanel()"
        class="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        [class.bg-gray-100]="showPanel()">
        
        <!-- Bell Icon -->
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        
        <!-- Notification Badge -->
        @if (unreadCount() > 0) {
          <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {{ unreadCount() > 99 ? '99+' : unreadCount() }}
          </span>
        }
      </button>

      <!-- Notification Panel -->
      @if (showPanel()) {
        <div class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          
          <!-- Panel Header -->
          <div class="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Notificaciones</h3>
            <div class="flex items-center space-x-2">
              @if (unreadCount() > 0) {
                <button 
                  (click)="markAllAsRead()"
                  class="text-sm text-blue-600 hover:text-blue-800">
                  Marcar todas como leídas
                </button>
              }
              <button 
                (click)="togglePanel()"
                class="text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Notifications List -->
          <div class="max-h-96 overflow-y-auto">
            @if (notifications().length === 0) {
              <div class="p-8 text-center text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <p>No hay notificaciones</p>
              </div>
            } @else {
              @for (notification of notifications(); track notification.id) {
                <div 
                  class="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  [class.bg-blue-50]="!notification.isRead"
                  (click)="handleNotificationClick(notification)">
                  
                  <div class="flex items-start space-x-3">
                    <!-- Type Icon -->
                    <div class="flex-shrink-0 mt-1">
                      @switch (notification.type) {
                        @case ('critical') {
                          <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                        }
                        @case ('warning') {
                          <div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        }
                        @case ('info') {
                          <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                        }
                        @default {
                          <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
                        }
                      }
                    </div>

                    <!-- Notification Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <p class="text-sm font-medium text-gray-900" [class.font-bold]="!notification.isRead">
                          {{ notification.title }}
                        </p>
                        <span class="text-xs text-gray-500">
                          {{ getTimeAgo(notification.timestamp) }}
                        </span>
                      </div>
                      <p class="text-sm text-gray-600 mt-1">
                        {{ notification.message }}
                      </p>
                      @if (notification.productName) {
                        <p class="text-xs text-gray-500 mt-1">
                          Producto: {{ notification.productName }}
                        </p>
                      }
                    </div>

                    <!-- Actions -->
                    <div class="flex-shrink-0">
                      @if (!notification.isRead) {
                        <button 
                          (click)="markAsRead(notification.id); $event.stopPropagation()"
                          class="text-blue-600 hover:text-blue-800 text-xs">
                          Marcar como leída
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Panel Footer -->
          @if (notifications().length > 0) {
            <div class="p-4 border-t border-gray-200 bg-gray-50">
              <button 
                (click)="clearAllNotifications()"
                class="w-full text-sm text-gray-600 hover:text-gray-800">
                Limpiar todas las notificaciones
              </button>
            </div>
          }
        </div>
      }
    </div>

    <!-- Overlay to close panel when clicking outside -->
    @if (showPanel()) {
      <div 
        class="fixed inset-0 z-40" 
        (click)="closePanel()">
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class NotificationPanelComponent {
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Signals
  showPanel = signal(false);
  
  // Computed properties
  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;
  
  /**
   * Toggle notification panel visibility
   */
  togglePanel(): void {
    this.showPanel.update(show => !show);
  }

  /**
   * Close notification panel
   */
  closePanel(): void {
    this.showPanel.set(false);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId);
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.notificationService.clearAllNotifications();
  }

  /**
   * Handle notification click
   */
  handleNotificationClick(notification: Notification): void {
    // Mark as read
    if (!notification.isRead) {
      this.markAsRead(notification.id);
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
      this.closePanel();
    }
  }

  /**
   * Get time ago text
   */
  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return timestamp.toLocaleDateString();
  }
}
