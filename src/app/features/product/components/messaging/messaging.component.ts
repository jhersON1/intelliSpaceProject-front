import { Component, Input, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MessagingService } from '../../../../core/services/messaging.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { Product } from '../../interfaces/product.interface';
import { CreateMessageRequest } from '../../../../core/types/message.interface';

@Component({
  selector: 'app-messaging',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './messaging.component.html',
  styleUrls: ['./messaging.component.css']
})
export class MessagingComponent implements OnInit {
  @Input() product!: Product;

  private readonly fb = inject(FormBuilder);
  private readonly messagingService = inject(MessagingService);
  private readonly authService = inject(AuthService);

  messageForm: FormGroup;
  isSubmitting = signal(false);
  isSuccess = signal(false);
  errorMessage = signal<string | null>(null);
  isExpanded = signal(false);

  constructor() {
    this.messageForm = this.fb.group({
      subject: ['', [Validators.required, Validators.maxLength(100)]],
      content: ['', [Validators.required, Validators.maxLength(1000)]]
    });
  }

  ngOnInit() {
    // Pre-llenar el asunto con el nombre del producto
    if (this.product?.title) {
      const defaultSubject = `Consulta sobre: ${this.product.title}`;
      this.messageForm.patchValue({ subject: defaultSubject });
    }
  }

  toggleExpanded() {
    this.isExpanded.set(!this.isExpanded());
    if (this.isExpanded()) {
      this.resetForm();
    }
  }

  onSubmit() {
    if (this.messageForm.invalid || !this.product || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);    const messageData: CreateMessageRequest = {
      subject: this.messageForm.value.subject,
      content: this.messageForm.value.content,
      productId: this.product.id,
      vendorId: this.product.vendor!.id
    };

    this.messagingService.createMessage(messageData).subscribe({
      next: () => {
        this.isSuccess.set(true);
        this.isSubmitting.set(false);
        this.messageForm.reset();
        
        // Pre-llenar el asunto nuevamente
        if (this.product?.title) {
          const defaultSubject = `Consulta sobre: ${this.product.title}`;
          this.messageForm.patchValue({ subject: defaultSubject });
        }

        // Ocultar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          this.isSuccess.set(false);
          this.isExpanded.set(false);
        }, 3000);
      },      error: (error: any) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.error?.message || 'Error al enviar el mensaje');
      }
    });
  }

  private resetForm() {
    this.messageForm.reset();
    this.isSuccess.set(false);
    this.errorMessage.set(null);
    
    // Pre-llenar el asunto
    if (this.product?.title) {
      const defaultSubject = `Consulta sobre: ${this.product.title}`;
      this.messageForm.patchValue({ subject: defaultSubject });
    }
  }

  get isAuthenticated() {
    return this.authService.isAuthenticated();
  }

  get isConsumer() {
    return this.authService.isConsumer();
  }

  get canSendMessage() {
    return this.isAuthenticated && this.isConsumer;
  }
}
