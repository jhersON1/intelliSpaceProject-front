import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationStateService, NotificationState } from '../../../core/services/notification-state.service';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [CommonModule],  template: `
    <!-- Container responsive -->
    <div class="fixed top-4 right-4 z-50 space-y-2 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-sm xl:max-w-sm 
                px-4 sm:px-0 pointer-events-none">
      @for (notification of notificationService.notifications(); track notification.id) {
        <div 
          [class]="getNotificationClasses(notification)"
          class="w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden 
                 transform transition-all duration-300 ease-in-out animate-slide-in-right">
          
          <div class="p-3 sm:p-4">
            <div class="flex items-start">
              <!-- Icono - más pequeño en móviles -->
              <div class="flex-shrink-0">
                <svg 
                  [class]="getIconClasses(notification)" 
                  class="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24">
                  @switch (notification.type) {
                    @case ('success') {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    }
                    @case ('error') {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    }
                    @case ('warning') {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0l-6.928 8c-.77.833.192 2.5 1.732 2.5z"></path>
                    }
                    @case ('info') {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    }
                  }
                </svg>
              </div>
              
              <!-- Contenido - texto más pequeño en móviles -->
              <div class="ml-2 sm:ml-3 w-0 flex-1 pt-0.5">
                <p [class]="getTextClasses(notification)" 
                   class="text-xs sm:text-sm font-medium leading-tight break-words">
                  {{ notification.message }}
                </p>
              </div>
              
              <!-- Botón cerrar - más pequeño en móviles -->
              <div class="ml-2 sm:ml-4 flex-shrink-0 flex">
                <button 
                  (click)="closeNotification(notification.id)"
                  [class]="getCloseButtonClasses(notification)"
                  class="inline-flex rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 
                         hover:bg-gray-100 transition-colors duration-200">
                  <span class="sr-only">Cerrar</span>
                  <svg class="h-3 w-3 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" 
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                          clip-rule="evenodd"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Barra de progreso para duración -->
          @if (notification.duration && notification.duration > 0) {
            <div [class]="getProgressBarClasses(notification)" class="h-0.5 sm:h-1">
              <div 
                class="h-full transition-all ease-linear animate-progress-bar"
                [style.animation-duration]="notification.duration + 'ms'">
              </div>
            </div>
          }
        </div>
      }
    </div>
    
    <style>
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes progressBar {
        from { width: 100%; }
        to { width: 0%; }
      }
      
      .animate-slide-in-right {
        animation: slideInRight 0.3s ease-out;
      }
      
      .animate-progress-bar {
        animation: progressBar linear;
        width: 100%;
        animation-fill-mode: forwards;
      }
      
      @media (max-width: 320px) {
        .fixed.top-4.right-4 {
          top: 0.5rem;
          right: 0.5rem;
          left: 0.5rem;
          width: auto;
          max-width: none;
        }
      }
      
      @media (min-width: 768px) and (max-width: 1024px) {
        .fixed.top-4.right-4 {
          max-width: 20rem;
        }
      }
    </style>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationContainerComponent {
  protected readonly notificationService = inject(NotificationStateService);

  closeNotification(id: string): void {
    this.notificationService.removeNotification(id);
  }

  getNotificationClasses(notification: NotificationState): string {
    const baseClasses = 'bg-white border-l-4';
    
    switch (notification.type) {
      case 'success':
        return `${baseClasses} border-green-500`;
      case 'error':
        return `${baseClasses} border-red-500`;
      case 'warning':
        return `${baseClasses} border-yellow-500`;
      case 'info':
        return `${baseClasses} border-blue-500`;
      default:
        return `${baseClasses} border-gray-500`;
    }
  }

  getIconClasses(notification: NotificationState): string {
    switch (notification.type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  }

  getTextClasses(notification: NotificationState): string {
    switch (notification.type) {
      case 'success':
        return 'text-green-900';
      case 'error':
        return 'text-red-900';
      case 'warning':
        return 'text-yellow-900';
      case 'info':
        return 'text-blue-900';
      default:
        return 'text-gray-900';
    }
  }

  getCloseButtonClasses(notification: NotificationState): string {
    const baseClasses = 'p-1.5 hover:bg-opacity-20 focus:bg-opacity-20 rounded-md';
    
    switch (notification.type) {
      case 'success':
        return `${baseClasses} text-green-500 hover:bg-green-50 focus:ring-green-600`;
      case 'error':
        return `${baseClasses} text-red-500 hover:bg-red-50 focus:ring-red-600`;
      case 'warning':
        return `${baseClasses} text-yellow-500 hover:bg-yellow-50 focus:ring-yellow-600`;
      case 'info':
        return `${baseClasses} text-blue-500 hover:bg-blue-50 focus:ring-blue-600`;
      default:
        return `${baseClasses} text-gray-500 hover:bg-gray-50 focus:ring-gray-600`;
    }
  }

  getProgressBarClasses(notification: NotificationState): string {
    switch (notification.type) {
      case 'success':
        return 'bg-green-200';
      case 'error':
        return 'bg-red-200';
      case 'warning':
        return 'bg-yellow-200';
      case 'info':
        return 'bg-blue-200';
      default:
        return 'bg-gray-200';
    }
  }

  getProgressPercentage(notification: NotificationState): number {
    if (!notification.duration) return 0;
    
    const elapsed = Date.now() - notification.timestamp;
    const percentage = (1 - elapsed / notification.duration) * 100;
    return Math.max(0, Math.min(100, percentage));
  }
}
