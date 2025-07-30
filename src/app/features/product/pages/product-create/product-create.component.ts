import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ArModelSectionComponent } from './components/ar-model-section/ar-model-section.component';
import { ImageSectionComponent } from './components/image-section/image-section.component';
import { ProductFormSectionComponent } from './components/product-form-section/product-form-section.component';
import { ProductFormBase } from '../../services/productFormBase.service';
import {
  ImageManagerService,
  ARFileManagerService,
  ProductCreationService,
  FormManagerService
} from './services/index';

@Component({
  selector: 'app-product-create',
  standalone: true, imports: [
    CommonModule,
    ReactiveFormsModule,
    ArModelSectionComponent,
    ImageSectionComponent,
    ProductFormSectionComponent
  ],
  templateUrl: './product-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCreateComponent implements OnInit {
  protected productFormBase = inject(ProductFormBase);
  private imageManager = inject(ImageManagerService);
  private arFileManager = inject(ARFileManagerService);
  private productCreationService = inject(ProductCreationService);
  private formManager = inject(FormManagerService);
  readonly isSubmitting = this.productCreationService.isSubmitting;
  readonly formError = this.productCreationService.formError;
  readonly formSuccess = this.productCreationService.formSuccess;
  readonly isUploadingImages = this.imageManager.isUploadingImages;

  readonly productForm = this.formManager.initializeProductForm();
  get imageUrlsArray() {
    return this.formManager.getImageUrlsArray();
  }

  constructor() {
    console.log('🔧 ProductCreateComponent constructor ejecutándose...');
    console.log('✅ ProductCreateComponent constructor completado');
  }
  ngOnInit(): void {
    console.log('🚀 ProductCreateComponent inicializado');
  }

  public onModel3DFileSelected(event: Event, platform: 'android' | 'ios'): void {
    this.arFileManager.onModel3DFileSelected(event, platform);
  }

  public removeModel3DFile(platform: 'android' | 'ios'): void {
    this.arFileManager.removeModel3DFile(platform);
  }

  public onExperienceARFileSelected(event: Event, platform: 'android' | 'ios'): void {
    this.arFileManager.onExperienceARFileSelected(event, platform);
  }

  public removeExperienceARFile(platform: 'android' | 'ios'): void {
    this.arFileManager.removeExperienceARFile(platform);
  }

  /**
   * Maneja el envío del formulario de creación de producto.
   * Valida los datos y delega la creación al servicio.
   */
  onSubmit(): void {
    console.log('🚀 onSubmit iniciado');

    if (this.productForm.invalid) {
      console.log('⚠️ Formulario inválido, manejando errores...');
      this.handleInvalidForm();
      return;
    }

    console.log('✅ Formulario válido, procediendo con creación del producto...');
    this.createProduct();
  }

  /**
   * Maneja el caso cuando el formulario es inválido.
   */
  private handleInvalidForm(): void {
    this.productFormBase.markFormGroupTouched(this.productForm);
    this.productCreationService.formError.set('Por favor, complete correctamente todos los campos requeridos.');
  }
  /**
   * Inicia el proceso de creación del producto delegando al servicio.
   */
  private createProduct(): void {
    this.productCreationService.createProductComplete(this.productForm).subscribe({
      next: () => {
        console.log('✅ Producto creado exitosamente');
        // No necesitamos llamar resetForm aquí porque ya se maneja en el servicio
      },
      error: (error) => {
        console.error('❌ Error al crear producto:', error);
      }
    });
  }/**
   * Resetea el formulario y los estados después de una creación exitosa.
   */
  public resetForm(): void {
    this.productForm.reset();
    this.imageManager.clearImages();
    this.arFileManager.clearARFiles();
    this.formManager.resetKeywords();
  }
}
