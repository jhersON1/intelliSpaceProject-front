import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateProduct } from '../../interfaces/product.interface';
import { ProductsService } from '../../services/products.service';
import { CategorySelectorComponent } from '../../components/category-selector/category-selector.component';
import { ProductFormBase } from '../../services/productFormBase.service';
import { ImageUploadService, CreateVisualRepresentationDto, ImageUploadResponse, FileUploadResponse, TypeRepresentation, FormatModel3D } from '../../services/image-upload.service';
import { forkJoin } from 'rxjs';

interface ImagePreview {
  name: string;
  url: string | ArrayBuffer;
  file?: File;
}

/**
 * Interfaz para definir la estructura de un archivo AR seleccionado.
 */
interface ARFile {
  file: File;
  url: string;
  name: string;
  size: number;
  format: string;
}

/**
 * Interfaz para los archivos AR organizados por tipo y plataforma.
 */
interface ARFiles {
  model3D: {
    android: ARFile | null;  // .glb para Android
    ios: ARFile | null;      // .usdz para iOS
  };
  experienceAR: {
    android: ARFile | null;  // .glb para Android  
    ios: ARFile | null;      // .usdz para iOS
  };
}

/**
 * Tipos de archivo AR disponibles.
 */
type ARFileType = 'model3D' | 'experienceAR';

/**
 * Plataformas soportadas para AR.
 */
type ARPlatform = 'android' | 'ios';

@Component({
  selector: 'app-product-create',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    CategorySelectorComponent
  ],
  templateUrl: './product-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private productService = inject(ProductsService);
  protected productFormBase = inject(ProductFormBase);
  private imageUploadService = inject(ImageUploadService);

  readonly productStatuses = this.productFormBase.productStatuses;
  readonly isSubmitting = this.productFormBase.isSubmitting;
  readonly formError = this.productFormBase.formError;
  readonly hierarchicalCategories = this.productFormBase.hierarchicalCategories;
  readonly selectedCategories = this.productFormBase.selectedCategories;
  readonly isUploadingImages = signal<boolean>(false);

  // Nuevas propiedades para archivos AR
  readonly currentARFiles = signal<ARFiles>({
    model3D: { android: null, ios: null },
    experienceAR: { android: null, ios: null }
  });
  readonly isUploadingAR = signal<boolean>(false);

  readonly formSuccess = signal<boolean>(false);
  readonly images = signal<ImagePreview[]>([]);
  readonly selectedImageIndex = signal<number>(-1);

  readonly selectedImage = computed(() => {
    const index = this.selectedImageIndex();
    const allImages = this.images();
    return index >= 0 && index < allImages.length ? allImages[index] : null;
  });

  readonly productForm = this.initializeProductForm();

  get imageUrlsArray(): FormArray {
    const control = this.productForm.get('imageUrls') as FormArray;
    return control || this.fb.array([]);
  }
  constructor() {
    console.log('🔧 ProductCreateComponent constructor ejecutándose...');
    this.setupImageSyncEffect();
    console.log('✅ ProductCreateComponent constructor completado');
  }
  ngOnInit(): void {
    console.log('🚀 ProductCreateComponent inicializado');
    this.loadCategories();
  }
  /**
   * Configuración del efecto para sincronizar imágenes
   */
  private setupImageSyncEffect(): void {
    console.log('🔄 Configurando effect para sincronización de imágenes...');
    effect(() => {
      const currentImages = this.images();
      const imageArray = this.imageUrlsArray;
      
      if (imageArray && imageArray.length !== currentImages.length) {
        this.syncImagesWithFormArray(currentImages);
      }
    });
    console.log('✅ Effect configurado exitosamente');
  }
  /**
   * Inicializa el formulario de producto agregando el FormArray de keywords
   * al formulario base proporcionado por ProductFormBase.
   * 
   * @returns FormGroup configurado para creación de productos
   */
  private initializeProductForm(): FormGroup {
    console.log('📝 Inicializando formulario de producto...');
    const baseForm = this.productFormBase.createBaseProductForm();

    // Agregar controles adicionales para creación
    (baseForm as any).addControl('keywords', this.fb.array([]));
    (baseForm as any).addControl('imageUrls', this.fb.array([]));

    console.log('✅ Formulario de producto inicializado:', baseForm.controls);
    return baseForm;
  }

  /**
   * Carga las categorías disponibles desde el servicio.
   * Maneja errores de carga y actualiza el estado de error si es necesario.
   */
  private loadCategories(): void {
    this.productFormBase.loadCategories().subscribe({
      next: () => {
        // Categorías cargadas exitosamente - no se requiere acción adicional
      },
      error: (error) => {
        const errorMessage = 'Error al cargar las categorías';
        this.formError.set(errorMessage);
        console.error(errorMessage, error);
      }
    });
  }

  /**
   * Maneja los cambios en la selección de categorías.
   * Delega la lógica al ProductFormBase para mantener consistencia.
   * 
   * @param categories - Array de IDs de categorías seleccionadas
   */
  onCategoriesChange(categories: string[]): void {
    this.productFormBase.onCategoriesChange(categories, this.productForm);
  }

  /**
   * Getter que proporciona acceso tipado a los controles de keywords.
   * Facilita la iteración en el template y proporciona type safety.
   * 
   * @returns Array de FormControl para las keywords
   */
  get keywordControls(): FormControl[] {
    const keywordsControl = this.productForm.get('keywords');

    if (keywordsControl instanceof FormArray) {
      return keywordsControl.controls as FormControl[];
    }

    return [];
  }

  /**
   * Agrega un nuevo campo de keyword al FormArray.
   * Crea un FormControl vacío y lo añade al final del array.
   */
  addKeyword(): void {
    const keywordsArray = this.getKeywordsArray();
    keywordsArray.push(new FormControl(''));
  }

  /**
   * Elimina un campo de keyword específico del FormArray.
   * 
   * @param index - Índice del campo a eliminar
   */
  removeKeyword(index: number): void {
    const keywordsArray = this.getKeywordsArray();
    keywordsArray.removeAt(index);
  }

  /**
   * Sincroniza las imágenes con el FormArray
   */
  private syncImagesWithFormArray(images: ImagePreview[]): void {
    this.clearFormArray();

    images.forEach(img => {
      const imageArray = this.imageUrlsArray;
      if (imageArray) {
        imageArray.push(this.fb.control(img.name));
      }
    });
  }

  private clearFormArray(): void {
    const imageArray = this.imageUrlsArray;
    if (imageArray) {
      while (imageArray.length) {
        imageArray.removeAt(0);
      }
    }
  }

  /**
   * Maneja la selección de archivos de imagen
   */
  public onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;

    this.processSelectedFiles(files);
    this.resetFileInput(event.target as HTMLInputElement);
  }

  private processSelectedFiles(files: FileList): void {
    Array.from(files).forEach(file => {
      this.readFileAsDataURL(file);
    });
  }

  private readFileAsDataURL(file: File): void {
    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result) {
        // Guardar tanto la URL como la referencia del archivo
        this.addImagePreview(file.name, reader.result, file);
      }
    };

    reader.readAsDataURL(file);
  }

  private addImagePreview(fileName: string, url: string | ArrayBuffer, file: File): void {
    this.images.update(currentImages => [
      ...currentImages,
      { name: fileName, url, file } // Incluir la referencia del archivo
    ]);

    this.selectedImageIndex.set(this.images().length - 1);
  }

  private resetFileInput(input: HTMLInputElement): void {
    input.value = '';
  }

  public selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  public removeImage(index: number): void {
    const currentImages = [...this.images()];
    const currentSelectedIndex = this.selectedImageIndex();

    currentImages.splice(index, 1);
    this.images.set(currentImages);

    this.updateSelectedIndexAfterRemoval(index, currentSelectedIndex, currentImages.length);
  }

  /**
   * Actualiza el índice seleccionado después de remover una imagen
   */
  private updateSelectedIndexAfterRemoval(removedIndex: number, currentSelectedIndex: number, remainingImagesCount: number): void {
    if (currentSelectedIndex === removedIndex) {
      this.selectedImageIndex.set(remainingImagesCount > 0 ? 0 : -1);
    } else if (currentSelectedIndex > removedIndex) {
      this.selectedImageIndex.update(idx => idx - 1);
    }
  }

  /**
   * Maneja el envío del formulario de creación de producto.
   * Valida los datos, envía la petición al servicio y maneja la respuesta.
   */
  onSubmit(): void {
    if (this.productForm.invalid) {
      this.handleInvalidForm();
      return;
    }

    this.submitProduct();
  }

  /**
   * Maneja el caso cuando el formulario es inválido.
   * Marca todos los campos como tocados y muestra mensaje de error.
   */
  private handleInvalidForm(): void {
    this.productFormBase.markFormGroupTouched(this.productForm);
    this.formError.set('Por favor, complete correctamente todos los campos requeridos.');
  }  private submitProduct(): void {
    // Prevenir llamadas múltiples mientras se está procesando
    if (this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.formError.set(null);

    // Subir archivos (imágenes y AR) y luego crear el producto
    this.uploadAllFilesAndCreateProduct();
  }  /**
   * Sube todos los archivos (imágenes, Model3D y ExperienceAR) a Cloudinary por separado y luego crea el producto
   */
  private uploadAllFilesAndCreateProduct(): void {
    const imagesToUpload = this.getFilesToUpload();
    const model3DFilesToUpload = this.getModel3DFilesToUpload();
    const experienceARFilesToUpload = this.getExperienceARFilesToUpload();
    
    const hasImages = imagesToUpload.length > 0;
    const hasModel3D = model3DFilesToUpload.length > 0;
    const hasExperienceAR = experienceARFilesToUpload.length > 0;

    console.log('🔄 uploadAllFilesAndCreateProduct iniciado');
    console.log('📸 Imágenes a subir:', imagesToUpload.length, imagesToUpload.map(f => f.name));
    console.log('🎯 Archivos Model3D a subir:', model3DFilesToUpload.length, model3DFilesToUpload.map(f => f.name));
    console.log('🚀 Archivos ExperienceAR a subir:', experienceARFilesToUpload.length, experienceARFilesToUpload.map(f => f.name));
    console.log('✅ hasImages:', hasImages, 'hasModel3D:', hasModel3D, 'hasExperienceAR:', hasExperienceAR);

    if (!hasImages && !hasModel3D && !hasExperienceAR) {
      console.log('⚠️ No hay archivos para subir, creando producto directamente');
      this.createProductAndHandleAllFiles([], [], []);
      return;
    }

    // Crear requests separados para cada tipo de archivo
    const uploadRequests = [];
    
    if (hasImages) {
      console.log('📤 Agregando request de imágenes');
      this.isUploadingImages.set(true);
      uploadRequests.push(this.imageUploadService.uploadMultipleImages(imagesToUpload));
    }
    
    if (hasModel3D) {
      console.log('📤 Agregando request de archivos Model3D');
      this.isUploadingAR.set(true);
      uploadRequests.push(this.imageUploadService.uploadModel3DFiles(model3DFilesToUpload));
    }

    if (hasExperienceAR) {
      console.log('📤 Agregando request de archivos ExperienceAR');
      this.isUploadingAR.set(true);
      uploadRequests.push(this.imageUploadService.uploadExperienceARFiles(experienceARFilesToUpload));
    }

    console.log('🚀 Enviando', uploadRequests.length, 'requests de upload a Cloudinary');

    forkJoin(uploadRequests).subscribe({
      next: (responses) => {
        console.log('✅ Respuestas de Cloudinary recibidas:', responses);
        this.isUploadingImages.set(false);
        this.isUploadingAR.set(false);
        
        // Procesar respuestas por posición
        let requestIndex = 0;
        let imageUrls: string[] = [];
        let model3DUrls: string[] = [];
        let experienceARUrls: string[] = [];
        
        if (hasImages) {
          imageUrls = (responses[requestIndex++] as ImageUploadResponse)?.images || [];
          console.log('🖼️ URLs de imágenes procesadas:', imageUrls);
        }
        
        if (hasModel3D) {
          model3DUrls = (responses[requestIndex++] as ImageUploadResponse)?.images || [];
          console.log('🎯 URLs de Model3D procesadas:', model3DUrls);
        }
        
        if (hasExperienceAR) {
          experienceARUrls = (responses[requestIndex++] as ImageUploadResponse)?.images || [];
          console.log('� URLs de ExperienceAR procesadas:', experienceARUrls);
        }
        
        this.createProductAndHandleAllFiles(imageUrls, model3DUrls, experienceARUrls);
      },
      error: (error) => {
        this.isUploadingImages.set(false);
        this.isUploadingAR.set(false);
        this.handleFileUploadError(error);
      }
    });
  }  /**
   * Crea el producto y luego envía todos los archivos al backend
   */
  private createProductAndHandleAllFiles(imageUrls: string[], model3DUrls: string[], experienceARUrls: string[]): void {
    // Crear el producto SIN archivos
    const formValue = this.productForm.value;
    const createProduct: CreateProduct = {
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

    this.productService.createProduct(createProduct).subscribe({
      next: (createdProduct) => {
        // Una vez creado el producto, enviar los archivos si los hay
        this.sendAllFilesToBackend(createdProduct.id, imageUrls, model3DUrls, experienceARUrls);
      },
      error: (error) => this.handleCreationError(error)
    });
  }  /**
   * Envía todos los archivos al backend: imágenes, Model3D y ExperienceAR
   */
  private sendAllFilesToBackend(productId: string, imageUrls: string[], model3DUrls: string[], experienceARUrls: string[]): void {
    console.log('🔧 sendAllFilesToBackend iniciado');
    console.log('📦 ProductID:', productId);
    console.log('🖼️ ImageUrls recibidas:', imageUrls);
    console.log('🎯 Model3DUrls recibidas:', model3DUrls);
    console.log('🚀 ExperienceARUrls recibidas:', experienceARUrls);
    
    const requests = [];

    // Agregar requests de imágenes
    if (imageUrls.length > 0) {
      console.log('📸 Procesando imágenes...');
      const imageRequests = imageUrls.map((url, index) => {
        const visualRepresentation: CreateVisualRepresentationDto = {
          productId: productId,
          type: TypeRepresentation.IMAGE,
          url: url,
          altText: `Imagen ${index + 1} del producto`,
          isPrincipal: index === 0
        };
        console.log('📸 Creando request de imagen:', visualRepresentation);
        return this.imageUploadService.createVisualRepresentation(visualRepresentation);
      });
      requests.push(...imageRequests);
      console.log('📸 Requests de imágenes agregados:', imageRequests.length);
    } else {
      console.log('ℹ️ No hay imágenes para procesar');
    }    // Agregar requests de archivos Model3D
    if (model3DUrls.length > 0) {
      console.log('🎯 Procesando archivos Model3D...');
      const model3DRequests = this.createModel3DVisualRepresentations(productId, model3DUrls);
      requests.push(...model3DRequests);
      console.log('🎯 Requests de Model3D agregados:', model3DRequests.length);
    } else {
      console.log('ℹ️ No hay archivos Model3D para procesar');
    }

    // Agregar requests de archivos ExperienceAR
    if (experienceARUrls.length > 0) {
      console.log('🚀 Procesando archivos ExperienceAR...');
      const experienceARRequests = this.createExperienceARVisualRepresentations(productId, experienceARUrls);
      requests.push(...experienceARRequests);
      console.log('🚀 Requests de ExperienceAR agregados:', experienceARRequests.length);
    } else {
      console.log('ℹ️ No hay archivos ExperienceAR para procesar');
    }

    console.log('📋 Total requests a enviar:', requests.length);
    if (requests.length > 0) {
      console.log('🚀 Enviando requests al backend...');
      forkJoin(requests).subscribe({
        next: (responses) => {
          console.log('✅ Respuestas del backend recibidas:', responses);
          this.handleSuccessfulCreation();
        },
        error: (error) => {
          console.error('❌ Error en requests al backend:', error);
          this.handleCreationError(error);
        }
      });
    } else {
      console.log('ℹ️ No hay requests para enviar, finalizando...');
      this.handleSuccessfulCreation();
    }
  }

  /**
   * Envía las imágenes al backend con la estructura correcta
   */  /**
   * Crea las representaciones visuales para archivos Model3D
   */
  private createModel3DVisualRepresentations(productId: string, model3DUrls: string[]): any[] {
    const requests = [];
    const arFiles = this.currentARFiles();
    
    console.log('🎯 createModel3DVisualRepresentations - productId:', productId);
    console.log('📁 URLs de Model3D recibidas:', model3DUrls);
    console.log('🗂️ Estado de archivos Model3D:', arFiles.model3D);

    if (model3DUrls.length > 0) {
      let urlIndex = 0;
      const androidUrl = arFiles.model3D.android ? model3DUrls[urlIndex++] : undefined;
      const iosUrl = arFiles.model3D.ios ? model3DUrls[urlIndex++] : undefined;
      
      if (androidUrl || iosUrl) {
        const model3DData: CreateVisualRepresentationDto = {
          productId: productId,
          type: TypeRepresentation.MODEL3D,
          url: androidUrl,                                    // URL para Android (.glb)
          urlIOS3D: iosUrl,                                  // URL para iOS (.usdz)
          format: this.getFormatFromFile(arFiles.model3D.android || arFiles.model3D.ios),
          texture: undefined,                                 // Opcional
          scale: { x: 1, y: 1, z: 1 }                        // Escala por defecto
        };
        console.log('🚀 Creando Visual Representation para Model3D:', model3DData);
        requests.push(this.imageUploadService.createVisualRepresentation(model3DData));
      }
    }

    console.log('📝 Total requests de Model3D a enviar:', requests.length);
    return requests;
  }

  /**
   * Crea las representaciones visuales para archivos ExperienceAR
   */
  private createExperienceARVisualRepresentations(productId: string, experienceARUrls: string[]): any[] {
    const requests = [];
    const arFiles = this.currentARFiles();
    
    console.log('🚀 createExperienceARVisualRepresentations - productId:', productId);
    console.log('📁 URLs de ExperienceAR recibidas:', experienceARUrls);
    console.log('🗂️ Estado de archivos ExperienceAR:', arFiles.experienceAR);

    if (experienceARUrls.length > 0) {
      let urlIndex = 0;
      const androidUrl = arFiles.experienceAR.android ? experienceARUrls[urlIndex++] : undefined;
      const iosUrl = arFiles.experienceAR.ios ? experienceARUrls[urlIndex++] : undefined;
      
      if (androidUrl || iosUrl) {
        const experienceARData: CreateVisualRepresentationDto = {
          productId: productId,
          type: TypeRepresentation.EXPERIENCEAR,
          url: androidUrl,                                    // URL para Android (.glb)
          urlIOSAR: iosUrl,                                  // URL para iOS (.usdz)
          instructions: 'Experiencia de realidad aumentada del producto',
          devicerequirements: ['ARCore', 'ARKit']           // Requerimientos por defecto
        };
        console.log('🚀 Creando Visual Representation para ExperienceAR:', experienceARData);
        requests.push(this.imageUploadService.createVisualRepresentation(experienceARData));
      }
    }

    console.log('📝 Total requests de ExperienceAR a enviar:', requests.length);
    return requests;
  }

  /**
   * Obtiene el formato del archivo basado en su extensión
   */
  private getFormatFromFile(arFile: ARFile | null): FormatModel3D {
    if (!arFile) return FormatModel3D.GLB;
    
    const format = arFile.format.toLowerCase();
    switch (format) {
      case 'glb': return FormatModel3D.GLB;
      case 'gltf': return FormatModel3D.GLTF;
      case 'usdz': return FormatModel3D.USDZ;
      case 'fbx': return FormatModel3D.FBX;
      case 'obj': return FormatModel3D.OBJ;
      case 'dae': return FormatModel3D.DAE;
      case 'usd': return FormatModel3D.USD;
      default: return FormatModel3D.GLB;
    }
  }

  /**
   * Obtiene los archivos File que necesitan ser subidos
   */
  private getFilesToUpload(): File[] {
    return this.images()
      .map(img => img.file)
      .filter((file): file is File => file instanceof File);
  }  /**
   * Obtiene solo los archivos Model3D para subir
   */
  private getModel3DFilesToUpload(): File[] {
    const files: File[] = [];
    const model3DFiles = this.currentARFiles().model3D;
    
    if (model3DFiles.android?.file) {
      files.push(model3DFiles.android.file);
    }
    if (model3DFiles.ios?.file) {
      files.push(model3DFiles.ios.file);
    }
    
    return files;
  }

  /**
   * Obtiene solo los archivos ExperienceAR para subir
   */
  private getExperienceARFilesToUpload(): File[] {
    const files: File[] = [];
    const experienceARFiles = this.currentARFiles().experienceAR;
    
    if (experienceARFiles.android?.file) {
      files.push(experienceARFiles.android.file);
    }
    if (experienceARFiles.ios?.file) {
      files.push(experienceARFiles.ios.file);
    }
    
    return files;
  }

  /**
   * Verifica si hay archivos Model3D seleccionados
   */
  private hasModel3DFiles(): boolean {
    const model3DFiles = this.currentARFiles().model3D;
    return !!(model3DFiles.android?.file || model3DFiles.ios?.file);
  }

  /**
   * Verifica si hay archivos ExperienceAR seleccionados
   */
  private hasExperienceARFiles(): boolean {
    const experienceARFiles = this.currentARFiles().experienceAR;
    return !!(experienceARFiles.android?.file || experienceARFiles.ios?.file);
  }

  /**
   * Maneja los errores durante la subida de imágenes
   */
  private handleImageUploadError(error: any): void {
    this.isSubmitting.set(false);
    const errorMessage = error?.error?.message || 'Error al subir las imágenes. Inténtelo nuevamente.';
    this.formError.set(errorMessage);
    console.error('Error uploading images:', error);
  }

  /**
   * Maneja los errores durante la subida de archivos
   */
  private handleFileUploadError(error: any): void {
    this.isSubmitting.set(false);
    const errorMessage = error?.error?.message || 'Error al subir los archivos. Inténtelo nuevamente.';
    this.formError.set(errorMessage);
    console.error('Error uploading files:', error);
  }

  /**
   * Maneja la respuesta exitosa de creación de producto.
   * Actualiza el estado, resetea el formulario y navega a la lista de productos.
   */
  private handleSuccessfulCreation(): void {
    this.formSuccess.set(true);
    this.isSubmitting.set(false);
    this.resetForm();
    this.router.navigate(['/products']);
  }

  /**
   * Maneja los errores durante la creación del producto.
   * Actualiza el estado de carga y muestra el mensaje de error correspondiente.
   * 
   * @param error - Error recibido del servicio
   */
  private handleCreationError(error: any): void {
    this.isSubmitting.set(false);
    const errorMessage = error?.error?.message || 'Ocurrió un error al crear el producto.';
    this.formError.set(errorMessage);
  }


  private getKeywordsArray(): FormArray {
    return this.productForm.get('keywords') as FormArray;
  }

  resetForm(): void {
    this.productForm.reset({
      state: this.productStatuses[0],
      weight: 0
    });

    this.clearKeywordsArray();
    this.images.set([]);
    this.selectedImageIndex.set(-1);

    this.formSuccess.set(false);
    this.productFormBase.resetSignals();
  }

  private clearKeywordsArray(): void {
    const keywordsArray = this.getKeywordsArray();

    while (keywordsArray.length > 0) {
      keywordsArray.removeAt(0);
    }
  }
  // ==============================================
  // MÉTODOS PARA MANEJO DE ARCHIVOS AR
  // ==============================================
  /**
   * Maneja la selección de archivos AR
   * @param eventData - Datos del evento que incluye event, type y platform
   */
  onARFileSelected(eventData: { event: Event; type: ARFileType; platform: ARPlatform }): void {
    console.log('🎯 ProductCreateComponent.onARFileSelected recibido:', eventData);
    
    const input = eventData.event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    console.log('📁 Archivo en componente padre:', file?.name, file?.size);
    
    if (!file) return;

    // Crear la representación del archivo AR
    const reader = new FileReader();
    reader.onload = () => {
      const arFile: ARFile = {
        file: file,
        url: reader.result as string,
        name: file.name,
        size: file.size,
        format: file.name.split('.').pop()?.toLowerCase() || ''
      };

      // Actualizar el estado de archivos AR
      this.currentARFiles.update(current => ({
        ...current,
        [eventData.type]: {
          ...current[eventData.type],
          [eventData.platform]: arFile
        }
      }));
    };
    
    reader.readAsDataURL(file);
    
    // Limpiar el input
    input.value = '';
  }

  /**
   * Maneja la eliminación de archivos AR
   * @param type - Tipo de archivo AR (model3D o experienceAR)
   * @param platform - Plataforma (android o ios)
   */
  onARFileRemoved(type: ARFileType, platform: ARPlatform): void {
    this.currentARFiles.update(current => ({
      ...current,
      [type]: {
        ...current[type],
        [platform]: null
      }
    }));
  }
  /**
   * Maneja la actualización de archivos AR
   * @param files - Estructura completa de archivos AR
   */
  onARFilesUpdated(files: ARFiles): void {
    console.log('🔄 ProductCreateComponent.onARFilesUpdated recibido:', files);
    this.currentARFiles.set(files);
  }
}
