import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type UserRole = 'consumidor' | 'vendedor';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  private fb = inject(FormBuilder);

  formSubmitted = signal(false);
  currentRole = signal<UserRole>('consumidor');
  fieldErrors = signal<Record<string, boolean>>({});
  passwordsDontMatch = signal(false);

  registroForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    rol: ['consumidor', [Validators.required]],
    aceptaTerminos: [false, [Validators.requiredTrue]],

    direccion: [''],

    nombreNegocio: [''],
    descripcion: [''],
    tipoVendedor: ['']
  });


  isConsumer = computed(() => this.currentRole() === 'consumidor');
  isVendor = computed(() => this.currentRole() === 'vendedor');


  hasFieldError = (fieldName: string) => computed(() => {
    if (fieldName === 'confirmPassword' && this.passwordsDontMatch()) {
      return true;
    }
    return this.fieldErrors()[fieldName] === true;
  });

  constructor() {
    this.setupPasswordValidation();

    effect(() => {
      if (this.formSubmitted()) {
        this.validateAllFields();
      }
    });


    Object.keys(this.registroForm.controls).forEach(field => {
      if (field !== 'password' && field !== 'confirmPassword') {
        this.registroForm.get(field)?.valueChanges
          .pipe(takeUntilDestroyed())
          .subscribe(() => {
            if (this.formSubmitted() || this.registroForm.get(field)?.touched) {
              this.validateField(field);
            }
          });
      }
    });

    this.registroForm.get('rol')?.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(newRole => {
        if (newRole) {
          this.currentRole.set(newRole as UserRole);
          this.updateValidators();
          if (this.formSubmitted()) {
            this.validateAllFields();
          }
        }
      });
  }

  setupPasswordValidation(): void {
    const checkPasswordsMatch = () => {
      const password = this.registroForm.get('password')?.value;
      const confirmPassword = this.registroForm.get('confirmPassword')?.value;

      if (password && confirmPassword) {
        this.passwordsDontMatch.set(password !== confirmPassword);
      } else {
        this.passwordsDontMatch.set(false);
      }

      this.validateField('confirmPassword');
    };

    this.registroForm.get('password')?.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        checkPasswordsMatch();
        this.validateField('password');
      });

    this.registroForm.get('confirmPassword')?.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        checkPasswordsMatch();
      });
  }

  updateValidators(): void {
    const isConsumer = this.currentRole() === 'consumidor';

    if (isConsumer) {
      this.registroForm.get('direccion')?.setValidators([Validators.required]);

      this.registroForm.get('nombreNegocio')?.clearValidators();
      this.registroForm.get('descripcion')?.clearValidators();
      this.registroForm.get('tipoVendedor')?.clearValidators();
    } else {
      this.registroForm.get('nombreNegocio')?.setValidators([Validators.required]);
      this.registroForm.get('descripcion')?.setValidators([Validators.required]);
      this.registroForm.get('tipoVendedor')?.setValidators([Validators.required]);

      this.registroForm.get('direccion')?.clearValidators();
    }

    this.registroForm.get('direccion')?.updateValueAndValidity({ emitEvent: false });
    this.registroForm.get('nombreNegocio')?.updateValueAndValidity({ emitEvent: false });
    this.registroForm.get('descripcion')?.updateValueAndValidity({ emitEvent: false });
    this.registroForm.get('tipoVendedor')?.updateValueAndValidity({ emitEvent: false });
  }

  validateField(fieldName: string): void {
    const control = this.registroForm.get(fieldName);

    if (fieldName === 'direccion' && !this.isConsumer()) {
      this.updateFieldError(fieldName, false);
      return;
    }

    if (['nombreNegocio', 'descripcion', 'tipoVendedor'].includes(fieldName) && !this.isVendor()) {
      this.updateFieldError(fieldName, false);
      return;
    }

    if (fieldName !== 'confirmPassword') {
      this.updateFieldError(fieldName, !!control?.invalid && !!control?.touched);
    } else {

      const isInvalid = (!!control?.invalid && !!control?.touched);
      this.updateFieldError(fieldName, isInvalid);
    }
  }

  validateAllFields(): void {
    Object.keys(this.registroForm.controls).forEach(field => {
      this.validateField(field);
    });

    const password = this.registroForm.get('password')?.value;
    const confirmPassword = this.registroForm.get('confirmPassword')?.value;
    if (password && confirmPassword) {
      this.passwordsDontMatch.set(password !== confirmPassword);
    }
  }

  updateFieldError(fieldName: string, hasError: boolean): void {
    this.fieldErrors.update(current => ({
      ...current,
      [fieldName]: hasError
    }));
  }

  cambiarRol(nuevoRol: UserRole): void {
    this.currentRole.set(nuevoRol);
    this.registroForm.get('rol')?.setValue(nuevoRol);
  }

  onSubmit(): void {
    this.formSubmitted.set(true);
    this.markAllAsTouched();
    this.validateAllFields();

    if (this.registroForm.valid && !this.passwordsDontMatch()) {
      console.log('Formulario enviado:', this.registroForm.value);
    }
  }

  markAllAsTouched(): void {
    Object.keys(this.registroForm.controls).forEach(key => {
      this.registroForm.get(key)?.markAsTouched();
    });
  }
}
