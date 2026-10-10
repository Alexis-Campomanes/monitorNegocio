import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ModuleId } from '../../core/models';
import { SaveResult, Store } from '../../core/store';

export interface RecordFormData {
  module: ModuleId;
  editId?: string;
  form: Record<string, string>;
}

@Component({
  selector: 'app-record-form',
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './record-form.html',
  styleUrl: './record-form.scss',
})
export class RecordForm {
  private readonly store = inject(Store);
  private readonly ref = inject<MatDialogRef<RecordForm, SaveResult>>(MatDialogRef);
  protected readonly data = inject<RecordFormData>(MAT_DIALOG_DATA);

  private readonly mod = computed(() => this.store.modules()[this.data.module]);
  protected readonly title = computed(() => `${this.data.editId ? 'Editar' : 'Nuevo'} ${this.mod().singular}`);
  protected readonly fields = computed(() =>
    (this.mod().fields ?? []).filter(
      (f) => !(this.data.editId && this.data.module === 'pedidos' && (f.key === 'matId' || f.key === 'qty')),
    ),
  );
  protected readonly form = signal<Record<string, string>>({ ...this.data.form });
  protected readonly error = signal('');

  protected set(key: string, value: string): void {
    this.form.update((f) => ({ ...f, [key]: value }));
    this.error.set('');
  }

  protected save(): void {
    const result = this.store.saveRecord(this.data.module, this.form(), this.data.editId);
    if (result.error) {
      this.error.set(result.error);
      return;
    }
    this.ref.close(result);
  }
}
