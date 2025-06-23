import { Injectable } from '@angular/core';
import { environment } from '@environments/environments';

@Injectable({
  providedIn: 'root'
})
export class QRCodeService {
  private readonly baseUrl: string = environment.baseUrl;

  generateQRCode(url: string): string {
    try {
      // Generate QR using native browser QR API when available
      // For now, create a modern SVG-based QR placeholder
      return this.generateModernQR(url);
    } catch (error) {
      console.error('Error generando QR:', error);
      return this.generateFallbackQR(url);
    }
  }

  private generateModernQR(text: string): string {
    // Create a modern SVG QR code pattern
    const size = 200;
    const modules = 25; // 25x25 grid for QR
    const moduleSize = size / modules;

    // Simple deterministic pattern based on text hash
    const hash = this.simpleHash(text);

    let svgContent = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
    svgContent += `<rect width="${size}" height="${size}" fill="white"/>`;

    // Generate pattern based on hash
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        const shouldFill = this.shouldFillModule(x, y, hash, modules);
        if (shouldFill) {
          const rectX = x * moduleSize;
          const rectY = y * moduleSize;
          svgContent += `<rect x="${rectX}" y="${rectY}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
        }
      }
    }

    // Add corner squares (QR positioning markers)
    this.addPositionMarkers(svgContent, moduleSize, modules);

    svgContent += '</svg>';

    return `data:image/svg+xml;base64,${btoa(svgContent)}`;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private shouldFillModule(x: number, y: number, hash: number, modules: number): boolean {
    // Create a pattern based on position and hash
    const position = y * modules + x;
    const pattern = (hash + position) % 7;

    // Corner positioning markers
    if (this.isPositionMarker(x, y, modules)) {
      return this.getPositionMarkerPattern(x, y, modules);
    }

    // Data pattern
    return pattern < 3;
  }

  private isPositionMarker(x: number, y: number, modules: number): boolean {
    const cornerSize = 7;

    // Top-left corner
    if (x < cornerSize && y < cornerSize) return true;

    // Top-right corner
    if (x >= modules - cornerSize && y < cornerSize) return true;

    // Bottom-left corner
    if (x < cornerSize && y >= modules - cornerSize) return true;

    return false;
  }

  private getPositionMarkerPattern(x: number, y: number, modules: number): boolean {
    const cornerSize = 7;
    let localX = x;
    let localY = y;

    // Adjust coordinates for top-right corner
    if (x >= modules - cornerSize) {
      localX = x - (modules - cornerSize);
    }

    // Adjust coordinates for bottom-left corner
    if (y >= modules - cornerSize) {
      localY = y - (modules - cornerSize);
    }

    // QR position marker pattern (7x7)
    const pattern = [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1]
    ];

    if (localY < pattern.length && localX < pattern[localY].length) {
      return pattern[localY][localX] === 1;
    }

    return false;
  }

  private addPositionMarkers(svgContent: string, moduleSize: number, modules: number): void {
    // Position markers are already handled in the main loop
    // This method is kept for future enhancements
  }

  private generateFallbackQR(text: string): string {
    // Canvas-based fallback
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      // Ultra-simple fallback - just return a data URL with text
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="white" stroke="black"/>
          <text x="100" y="100" font-family="Arial" font-size="12" text-anchor="middle" fill="black">QR Code</text>
          <text x="100" y="120" font-family="Arial" font-size="10" text-anchor="middle" fill="black">${text.substring(0, 25)}</text>
        </svg>
      `)}`;
    }

    canvas.width = 200;
    canvas.height = 200;

    // Create a simple pattern
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 200, 200);

    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 180, 180);

    // Add some pattern
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if ((i + j) % 3 === 0) {
          ctx.fillRect(20 + i * 16, 20 + j * 16, 12, 12);
        }
      }
    }

    return canvas.toDataURL();
  }

  generateARUrl(productId: string): string {

    return `${this.baseUrl}/#/home/products/${productId}/detail?mode=ar&mobile=true`;
  }
}