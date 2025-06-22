import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { Message, CreateMessageRequest, UnreadCountResponse } from '../types/message.interface';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/messaging`;

  /**
   * Crear un nuevo mensaje (solo para consumers)
   */
  createMessage(messageData: CreateMessageRequest): Observable<Message> {
    return this.http.post<Message>(this.baseUrl, messageData);
  }

  /**
   * Obtener mensajes recibidos (para vendors)
   */
  getReceivedMessages(): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.baseUrl}/received`);
  }

  /**
   * Obtener mensajes enviados (para consumers)
   */
  getSentMessages(): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.baseUrl}/sent`);
  }

  /**
   * Obtener número de mensajes no leídos (para vendors)
   */
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.baseUrl}/unread-count`);
  }

  /**
   * Marcar mensaje como leído (para vendors)
   */
  markAsRead(messageId: string): Observable<Message> {
    return this.http.patch<Message>(`${this.baseUrl}/${messageId}/read`, {});
  }

  /**
   * Obtener un mensaje específico
   */
  getMessage(messageId: string): Observable<Message> {
    return this.http.get<Message>(`${this.baseUrl}/${messageId}`);
  }
}
