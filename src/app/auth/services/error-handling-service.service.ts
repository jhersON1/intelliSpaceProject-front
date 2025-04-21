import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {

  handleError(error: any): void {
    console.error('An error occurred:', error);
    // Implementar lógica de manejo de errores
  }
}
