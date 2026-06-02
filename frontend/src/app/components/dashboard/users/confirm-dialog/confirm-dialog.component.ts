import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LucideAngularModule, AlertTriangle } from 'lucide-angular';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDanger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="p-6 max-w-md text-text-primary">
      <div class="flex items-start gap-3 mb-4">
        <div
          class="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          [ngClass]="
            data.confirmDanger
              ? 'bg-red-100 dark:bg-red-500/15'
              : 'bg-amber-100 dark:bg-amber-500/15'
          "
        >
          <lucide-angular
            [img]="icons.AlertTriangle"
            size="22"
            [ngClass]="data.confirmDanger ? 'text-error' : 'text-warning'"
          ></lucide-angular>
        </div>
        <div>
          <h2 class="text-lg font-bold text-text-primary">{{ data.title }}</h2>
          <p class="text-sm text-text-secondary mt-1 leading-relaxed">{{ data.message }}</p>
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button
          type="button"
          (click)="onCancel()"
          class="flex-1 px-4 py-2.5 rounded-xl border border-theme bg-bg-primary text-text-primary font-semibold hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
        >
          {{ data.cancelLabel || 'Cancel' }}
        </button>
        <button
          type="button"
          (click)="onConfirm()"
          class="flex-1 px-4 py-2.5 rounded-xl text-white font-semibold transition-colors"
          [ngClass]="
            data.confirmDanger
              ? 'bg-error hover:opacity-90'
              : 'bg-brand hover:bg-brand-hover'
          "
        >
          {{ data.confirmLabel || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  icons = { AlertTriangle };

  constructor(
    private dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
