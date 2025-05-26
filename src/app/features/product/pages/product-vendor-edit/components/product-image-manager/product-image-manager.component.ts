import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    model,
    output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageStateService } from '../../services/image-state.service';


@Component({
    selector: 'app-product-image-manager',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-image-manager.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ImageStateService]
})
export class ProductImageManagerComponent {
    private readonly imageStateService = inject(ImageStateService);

    readonly maxImages = input<number>(10);
    readonly acceptedFormats = input<string>('image/*');
    readonly maxFileSize = input<number>(5); // MB
    readonly showCounter = input<boolean>(true);
    readonly allowMultiple = input<boolean>(true);
    readonly disabled = input<boolean>(false);

    readonly imageNames = model<string[]>([]);

    readonly imagesChange = output<string[]>();
    readonly validationError = output<string>();

    readonly images = this.imageStateService.images;
    readonly canAddMoreImages = this.imageStateService.canAddMoreImages;
    readonly selectedImage = this.imageStateService.selectedImage;
    readonly selectedImageIndex = this.imageStateService.selectedImageIndex;

    readonly imageCount = computed(() => this.images().length);
    readonly remainingSlots = computed(() => {
        const state = this.imageStateService.getState();
        const currentCount = state.existing.length - state.pendingDelete.length + state.newImages.length;
        return this.maxImages() - currentCount;
    });

    readonly canAddImages = computed(() =>
        this.canAddMoreImages() && !this.disabled()
    );

    constructor() {
        this.setupImageNamesSync();
    }

    public onFileSelected(event: Event): void {
        const files = this.getFilesFromEvent(event);
        if (!files?.length) return;

        const validationResult = this.validateFiles(Array.from(files));
        if (!validationResult.isValid) {
            this.validationError.emit(validationResult.message);
            this.resetFileInput(event.target as HTMLInputElement);
            return;
        }

        const success = this.imageStateService.addNewImages(Array.from(files));

        if (!success) {
            this.validationError.emit(this.getMaxImagesMessage());
        }

        this.resetFileInput(event.target as HTMLInputElement);
    }

    public selectImage(index: number): void {
        if (this.disabled()) return;
        this.imageStateService.selectImage(index);
    }

    public removeImage(index: number): void {
        if (this.disabled()) return;
        this.imageStateService.removeImage(index);
    }

    public initializeWithImages(visualRepresentations: any[]): void {
        this.imageStateService.initializeImages(visualRepresentations);
    }

    public getImageState() {
        return this.imageStateService.getState();
    }

    public resetImages(): void {
        this.imageStateService.reset();
    }

    private setupImageNamesSync(): void {
        effect(() => {
            const currentImages = this.images();
            const names = currentImages.map(img => img.name);

            // Update model and emit change
            this.imageNames.set(names);
            this.imagesChange.emit(names);
        });
    }

    private validateFiles(files: File[]): { isValid: boolean; message: string } {
        // Check file count
        if (files.length > this.remainingSlots()) {
            return {
                isValid: false,
                message: `Solo puedes agregar ${this.remainingSlots()} imagen(es) más. Máximo ${this.maxImages()} imágenes.`
            };
        }

        // Check file types and sizes
        for (const file of files) {
            if (!this.isValidFileType(file)) {
                return {
                    isValid: false,
                    message: `El archivo "${file.name}" no es un formato de imagen válido.`
                };
            }

            if (!this.isValidFileSize(file)) {
                return {
                    isValid: false,
                    message: `El archivo "${file.name}" excede el tamaño máximo de ${this.maxFileSize()}MB.`
                };
            }
        }

        return { isValid: true, message: '' };
    }

    private isValidFileType(file: File): boolean {
        const acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        return acceptedTypes.includes(file.type);
    }

    private isValidFileSize(file: File): boolean {
        const maxSizeBytes = this.maxFileSize() * 1024 * 1024;
        return file.size <= maxSizeBytes;
    }

    private getFilesFromEvent(event: Event): FileList | null {
        return (event.target as HTMLInputElement).files;
    }

    private getMaxImagesMessage(): string {
        return `Solo puedes agregar ${this.remainingSlots()} imagen(es) más. Máximo ${this.maxImages()} imágenes.`;
    }

    private resetFileInput(input: HTMLInputElement): void {
        input.value = '';
    }

    getThumbnailClasses(index: number): string {
        const baseClasses = 'hover:shadow-md';
        const selectedClasses = 'border-indigo-500 shadow-md';
        const defaultClasses = 'border-gray-300';

        return `${baseClasses} ${index === this.selectedImageIndex() ? selectedClasses : defaultClasses
            }`;
    }

    getUploadAreaClasses(): string {
        if (!this.canAddImages()) {
            return 'opacity-50 cursor-not-allowed';
        }

        return 'hover:bg-gray-50 border-gray-300 hover:border-indigo-400 text-gray-700';
    }
}
