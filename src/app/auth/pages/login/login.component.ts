import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private fb = inject(FormBuilder);

  formSubmitted = signal(false);
  fieldErrors = signal<Record<string, boolean>>({});
  isAuthenticating = signal(false);
  authError = signal<string | null>(null);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false]
  });

  hasFieldError = (fieldName: string) => computed(() => {
    return this.fieldErrors()[fieldName] === true;
  });

  constructor() {
    // Suscribirse a cambios en los campos del formulario
    Object.keys(this.loginForm.controls).forEach(field => {
      this.loginForm.get(field)?.valueChanges
        .pipe(takeUntilDestroyed())
        .subscribe(() => {
          if (this.formSubmitted() || this.loginForm.get(field)?.touched) {
            this.validateField(field);
          }
        });
    });
  }

  validateField(fieldName: string): void {
    const control = this.loginForm.get(fieldName);
    
    if (fieldName !== 'rememberMe') {
      this.updateFieldError(fieldName, !!control?.invalid && !!control?.touched);
    }
  }

  validateAllFields(): void {
    Object.keys(this.loginForm.controls).forEach(field => {
      if (field !== 'rememberMe') {
        this.validateField(field);
      }
    });
  }

  updateFieldError(fieldName: string, hasError: boolean): void {
    this.fieldErrors.update(current => ({
      ...current,
      [fieldName]: hasError
    }));
  }

  onSubmit(): void {
    this.formSubmitted.set(true);
    this.markAllAsTouched();
    this.validateAllFields();
    this.authError.set(null);

    if (this.loginForm.valid) {
      this.isAuthenticating.set(true);
      
      // Simulación de una autenticación con delay
      setTimeout(() => {
        // Aquí iría la lógica real de autenticación
        const credentialsValid = false; // Simulación de credenciales incorrectas
        
        if (credentialsValid) {
          console.log('Inicio de sesión exitoso:', this.loginForm.value);
          // Redireccionar al usuario a la página principal o dashboard
        } else {
          this.authError.set('Correo electrónico o contraseña incorrectos');
        }
        
        this.isAuthenticating.set(false);
      }, 1000);
    }
  }

  markAllAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      if (key !== 'rememberMe') {
        this.loginForm.get(key)?.markAsTouched();
      }
    });
  }
}
