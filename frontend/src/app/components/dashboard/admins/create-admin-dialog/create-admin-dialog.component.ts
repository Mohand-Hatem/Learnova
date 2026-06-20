import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LucideAngularModule, ShieldPlus, UserPlus, Building2 } from 'lucide-angular';

export interface CreateAccountPayload {
  name: {
    en: string;
    ar: string;
  };
  email: string;
  password: string;
  role: 'admin' | 'user' | 'company';
  skipLogin: true;
}

export interface CreateAccountDialogData {
  title: string;
  description: string;
  submitLabel: string;
  role: 'admin' | 'user' | 'company';
}

@Component({
  selector: 'app-create-admin-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="max-w-lg p-6 text-text-primary">
      <div class="mb-5 flex items-start gap-3">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/15">
          <lucide-angular [img]="icons[iconName]" size="22" class="text-indigo-600 dark:text-indigo-300"></lucide-angular>
        </div>
        <div>
          <h2 class="text-lg font-bold">{{ dialogData.title }}</h2>
          <p class="mt-1 text-sm text-text-secondary">
            {{ dialogData.description }}
          </p>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3.5">
        <div>
          <label class="mb-1 block text-xs font-semibold text-text-secondary">English Name</label>
          <input
            type="text"
            formControlName="nameEn"
            class="w-full rounded-xl border border-theme bg-bg-primary px-3 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold text-text-secondary">Arabic Name</label>
          <input
            type="text"
            formControlName="nameAr"
            class="w-full rounded-xl border border-theme bg-bg-primary px-3 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            placeholder="جون دو"
          />
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold text-text-secondary">Email</label>
          <input
            type="email"
            formControlName="email"
            class="w-full rounded-xl border border-theme bg-bg-primary px-3 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            placeholder="admin@example.com"
          />
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold text-text-secondary">Password</label>
          <input
            type="password"
            formControlName="password"
            class="w-full rounded-xl border border-theme bg-bg-primary px-3 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Minimum 8 characters"
          />
        </div>

        @if (form.invalid && submitted) {
          <p class="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
            Please fill all fields correctly before creating the account.
          </p>
        }

        <div class="mt-5 flex gap-3">
          <button
            type="button"
            (click)="close()"
            class="flex-1 rounded-xl border border-theme bg-bg-primary px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-violet-50 dark:hover:bg-violet-950/30"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            {{ dialogData.submitLabel }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class CreateAdminDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CreateAdminDialogComponent, CreateAccountPayload | null>);
  private readonly fb = inject(FormBuilder);
  private readonly data = inject<CreateAccountDialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly dialogData: CreateAccountDialogData = this.data ?? {
    title: 'Create New Admin',
    description: 'Add a new administrator account with full dashboard access.',
    submitLabel: 'Create Admin',
    role: 'admin',
  };
  readonly icons = { ShieldPlus, UserPlus, Building2 };
  submitted = false;

  readonly iconName: 'ShieldPlus' | 'UserPlus' | 'Building2' = this.dialogData.role === 'company'
    ? 'Building2'
    : this.dialogData.role === 'user'
      ? 'UserPlus'
      : 'ShieldPlus';

  readonly form = this.fb.group({
    nameEn: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    nameAr: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
  });

  close(): void {
    this.dialogRef.close(null);
  }

  submit(): void {
    this.submitted = true;
    if (this.form.invalid) return;

    const payload: CreateAccountPayload = {
      name: {
        en: (this.form.value.nameEn ?? '').trim(),
        ar: (this.form.value.nameAr ?? '').trim(),
      },
      email: (this.form.value.email ?? '').trim().toLowerCase(),
      password: this.form.value.password ?? '',
      role: this.dialogData.role,
      skipLogin: true,
    };
    this.dialogRef.close(payload);
  }
}

