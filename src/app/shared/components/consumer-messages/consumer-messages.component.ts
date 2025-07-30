import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagingService } from '../../../core/services/messaging.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Message } from '../../../core/types/message.interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-consumer-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consumer-messages.component.html',
  styleUrls: ['./consumer-messages.component.css']
})
export class ConsumerMessagesComponent implements OnInit {
  private readonly messagingService = inject(MessagingService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  messages = signal<Message[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    if (!this.authService.isConsumer()) {
      this.router.navigate(['/']);
      return;
    }

    this.loadMessages();
  }

  loadMessages() {
    this.isLoading.set(true);
    this.messagingService.getSentMessages().subscribe({
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

  get isConsumer() {
    return this.authService.isConsumer();
  }
}
