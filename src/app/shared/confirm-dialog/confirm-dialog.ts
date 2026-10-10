import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmDialogData {
  name: string;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>¿Eliminar registro?</h2>
    <mat-dialog-content>
      Se eliminará <strong>{{ data.name }}</strong>. La acción quedará registrada en Auditoría.
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-flat-button class="btn-danger" [mat-dialog-close]="true" cdkFocusInitial>Eliminar</button>
    </mat-dialog-actions>
  `,
  styles: `
    h2 { font-weight: 700; }
    mat-dialog-content { line-height: 1.5; }
    strong { color: var(--ink-900); }
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
