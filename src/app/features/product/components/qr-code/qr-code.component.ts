import { Component, Input, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QRCodeService } from '../../services/qr-code.service';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center p-6 bg-white rounded-lg shadow-lg max-w-sm mx-auto">
      <h5 class="text-lg font-semibold mb-4 text-gray-800 text-center">Escanea para ver en AR</h5>
      
      @if (qrCodeImage()) {
        <img 
          [src]="qrCodeImage()" 
          alt="QR Code para AR"
          class="w-40 h-40 mb-4 border-2 border-gray-200 rounded-lg">
      } @else if (loading()) {
        <div class="w-40 h-40 mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      } @else {
        <div class="w-40 h-40 mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
          <p class="text-gray-500 text-sm text-center">Error generando QR</p>
        </div>
      }
      
      <p class="text-sm text-gray-600 text-center mb-4">
        Abre la cámara de tu móvil y escanea el código para ver el producto en tu espacio
      </p>
      
      @if (arUrl()) {
        <a 
          [href]="arUrl()" 
          target="_blank"
          class="text-blue-600 hover:text-blue-800 text-sm underline transition-colors">
          Abrir enlace directo
        </a>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QrCodeComponent implements OnInit {
  private qrService = inject(QRCodeService);

  @Input() set productId(value: string) {
    if (value) {
      this.currentProductId.set(value);
      this.generateQR();
    }
  }

  currentProductId = signal<string>('');
  qrCodeImage = signal<string>('');
  arUrl = signal<string>('');
  loading = signal<boolean>(false);
  ngOnInit(): void {
    if (this.currentProductId()) {
      this.generateQR();
    }
  }
  private generateQR(): void {
    try {
      this.loading.set(true);
      
      const arUrl = this.qrService.generateARUrl(this.currentProductId());
      this.arUrl.set(arUrl);
      
      const qrImage = this.qrService.generateQRCode(arUrl);
      this.qrCodeImage.set(qrImage);
      
    } catch (error) {
      console.error('Error generando QR:', error);
    } finally {
      this.loading.set(false);
    }
  }
}