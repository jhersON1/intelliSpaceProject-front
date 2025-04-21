import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  Validators,
  FormsModule,
  NonNullableFormBuilder,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreateUser } from '../../interfaces';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

type UserRole = 'consumidor' | 'vendedor';

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
  currentRole = signal<UserRole>('consumidor');
  fieldErrors = signal<Record<string, boolean>>({});
  passwordsDontMatch = signal(false);

  registrationForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    role: ['consumer', [Validators.required]],
    address: [''],
    businessName: [''],
    description: [''],
    sellerType: ['']
  });

  isConsumer = computed(() => this.currentRole() === 'consumidor');
  isVendor = computed(() => this.currentRole() === 'vendedor');

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
    });

    this.registrationForm.get('role')?.valueChanges
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
      this.registrationForm.get('businessName')?.clearValidators();
      this.registrationForm.get('description')?.clearValidators();
      this.registrationForm.get('sellerType')?.clearValidators();
    } else {
      this.registrationForm.get('businessName')?.setValidators([Validators.required]);
      this.registrationForm.get('description')?.setValidators([Validators.required]);
      this.registrationForm.get('sellerType')?.setValidators([Validators.required]);
      this.registrationForm.get('address')?.clearValidators();
    }

    ['address', 'businessName', 'description', 'sellerType'].forEach(field =>
      this.registrationForm.get(field)?.updateValueAndValidity({ emitEvent: false })
    );
  }

  validateField(fieldName: string): void {
    const control = this.registrationForm.get(fieldName);

    if (fieldName === 'address' && !this.isConsumer()) {
      this.updateFieldError(fieldName, false);
      return;
    }

    if (['businessName', 'description', 'sellerType'].includes(fieldName) && !this.isVendor()) {
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

  changeRole(newRole: UserRole): void {
    this.currentRole.set(newRole);
    this.registrationForm.get('role')?.setValue(newRole);
  }

  onSubmit(): void {
    this.formSubmitted.set(true);
    this.markAllAsTouched();
    this.validateAllFields();

    if (this.registrationForm.valid && !this.passwordsDontMatch()) {
      const body = this.registrationForm.value;

      this.authService.register(body as CreateUser).subscribe({
        next: () => {
          this.formSubmitted.set(false);
          this.registrationForm.reset();
          this.fieldErrors.set({});
          this.passwordsDontMatch.set(false);

        },
        error: (err) => {
          console.error(err);
          this.fieldErrors.set({ general: true });
        }
      })
    }
  }

  markAllAsTouched(): void {
    Object.keys(this.registrationForm.controls).forEach(key =>
      this.registrationForm.get(key)?.markAsTouched()
    );
  }
}
