import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AnyRecord, ModuleId } from '../core/models';
import { fieldOf } from '../core/modules';
import { SaveResult, Store } from '../core/store';
import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog/confirm-dialog';
import { RecordForm, RecordFormData } from './record-form/record-form';

/** Abre los diálogos de crear / editar / eliminar registros de cualquier módulo. */
@Injectable({ providedIn: 'root' })
export class RecordActions {
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  openNew(module: ModuleId): void {
    const form: Record<string, string> = {};
    for (const f of this.store.modules()[module].fields ?? []) {
      form[f.key] = f.options ? (f.options[0]?.value ?? '') : f.type === 'number' ? (f.key === 'qty' ? '1' : '0') : '';
    }
    this.openForm({ module, form });
  }

  openEdit(module: ModuleId, row: AnyRecord): void {
    const form: Record<string, string> = {};
    for (const f of this.store.modules()[module].fields ?? []) {
      const v = fieldOf(row, f.key);
      form[f.key] = v != null ? String(v) : '';
    }
    this.openForm({ module, form, editId: row.id });
  }

  async askDelete(module: ModuleId, row: AnyRecord): Promise<boolean> {
    const name = String(fieldOf(row, this.store.modules()[module].nameKey ?? 'id'));
    const ok = await firstValueFrom(
      this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data: { name }, width: '420px' }).afterClosed(),
    );
    return !!ok && this.store.deleteRecord(module, row.id, name);
  }

  private openForm(data: RecordFormData): void {
    this.dialog
      .open<RecordForm, RecordFormData, SaveResult>(RecordForm, { data, width: '620px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((result) => {
        if (result?.createdOrderId) this.router.navigate(['/pedidos', result.createdOrderId]);
      });
  }
}
