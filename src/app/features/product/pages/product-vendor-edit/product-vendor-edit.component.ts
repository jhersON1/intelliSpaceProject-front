import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductStatus, Product, UpdateProduct } from '../../interfaces/product.interface';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../services/products.service';
import { CategoryService } from '../../services/category.service';

interface ImagePreview {
  name: string;
  url: string | ArrayBuffer;
}

@Component({
  selector: 'app-product-vendor-edit',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './product-vendor-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductVendorEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductsService);
  private categoryService = inject(CategoryService)

  ProductStatus = ProductStatus;

  images = signal<ImagePreview[]>([]);
  selectedImageIndex = signal<number>(-1);

  selectedImage = computed(() => {
    const index = this.selectedImageIndex();
    const allImages = this.images();
    return index >= 0 && index < allImages.length ? allImages[index] : null;
  });

  form: FormGroup = this.fb.group({
    id: [null],
    title: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    weight: [0, [Validators.required, Validators.min(0)]],
    state: [ProductStatus.AVAILABLE, Validators.required],
    category: [''],
    material: [''],
    imageUrls: this.fb.array([]),
    dimensionsHeight: [0],
    dimensionsWidth: [0],
    dimensionsDepth: [0],
    keywords: [''],
    idCategory: [[], [Validators.required]]
  });

  get imageUrlsArray(): FormArray {
    return this.form.get('imageUrls') as FormArray;
  }

  constructor() {
    effect(() => {
      const currentImages = this.images();

      if (this.imageUrlsArray.length !== currentImages.length) {
        this.syncImagesWithFormArray(currentImages);
      }
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    this.productService.getVendorProduct(id!).subscribe({
      next: (product: Product) => {
        console.log('Producto cargado:', product);
        this.patchFormValues(product);
      },
      error: (err) => {
        console.error('Error al cargar producto:', err);
      }
    });
  }

  private syncImagesWithFormArray(images: ImagePreview[]) {

    while (this.imageUrlsArray.length) {
      this.imageUrlsArray.removeAt(0);
    }

    images.forEach(img => {
      this.imageUrlsArray.push(this.fb.control(img.name));
    });
  }

  private patchFormValues(product: Product) {

    const dimensions = product.dimensions as any || {};

    if (product.imageUrl) {

      const imageUrls = Array.isArray(product.imageUrl) ? product.imageUrl : [product.imageUrl];
      const newImages = imageUrls.map(url => ({
        name: this.getFileNameFromUrl(url),
        url: url
      }));

      this.images.set(newImages);

      if (newImages.length > 0) {
        this.selectedImageIndex.set(0);
      }
    }

    this.form.patchValue({
      id: product.id,
      title: product.title,
      description: product.description || '',
      price: product.price || 0,
      stock: product.stock || 0,
      weight: product.weight,
      state: product.state,
      category: product.category || '',
      material: product.material || '',
      dimensionsHeight: dimensions.height || 0,
      dimensionsWidth: dimensions.width || 0,
      dimensionsDepth: dimensions.depth || 0,
      keywords: product.keywords?.join(', ') || ''
    });
  }

  private getFileNameFromUrl(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  public onFileSelected(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = () => {
        if (reader.result) {
          this.images.update((currentImages: any) => [
            ...currentImages,
            {
              name: file.name,
              url: reader.result
            }
          ]);

          this.selectedImageIndex.set(this.images().length - 1);
        }
      };

      reader.readAsDataURL(file);
    }

    (event.target as HTMLInputElement).value = '';
  }

  public selectImage(index: number) {
    this.selectedImageIndex.set(index);
  }

  public removeImage(index: number) {
    const currentImages = [...this.images()];
    const currentSelectedIndex = this.selectedImageIndex();

    currentImages.splice(index, 1);

    this.images.set(currentImages);

    if (currentSelectedIndex === index) {
      this.selectedImageIndex.set(currentImages.length > 0 ? 0 : -1);
    } else if (currentSelectedIndex > index) {
      this.selectedImageIndex.update((idx: number) => idx - 1);
    }
  }

  public onSubmit() {
    if (this.form.valid) {
      const formData = this.form.value;

      //Todo: cambiar por UdateProduct
      const updated: any = {
        title: formData.title,
        description: formData.description,
        imageUrl: formData.imageUrls,
        category: formData.category,
        weight: formData.weight,
        price: formData.price,
        material: formData.material,
        stock: formData.stock,
        state: formData.state,
        dimensions: {
          height: formData.dimensionsHeight,
          width: formData.dimensionsWidth,
          depth: formData.dimensionsDepth
        },
        keywords: formData.keywords ? formData.keywords.split(',').map((k: string) => k.trim()) : []
      };

      //todo: cuando se incorpore estos atributos al backend, se deben incluir en el body
      const { imageUrl, category, ...body } = updated;

      this.productService.updateProduct(formData.id, body).subscribe({
        next: (res) => {
          console.log('Producto actualizado:', res);
          this.router.navigate(['/home/my-products']);
        },
        error: (err) => {
          console.error('Error al actualizar producto:', err);
        }
      });
    }
  }

  public onCancel() {
    this.router.navigate(['/home/my-products']);
  }
}
