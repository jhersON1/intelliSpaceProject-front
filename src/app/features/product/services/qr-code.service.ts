import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';

@Injectable({
  providedIn: 'root'
})
export class QRCodeService {

  async generateQRCode(url: string): Promise<string> {
    try {
      return await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generando QR:', error);
      throw error;
    }
  }

  generateARUrl(productId: string): string {
    // URL que apuntará a tu aplicación con parámetros para AR
    const baseUrl = window.location.origin;
    return `${baseUrl}/#/home/products/${productId}/detail?mode=ar&mobile=true`;
  }
}