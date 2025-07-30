import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateProduct } from '../../../interfaces/product.interface';
import { ProductsService } from '../../../services/products.service';
import { FileUploadOrchestratorService } from './file-upload-orchestrator.service';

import { ImageManagerService } from './image-manager.service';
import { ARFileManagerService } from './ar-file-manager.service';
import { VisualRepresentationService } from './visual-representation.service';

@Injectable({
  providedIn: 'root'
})
export class ProductCreationService {
  private productService = inject(ProductsService);
  private router = inject(Router);
  private fileUploadOrchestrator = inject(FileUploadOrchestratorService);
  private visualRepresentationService = inject(VisualRepresentationService);
  private imageManager = inject(ImageManagerService);
  private arFileManager = inject(ARFileManagerService);

  readonly isSubmitting = signal<boolean>(false);
  readonly formError = signal<string | null>(null);
  readonly formSuccess = signal<boolean>(false);

  createProductComplete(productForm: FormGroup): Observable<any> {
    console.log('🚀 ProductCreationService.createProductComplete iniciado');
    
    if (this.isSubmitting()) {
      console.log('⚠️ Ya se está procesando una submisión, saltando...');
      throw new Error('Ya se está procesando una submisión');
    }

    this.isSubmitting.set(true);
    this.formError.set(null);

    return new Observable(observer => {
      // Paso 1: Subir todos los archivos a Cloudinary
      this.fileUploadOrchestrator.uploadAllFiles().subscribe({
        next: (uploadResult) => {
          console.log('✅ Archivos subidos exitosamente:', uploadResult);
          
          // Paso 2: Crear el producto en el backend
          const productData = this.buildProductFromForm(productForm);
          console.log('📦 Creando producto con datos:', productData);
          
          this.productService.createProduct(productData).subscribe({
            next: (createdProduct) => {
              
              // Paso 3: Crear las representaciones visuales
              this.visualRepresentationService.createAllVisualRepresentations(
                createdProduct.id,
                uploadResult.imageUrls,
                uploadResult.model3DUrls,
                uploadResult.experienceARUrls
              ).subscribe({
                next: (visualRepresentations) => {
                  this.handleSuccessfulCreation();
                  observer.next(createdProduct);
                  observer.complete();
                },
                error: (error) => {
                  this.handleCreationError(error);
                  observer.error(error);
                }
              });
            },
            error: (error) => {
              console.error('❌ Error al crear el producto:', error);
              this.handleCreationError(error);
              observer.error(error);
            }
          });
        },
        error: (error) => {
          console.error('❌ Error al subir archivos:', error);
          this.handleFileUploadError(error);
          observer.error(error);
        }
      });
    });
  }

  /**
   * Crea un producto completo con archivos e imágenes
   */
  createProduct(formData: any, images: any[], arFiles: any): Observable<any> {
    console.log('🚀 ProductCreationService.createProduct iniciado');
    
    this.isSubmitting.set(true);
    this.formError.set(null);

    return this.fileUploadOrchestrator.uploadAllFilesAndCreateProduct(
      formData,
      images,
      arFiles
    ).pipe(
      tap({
        next: () => {
          console.log('✅ Producto creado exitosamente');
          this.isSubmitting.set(false);
          this.formSuccess.set(true);
        },
        error: (error) => {
          console.error('❌ Error al crear producto:', error);
          this.isSubmitting.set(false);
          const errorMessage = error?.error?.message || 'Error al crear el producto';
          this.formError.set(errorMessage);
        }
      })
    );
  }

  /**
   * Construye el objeto CreateProduct desde el formulario
   */
  private buildProductFromForm(productForm: FormGroup): CreateProduct {
    const formValue = productForm.value;
    return {
      title: formValue.title,
      description: formValue.description,
      dimensions: formValue.dimensions,
      weight: formValue.weight,
      material: formValue.material,
      price: formValue.price,
      stock: formValue.stock,
      state: formValue.state,
      keywords: formValue.keywords,
      idCategory: formValue.idCategory
    };
  }

  /**
   * Maneja la creación exitosa del producto
   */
  private handleSuccessfulCreation(): void {
    console.log('🎉 Producto creado exitosamente!');
    
    this.formSuccess.set(true);
    this.isSubmitting.set(false);
      console.log('📝 Reseteando servicios...');
    this.resetAllServices();
    
    console.log('🧭 Navegando a /home/products...');
    this.router.navigate(['/home/products']).then(
      (success) => {
        console.log('✅ Navegación exitosa:', success);
      },
      (error) => {
        console.error('❌ Error en navegación:', error);
        // Fallback con window.location
        setTimeout(() => {
          window.location.href = '/products';
        }, 500);
      }
    );
  }

  /**
   * Maneja errores durante la creación del producto
   */
  private handleCreationError(error: any): void { 
    this.isSubmitting.set(false);
    const errorMessage = error?.error?.message || 'Ocurrió un error al crear el producto.';
    this.formError.set(errorMessage);
  }

  /**
   * Maneja errores durante la subida de archivos
   */
  private handleFileUploadError(error: any): void {
  
    this.isSubmitting.set(false);
    const errorMessage = error?.error?.message || 'Error al subir los archivos. Inténtelo nuevamente.';
    this.formError.set(errorMessage);
  }

  /**
   * Resetea todos los servicios relacionados
   */
  private resetAllServices(): void {
    this.imageManager.reset();
    this.arFileManager.reset();
    this.formSuccess.set(false);
  }

  /**
   * Método público para resetear el servicio
   */
  reset(): void {
    this.isSubmitting.set(false);
    this.formError.set(null);
    this.formSuccess.set(false);
    this.resetAllServices();
  }

  /**
   * Verifica si hay archivos para subir
   */
  hasFilesToUpload(): boolean {
    return this.fileUploadOrchestrator.hasFilesToUpload();
  }
}
