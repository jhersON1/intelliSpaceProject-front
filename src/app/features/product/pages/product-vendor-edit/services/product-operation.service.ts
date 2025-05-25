import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ImageUploadService } from '../../../services/image-upload.service';
import { ProductsService } from '../../../services/products.service';
import { VisualRepresentationService } from '../../../services/visual-representation.service';
import { ImageOperationResult } from '../interface/image-state.interface';


@Injectable({
  providedIn: 'root'
})
export class ProductOperationsService {
  private readonly productService = inject(ProductsService);
  private readonly visualRepresentationService = inject(VisualRepresentationService);
  private readonly imageUploadService = inject(ImageUploadService);

  async deleteImages(imageIds: string[]): Promise<ImageOperationResult> {
    try {
      const deletePromises = imageIds.map(id => 
        firstValueFrom(this.visualRepresentationService.deleteVisualRepresentation(id))
      );
      
      await Promise.all(deletePromises);
      
      return {
        success: true,
        message: `${imageIds.length} imágenes eliminadas exitosamente`,
        deletedCount: imageIds.length
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al eliminar imágenes'
      };
    }
  }

  async uploadAndCreateImages(files: File[], productId: string): Promise<ImageOperationResult> {
    try {
      const uploadResponse = await firstValueFrom(this.imageUploadService.uploadMultipleImages(files));
      
      if (!uploadResponse?.images?.length) {
        throw new Error('No se pudieron subir las imágenes');
      }

      const createPromises = uploadResponse.images.map((url, index) => {
        const createDto = {
          productId,
          type: 'Image',
          url,
          altText: files[index].name,
          isPrincipal: false
        };
        
        return firstValueFrom(this.imageUploadService.createVisualRepresentation(createDto));
      });

      await Promise.all(createPromises);

      return {
        success: true,
        message: `${files.length} nuevas imágenes creadas exitosamente`,
        uploadedCount: files.length
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al subir y crear imágenes'
      };
    }
  }

  async updateProduct(productId: string, updateData: any): Promise<ImageOperationResult> {
    try {
      await firstValueFrom(this.productService.updateProduct(productId, updateData));
      
      return {
        success: true,
        message: 'Datos del producto actualizados exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al actualizar el producto'
      };
    }
  }
}