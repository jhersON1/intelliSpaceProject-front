import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagingService } from '../../../core/services/messaging.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Message } from '../../../core/types/message.interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-vendor-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vendor-messages.component.html',
  styleUrls: ['./vendor-messages.component.css']
})
export class VendorMessagesComponent implements OnInit {
  private readonly messagingService = inject(MessagingService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  messages = signal<Message[]>([]);
  unreadCount = signal(0);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  selectedMessage = signal<Message | null>(null);

  ngOnInit() {
    // Verificar si es vendor
    if (!this.authService.isVendor()) {
      this.router.navigate(['/']);
      return;
    }

    this.loadMessages();
    this.loadUnreadCount();
  }

  loadMessages() {
    this.isLoading.set(true);
    this.messagingService.getReceivedMessages().subscribe({
      next: (messages) => {
        this.messages.set(messages);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        this.errorMessage.set('Error al cargar los mensajes');
        this.isLoading.set(false);
        console.error('Error loading messages:', error);
      }
    });
  }

  loadUnreadCount() {
    this.messagingService.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadCount.set(response.count);
      },
      error: (error: any) => {
        console.error('Error loading unread count:', error);
      }
    });
  }

  selectMessage(message: Message) {
    this.selectedMessage.set(message);
    
    // Marcar como leído si no está leído
    if (!message.isRead) {
      this.messagingService.markAsRead(message.id).subscribe({
        next: (updatedMessage) => {
          // Actualizar el mensaje en la lista
          const currentMessages = this.messages();
          const messageIndex = currentMessages.findIndex(m => m.id === message.id);
          if (messageIndex !== -1) {
            currentMessages[messageIndex] = updatedMessage;
            this.messages.set([...currentMessages]);
          }
          // Actualizar contador de no leídos
          this.loadUnreadCount();
        },
        error: (error: any) => {
          console.error('Error marking message as read:', error);
        }
      });
    }
  }

  closeMessageDetail() {
    this.selectedMessage.set(null);
  }

  navigateToProduct(productId: string) {
    this.router.navigate(['/home/products', productId, 'detail']);
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return 'Hace menos de 1 hora';
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    } else if (diffInDays < 7) {
      return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  }

  get isVendor() {
    return this.authService.isVendor();
  }
}
