import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  Validators,
  FormsModule,
  NonNullableFormBuilder,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreateUser, userRole } from '../../interfaces';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  private fb = inject(NonNullableFormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  formSubmitted = signal(false);
  currentRole = signal<userRole>(userRole.CONSUMER);
  fieldErrors = signal<Record<string, boolean>>({});
  passwordsDontMatch = signal(false);

  registrationForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['Abc123456', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['Abc123456', [Validators.required]],
    name: ['', [Validators.required]],
    lastname: ['', [Validators.required]],
    rol: [userRole.CONSUMER, [Validators.required]],
    address: [''],
    nameBusiness: [''],
    description: [''],
    typeVendor: ['']
  });

  isConsumer = computed(() => this.currentRole() === userRole.CONSUMER);
  isVendor = computed(() => this.currentRole() === userRole.VENDOR);

  hasFieldError = (fieldName: string) => computed(() => {
    if (fieldName === 'confirmPassword' && this.passwordsDontMatch()) {
      return true;
    }
    return !!this.fieldErrors()[fieldName];
  });

  constructor() {
    this.setupPasswordValidation();

    effect(() => {
      if (this.formSubmitted()) {
        this.validateAllFields();
      }
    });

    Object.keys(this.registrationForm.controls).forEach(field => {
      if (field !== 'password' && field !== 'confirmPassword') {
        this.registrationForm.get(field)?.valueChanges
          .pipe(takeUntilDestroyed())
          .subscribe(() => {
            if (this.formSubmitted() || this.registrationForm.get(field)?.touched) {
              this.validateField(field);
            }
          });
      }
    });    this.registrationForm.get('rol')?.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(newRole => {
        if (newRole) {
          this.currentRole.set(newRole);
          this.updateValidators();
          if (this.formSubmitted()) {
            this.validateAllFields();
          }
        }
      });
  }

  setupPasswordValidation(): void {
    const checkPasswordsMatch = () => {
      const password = this.registrationForm.get('password')?.value;
      const confirmPassword = this.registrationForm.get('confirmPassword')?.value;

      if (password && confirmPassword) {
        this.passwordsDontMatch.set(password !== confirmPassword);
      } else {
        this.passwordsDontMatch.set(false);
      }

      this.validateField('confirmPassword');
    };

    this.registrationForm.get('password')?.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        checkPasswordsMatch();
        this.validateField('password');
      });

    this.registrationForm.get('confirmPassword')?.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        checkPasswordsMatch();
      });
  }

  updateValidators(): void {
    if (this.isConsumer()) {
      this.registrationForm.get('address')?.setValidators([Validators.required]);
      this.registrationForm.get('nameBusiness')?.clearValidators();
      this.registrationForm.get('description')?.clearValidators();
      this.registrationForm.get('typeVendor')?.clearValidators();
    } else {
      this.registrationForm.get('nameBusiness')?.setValidators([Validators.required]);
      this.registrationForm.get('description')?.setValidators([Validators.required]);
      this.registrationForm.get('typeVendor')?.setValidators([Validators.required]);
      this.registrationForm.get('address')?.clearValidators();
    }

    ['address', 'nameBusiness', 'description', 'typeVendor'].forEach(field =>
      this.registrationForm.get(field)?.updateValueAndValidity({ emitEvent: false })
    );
  }

  validateField(fieldName: string): void {
    const control = this.registrationForm.get(fieldName);

    if (fieldName === 'address' && !this.isConsumer()) {
      this.updateFieldError(fieldName, false);
      return;
    }

    if (['nameBusiness', 'description', 'typeVendor'].includes(fieldName) && !this.isVendor()) {
      this.updateFieldError(fieldName, false);
      return;
    }

    const hasError = !!control?.invalid && !!control?.touched;
    this.updateFieldError(fieldName, hasError);
  }

  validateAllFields(): void {
    Object.keys(this.registrationForm.controls).forEach(field => this.validateField(field));

    const pwd = this.registrationForm.get('password')?.value;
    const cpw = this.registrationForm.get('confirmPassword')?.value;
    if (pwd && cpw) {
      this.passwordsDontMatch.set(pwd !== cpw);
    }
  }

  updateFieldError(fieldName: string, hasError: boolean): void {
    this.fieldErrors.update(current => ({
      ...current,
      [fieldName]: hasError
    }));
  }

  changeRole(newRole: string): void {
    if (newRole === 'consumer') {
      this.currentRole.set(userRole.CONSUMER);
      this.registrationForm.get('rol')?.setValue(userRole.CONSUMER);
    } else if (newRole === 'vendor') {
      this.currentRole.set(userRole.VENDOR);
      this.registrationForm.get('rol')?.setValue(userRole.VENDOR);
    } else {
      console.error('Invalid role selected');
      return;
    }
  }
  onSubmit(): void {
    this.formSubmitted.set(true);
    this.markAllAsTouched();
    this.validateAllFields();

    if (this.registrationForm.valid && !this.passwordsDontMatch()) {
      const { confirmPassword, ...body } = this.registrationForm.value;
      
      // Debug: log para verificar qué se está enviando
      console.log('🔍 DEBUG - Datos del formulario antes de enviar:', {
        formValue: this.registrationForm.value,
        bodyToSend: body,
        currentRole: this.currentRole(),
        isConsumer: this.isConsumer(),
        isVendor: this.isVendor()
      });

      this.authService.register(body as CreateUser).subscribe({
        next: () => {
          console.log('✅ Registro exitoso');
          this.formSubmitted.set(false);
          this.registrationForm.reset();
          this.fieldErrors.set({});
          this.passwordsDontMatch.set(false);
          this.router.navigate(['/home']);
        },
        error: (err) => {
          console.error('❌ Error en registro:', err);
          this.fieldErrors.set({ general: true });
        }
      })
    } else {
      console.log('🚫 Formulario inválido:', {
        formErrors: this.registrationForm.errors,
        passwordMatch: !this.passwordsDontMatch(),
        formValid: this.registrationForm.valid
      });
    }
  }

  markAllAsTouched(): void {
    Object.keys(this.registrationForm.controls).forEach(key =>
      this.registrationForm.get(key)?.markAsTouched()
    );
  }
}
