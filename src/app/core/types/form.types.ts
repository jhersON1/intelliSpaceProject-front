/**
 * Tipos para formularios tipados y validaciones
 */

export interface FormFieldError {
  key: string;
  message: string;
  params?: Record<string, any>;
}

export interface FormValidationState {
  isValid: boolean;
  errors: FormFieldError[];
  touchedFields: Set<string>;
  dirtyFields: Set<string>;
}

export type FormFieldValue<T> = T extends string 
  ? string 
  : T extends number 
  ? number 
  : T extends boolean 
  ? boolean 
  : T extends Date 
  ? Date 
  : T extends Array<infer U> 
  ? Array<U> 
  : T;

export interface TypedFormControl<T = any> {
  value: T;
  valid: boolean;
  invalid: boolean;
  errors: Record<string, any> | null;
  touched: boolean;
  dirty: boolean;
}

export interface FormSubmissionState {
  isSubmitting: boolean;
  hasSubmitted: boolean;
  submissionError: string | null;
  lastSubmissionTime: number | null;
}
