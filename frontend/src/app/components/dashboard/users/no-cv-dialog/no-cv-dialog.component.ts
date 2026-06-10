import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LucideAngularModule, FileX } from 'lucide-angular';

@Component({
  selector: 'app-no-cv-dialog',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="p-6 max-w-sm text-text-primary">
      <div class="flex flex-col items-center text-center gap-3">
        <div class="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          <lucide-angular [img]="icons.FileX" size="28" class="text-text-muted"></lucide-angular>
        </div>
        <div>
          <h2 class="text-lg font-bold text-text-primary">No CV Found</h2>
          <p class="text-sm text-text-secondary mt-1">
            <span class="font-semibold text-text-primary">{{ data.userName }}</span>
            hasn't uploaded a CV yet.
          </p>
        </div>
        <button
          (click)="close()"
          class="mt-2 w-full px-4 py-2.5 rounded-xl bg-brand text-white font-semibold hover:opacity-90 transition-opacity"
        >
          OK
        </button>
      </div>
    </div>
  `,
})
export class NoCvDialogComponent {
  icons = { FileX };

  constructor(
    private dialogRef: MatDialogRef<NoCvDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { userName: string }
  ) {}

  close() { this.dialogRef.close(); }
}
