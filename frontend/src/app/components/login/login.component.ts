import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { LoginData } from '../../models/user.model';
import {
  LucideAngularModule,
  AtSign,
  KeyRound,
  User,
  Bot,
  Search,
  Eye,
  EyeClosed,
  Moon,
  Sun,
  Info,
  ArrowLeft,
  Mail,
  ShieldCheck,
} from 'lucide-angular';
import {
  trigger,
  transition,
  style,
  animate,
} from '@angular/animations';
import { ThemeService } from '../../services/theme.service';

type ForgotStep = 'email' | 'otp' | 'newPassword';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, LucideAngularModule],
  templateUrl: './login.component.html',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly icons = {
    User, Bot, Search, AtSign, KeyRound,
    Eye, EyeClosed, Moon, Sun, Info, ArrowLeft, Mail, ShieldCheck,
  };

  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  showForgotPassword = signal(false);
  forgotStep = signal<ForgotStep>('email');
  forgotEmail = signal('');
  forgotLoading = signal(false);
  forgotError = signal('');
  forgotSuccess = signal('');

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  newPasswordForm = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator },
  );

  private passwordMatchValidator(form: AbstractControl) {
    const pw = form.get('newPassword')?.value;
    const cpw = form.get('confirmPassword')?.value;
    return pw === cpw ? null : { mismatch: true };
  }

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.loginForm.value as LoginData).subscribe({
      next: (res) => {
        if (res.data.user.role !== 'admin') {
          this.errorMessage.set('Access denied. Admins only.');
          this.isLoading.set(false);
          return;
        }
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Invalid email or password');
        this.isLoading.set(false);
      },
    });
  }

  openForgotPassword() {
    this.showForgotPassword.set(true);
    this.forgotStep.set('email');
    this.forgotError.set('');
    this.forgotSuccess.set('');
    this.emailForm.reset();
    this.otpForm.reset();
    this.newPasswordForm.reset();
  }

  closeForgotPassword() {
    this.showForgotPassword.set(false);
  }

  goBack() {
    if (this.forgotStep() === 'otp') {
      this.forgotStep.set('email');
    } else if (this.forgotStep() === 'newPassword') {
      this.forgotStep.set('otp');
    } else {
      this.closeForgotPassword();
    }
    this.forgotError.set('');
  }


  onSendOtp() {
    if (this.emailForm.invalid) return;
    this.forgotLoading.set(true);
    this.forgotError.set('');

    const email = this.emailForm.value.email!;

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.forgotEmail.set(email);
        this.forgotStep.set('otp');
        this.forgotLoading.set(false);
      },
      error: (err) => {
        this.forgotError.set(err.error?.message || 'Something went wrong. Please try again.');
        this.forgotLoading.set(false);
      },
    });
  }


  onVerifyOtp() {
    if (this.otpForm.invalid) return;
    this.forgotLoading.set(true);
    this.forgotError.set('');

    this.authService.verifyOtp({
      email: this.forgotEmail(),
      otp: this.otpForm.value.otp!,
    }).subscribe({
      next: () => {
        this.forgotStep.set('newPassword');
        this.forgotLoading.set(false);
      },
      error: (err) => {
        this.forgotError.set(err.error?.message || 'Invalid OTP. Please try again.');
        this.forgotLoading.set(false);

      },
    });
  }


  onResetPassword() {
    if (this.newPasswordForm.invalid) return;
    this.forgotLoading.set(true);
    this.forgotError.set('');

    this.authService.resetPassword({
      email: this.forgotEmail(),
      otp: this.otpForm.value.otp!,
      newPassword: this.newPasswordForm.value.newPassword!,
    }).subscribe({
      next: () => {
        this.forgotSuccess.set('Password reset successfully! You can now sign in.');
        this.forgotLoading.set(false);
        setTimeout(() => this.closeForgotPassword(), 2000);
      },
      error: (err) => {
        this.forgotError.set(err.error?.message || 'Something went wrong. Please try again.');
        this.forgotLoading.set(false);
      },
    });
  }
}
