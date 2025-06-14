import { Injectable, signal, computed } from '@angular/core';
import { FormGroup, FormControl, AbstractControl } from '@angular/forms';
import { FormFieldError, FormValidationState, FormSubmissionState } from '../types/form.types';

/**
 * Servicio para manejo centralizado de errores de formularios
 */
@Injectable({
  providedIn: 'root'
})
export class FormErrorHandlingService {
  
  private readonly _validationState = signal<FormValidationState>({
    isValid: true,
    errors: [],
    touchedFields: new Set(),
    dirtyFields: new Set()
  });

  private readonly _submissionState = signal<FormSubmissionState>({
    isSubmitting: false,
    hasSubmitted: false,
    submissionError: null,
    lastSubmissionTime: null
  });

  // Señales públicas
  public readonly validationState = computed(() => this._validationState());
  public readonly submissionState = computed(() => this._submissionState());
  public readonly hasErrors = computed(() => this._validationState().errors.length > 0);
  public readonly isFormValid = computed(() => this._validationState().isValid);

  /**
   * Mensajes de error predefinidos
   */
  private readonly errorMessages: Record<string, string> = {
    required: 'Este campo es requerido',
    email: 'Ingresa un email válido',
    minlength: 'Mínimo {requiredLength} caracteres',
    maxlength: 'Máximo {requiredLength} caracteres',
    min: 'El valor debe ser mayor a {min}',
    max: 'El valor debe ser menor a {max}',
    pattern: 'Formato inválido',
    productCode: 'Código debe seguir el formato {pattern}',
    positivePrice: 'El precio debe ser mayor a 0',
    url: 'Ingresa una URL válida',
    minWords: 'Debe tener al menos {requiredWords} palabras',
    fileSize: 'El archivo no debe superar {maxSize}KB',
    fileType: 'Tipo de archivo no permitido',
    matchField: 'Los campos no coinciden',
    notAvailable: 'Este valor no está disponible',
    availabilityCheckError: 'Error al verificar disponibilidad'
  };

  /**
   * Actualiza el estado de validación del formulario
   */
  updateValidationState(form: FormGroup): void {
    const errors = this.extractFormErrors(form);
    const touchedFields = this.getTouchedFields(form);
    const dirtyFields = this.getDirtyFields(form);

    this._validationState.set({
      isValid: form.valid,
      errors,
      touchedFields,
      dirtyFields
    });
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getFieldError(fieldName: string): string | null {
    const fieldErrors = this._validationState().errors.filter(error => 
      error.key === fieldName
    );
    
    return fieldErrors.length > 0 ? fieldErrors[0].message : null;
  }

  /**
   * Obtiene todos los errores de un campo
   */
  getFieldErrors(fieldName: string): FormFieldError[] {
    return this._validationState().errors.filter(error => error.key === fieldName);
  }

  /**
   * Verifica si un campo ha sido tocado
   */
  isFieldTouched(fieldName: string): boolean {
    return this._validationState().touchedFields.has(fieldName);
  }

  /**
   * Verifica si un campo está dirty
   */
  isFieldDirty(fieldName: string): boolean {
    return this._validationState().dirtyFields.has(fieldName);
  }

  /**
   * Inicia el estado de envío del formulario
   */
  startSubmission(): void {
    this._submissionState.update(state => ({
      ...state,
      isSubmitting: true,
      submissionError: null
    }));
  }

  /**
   * Finaliza el estado de envío exitoso
   */
  completeSubmission(): void {
    this._submissionState.update(state => ({
      ...state,
      isSubmitting: false,
      hasSubmitted: true,
      lastSubmissionTime: Date.now()
    }));
  }

  /**
   * Finaliza el estado de envío con error
   */
  failSubmission(error: string): void {
    this._submissionState.update(state => ({
      ...state,
      isSubmitting: false,
      hasSubmitted: true,
      submissionError: error,
      lastSubmissionTime: Date.now()
    }));
  }

  /**
   * Resetea el estado del formulario
   */
  resetState(): void {
    this._validationState.set({
      isValid: true,
      errors: [],
      touchedFields: new Set(),
      dirtyFields: new Set()
    });

    this._submissionState.set({
      isSubmitting: false,
      hasSubmitted: false,
      submissionError: null,
      lastSubmissionTime: null
    });
  }

  /**
   * Extrae errores de todos los campos del formulario
   */
  private extractFormErrors(form: FormGroup): FormFieldError[] {
    const errors: FormFieldError[] = [];

    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control && control.errors && control.touched) {
        Object.keys(control.errors).forEach(errorKey => {
          const errorData = control.errors![errorKey];
          const message = this.buildErrorMessage(errorKey, errorData);
          
          errors.push({
            key,
            message,
            params: errorData
          });
        });
      }
    });

    return errors;
  }

  /**
   * Obtiene los campos que han sido tocados
   */
  private getTouchedFields(form: FormGroup): Set<string> {
    const touchedFields = new Set<string>();
    
    Object.keys(form.controls).forEach(key => {
      if (form.get(key)?.touched) {
        touchedFields.add(key);
      }
    });

    return touchedFields;
  }

  /**
   * Obtiene los campos que están dirty
   */
  private getDirtyFields(form: FormGroup): Set<string> {
    const dirtyFields = new Set<string>();
    
    Object.keys(form.controls).forEach(key => {
      if (form.get(key)?.dirty) {
        dirtyFields.add(key);
      }
    });

    return dirtyFields;
  }

  /**
   * Construye el mensaje de error interpolando parámetros
   */
  private buildErrorMessage(errorKey: string, errorData: any): string {
    let message = this.errorMessages[errorKey] || 'Error de validación';
    
    if (errorData && typeof errorData === 'object') {
      Object.keys(errorData).forEach(param => {
        const placeholder = `{${param}}`;
        if (message.includes(placeholder)) {
          message = message.replace(placeholder, errorData[param]);
        }
      });
    }

    return message;
  }
}
