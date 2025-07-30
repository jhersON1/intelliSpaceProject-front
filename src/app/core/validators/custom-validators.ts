import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
  
  /**
   * Validador para códigos de producto (formato específico)
   */
  static productCode(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const codeRegex = /^[A-Z]{2,3}-\d{4,6}$/;
      return codeRegex.test(control.value) 
        ? null 
        : { productCode: { value: control.value, pattern: 'XX-0000 o XXX-000000' } };
    };
  }  
  
  /**
   * Validador para precios (debe ser positivo)
   */
  static positivePrice(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = parseFloat(control.value);
      return !isNaN(value) && value > 0 
        ? null 
        : { positivePrice: { value: control.value } };
    };
  }

  /**
   * Validador para URLs (formato básico)
   */
  static url(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || control.value.trim() === '') return null;
      
      try {
        new URL(control.value);
        return null;
      } catch {
        return { url: { value: control.value } };
      }
    };
  }

  /**
   * Validador para longitud mínima de palabras
   */
  static minWords(minWords: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || control.value.trim() === '') return null;
      
      const words = control.value.trim().split(/\s+/);
      const wordCount = words.length;
      
      return wordCount >= minWords 
        ? null 
        : { minWords: { actualWords: wordCount, requiredWords: minWords } };
    };
  }

  /**
   * Validador para archivos (tamaño y tipo)
   */
  static fileValidator(maxSizeKB: number, allowedTypes: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const file = control.value as File;
      const errors: ValidationErrors = {};

      if (file.size > maxSizeKB * 1024) {
        errors['fileSize'] = { 
          actualSize: Math.round(file.size / 1024), 
          maxSize: maxSizeKB 
        };
      }

      if (!allowedTypes.includes(file.type)) {
        errors['fileType'] = { 
          actualType: file.type, 
          allowedTypes 
        };
      }

      return Object.keys(errors).length > 0 ? errors : null;
    };
  }

  /**
   * Validador para confirmar que dos campos coinciden
   */
  static matchField(fieldName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;
      
      const matchControl = control.parent.get(fieldName);
      if (!matchControl) return null;
      
      return control.value === matchControl.value 
        ? null 
        : { matchField: { fieldName } };
    };
  }

  /**
   * Validador asíncrono para verificar disponibilidad
   */
  static asyncAvailabilityValidator(
    checkFn: (value: string) => Promise<boolean>,
    debounceMs = 300
  ): ValidatorFn {
    let timeoutId: any;
    
    return (control: AbstractControl): Promise<ValidationErrors | null> => {
      if (!control.value) {
        return Promise.resolve(null);
      }

      return new Promise((resolve) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          try {
            const isAvailable = await checkFn(control.value);
            resolve(isAvailable ? null : { notAvailable: { value: control.value } });
          } catch (error) {
            resolve({ availabilityCheckError: { error } });
          }
        }, debounceMs);
      });
    };
  }
}
