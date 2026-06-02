import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LucideAngularModule, AlertTriangle, CheckCircle, Zap } from 'lucide-angular';
import { getUserDisplayName } from '../user-plan.util';
import { planBadgeClass as getPlanBadgeClass } from '../users-theme';

interface DialogData {
  user: { name: { en: string; ar: string } | string; email: string; plan: string };
  newPlan: string;
  isEnterprise: boolean;
}

@Component({
  selector: 'app-plan-update-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="p-6 max-w-md text-text-primary">
      <div class="flex items-center gap-3 mb-5">
        @if (data.isEnterprise) {
          <div
            class="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center"
          >
            <lucide-angular
              [img]="icons.AlertTriangle"
              size="24"
              class="text-purple-600 dark:text-purple-300"
            ></lucide-angular>
          </div>
          <div>
            <h2 class="text-xl font-bold text-text-primary">Enterprise Plan Upgrade</h2>
            <p class="text-sm text-text-secondary">Important confirmation required</p>
          </div>
        } @else {
          <div
            class="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center"
          >
            <lucide-angular
              [img]="icons.CheckCircle"
              size="24"
              class="text-violet-600 dark:text-violet-300"
            ></lucide-angular>
          </div>
          <div>
            <h2 class="text-xl font-bold text-text-primary">Change User Plan</h2>
            <p class="text-sm text-text-secondary">Confirm the plan change</p>
          </div>
        }
      </div>

      <div class="space-y-4 mb-6">
        <div class="rounded-xl p-4 border border-theme bg-bg-secondary">
          <p class="text-xs text-text-muted uppercase font-semibold mb-2">User</p>
          <p class="text-text-primary font-semibold">{{ userDisplayName }}</p>
          <p class="text-sm text-text-secondary">{{ data.user.email }}</p>
        </div>

        <div
          class="rounded-xl p-4 border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-950/20"
        >
          <p class="text-xs text-text-muted uppercase font-semibold mb-3">Plan Change</p>
          <div class="flex items-center justify-between mb-2">
            <div>
              <p class="text-sm text-text-secondary">Current Plan</p>
              <p class="text-lg font-bold text-text-primary">{{ data.user.plan }}</p>
            </div>
            <div class="text-2xl text-text-muted">→</div>
            <div>
              <p class="text-sm text-text-secondary">New Plan</p>
              <p class="text-lg font-bold" [ngClass]="planBadgeClass(data.newPlan)">
                {{ data.newPlan }}
              </p>
            </div>
          </div>
        </div>

        @if (data.isEnterprise) {
          <div
            class="rounded-xl p-4 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950/25"
          >
            <p
              class="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2 flex items-center gap-2"
            >
              <lucide-angular [img]="icons.Zap" size="16"></lucide-angular>
              Enterprise plan benefits
            </p>
            <ul class="text-sm text-purple-800 dark:text-purple-200/90 space-y-1.5">
              <li class="flex items-start gap-2">
                <span class="text-lg leading-none">✓</span><span>Unlimited AI Analysis</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-lg leading-none">✓</span><span>Priority Support</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-lg leading-none">✓</span><span>Custom Integrations</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-lg leading-none">✓</span><span>Dedicated Account Manager</span>
              </li>
            </ul>
          </div>
        } @else {
          <div
            class="rounded-xl p-4 border-l-4 border-violet-500 bg-violet-50 dark:bg-violet-950/25"
          >
            <p class="text-sm font-semibold text-violet-900 dark:text-violet-200 mb-2">
              Plan benefits
            </p>
            <p class="text-sm text-violet-800 dark:text-violet-200/90">
              The user will gain access to advanced features and increased token limits.
            </p>
          </div>
        }
      </div>

      <div class="flex gap-3">
        <button
          type="button"
          (click)="onCancel()"
          class="flex-1 px-4 py-2.5 rounded-xl border border-theme bg-bg-primary text-text-primary font-semibold hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          (click)="onConfirm()"
          class="flex-1 px-4 py-2.5 rounded-xl text-white font-semibold transition-colors"
          [ngClass]="
            data.isEnterprise
              ? 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600'
              : 'bg-brand hover:bg-brand-hover'
          "
        >
          @if (data.isEnterprise) {
            Confirm Enterprise Upgrade
          } @else {
            Change Plan
          }
        </button>
      </div>
    </div>
  `,
})
export class PlanUpdateDialogComponent {
  icons = { AlertTriangle, CheckCircle, Zap };
  userDisplayName: string;
  readonly planBadgeClass = getPlanBadgeClass;

  constructor(
    public dialogRef: MatDialogRef<PlanUpdateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {
    this.userDisplayName = getUserDisplayName(data.user.name);
  }

  onConfirm() {
    this.dialogRef.close(true);
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
