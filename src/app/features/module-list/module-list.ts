import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { tone } from '../../core/format';
import { AnyRecord, ModuleId } from '../../core/models';
import { fieldOf } from '../../core/modules';
import { Store } from '../../core/store';
import { RecordActions } from '../../shared/record-actions';

interface Cell {
  key: string;
  text: string;
  badge: boolean;
  bg: string;
  fg: string;
  color: string;
  strong: boolean;
  mono: boolean;
  right: boolean;
}

interface Row {
  record: AnyRecord;
  cells: Record<string, Cell>;
}

@Component({
  selector: 'app-module-list',
  imports: [MatButtonModule, MatChipsModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTableModule, MatTooltipModule],
  templateUrl: './module-list.html',
  styleUrl: './module-list.scss',
})
export class ModuleList {
  protected readonly store = inject(Store);
  private readonly actions = inject(RecordActions);
  private readonly router = inject(Router);

  /** Parámetro de ruta `:module`. */
  readonly module = input.required<ModuleId>();

  protected readonly mod = computed(() => this.store.modules()[this.module()]);
  protected readonly search = linkedSignal({ source: this.module, computation: () => '' });
  protected readonly filter = linkedSignal({ source: this.module, computation: () => 'Todos' });

  protected readonly chips = computed(() => ['Todos', ...this.mod().filters]);
  protected readonly columns = computed(() => this.mod().cols.map((c) => ({ key: c.key, label: c.label, right: !!c.right })));
  protected readonly displayed = computed(() => [...this.mod().cols.map((c) => c.key), ...(this.mod().readOnly ? [] : ['actions'])]);

  private readonly all = computed(() => this.store.db()[this.module()] as AnyRecord[]);

  protected readonly rows = computed<Row[]>(() => {
    const mod = this.mod();
    const q = this.search().trim().toLowerCase();
    const filter = this.filter();
    return this.all()
      .filter((r) => filter === 'Todos' || fieldOf(r, mod.filterKey) === filter)
      .filter((r) => !q || mod.cols.some((c) => c.get(r).toLowerCase().includes(q)))
      .map((record) => {
        const cells: Record<string, Cell> = {};
        for (const c of mod.cols) {
          const text = c.get(record);
          const [bg, fg] = tone(text);
          cells[c.key] = {
            key: c.key, text, bg, fg,
            badge: !!c.badge, strong: !!c.strong, mono: !!c.mono, right: !!c.right,
            color: c.color ? c.color(record) : c.muted ? 'var(--ink-500)' : 'var(--ink-900)',
          };
        }
        return { record, cells };
      });
  });

  protected readonly countLabel = computed(() => `${this.rows().length} de ${this.all().length} registros`);

  protected open(row: Row): void {
    if (this.mod().readOnly) return;
    if (this.module() === 'pedidos') this.router.navigate(['/pedidos', row.record.id]);
    else this.actions.openEdit(this.module(), row.record);
  }

  protected openNew(): void {
    this.actions.openNew(this.module());
  }

  protected edit(e: Event, row: Row): void {
    e.stopPropagation();
    this.actions.openEdit(this.module(), row.record);
  }

  protected remove(e: Event, row: Row): void {
    e.stopPropagation();
    this.actions.askDelete(this.module(), row.record);
  }
}
