import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { IGV, money, orderSubtotal, tone } from '../../core/format';
import { EstadoPedido, ORDER_STATUSES } from '../../core/models';
import { Store } from '../../core/store';
import { RecordActions } from '../../shared/record-actions';

@Component({
  selector: 'app-order-detail',
  imports: [
    RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatSelectModule, MatTableModule, MatTooltipModule,
  ],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail {
  private readonly store = inject(Store);
  private readonly actions = inject(RecordActions);
  private readonly router = inject(Router);

  /** Parámetro de ruta `:id`. */
  readonly id = input.required<string>();

  protected readonly statuses = ORDER_STATUSES;
  protected readonly steps = ORDER_STATUSES.slice(0, 4);
  protected readonly itemColumns = ['material', 'qty', 'precio', 'sub', 'remove'];
  protected readonly money = money;

  protected readonly order = computed(() => this.store.db().pedidos.find((o) => o.id === this.id()));

  protected readonly view = computed(() => {
    const order = this.order();
    if (!order) return null;
    const d = this.store.db();
    const sub = orderSubtotal(order);
    const [bg, fg] = tone(order.estado);
    const cliente = d.clientes.find((c) => c.id === order.clienteId) ?? { nombre: '—', ruc: '—', contacto: '—', telefono: '—', ciudad: '—' };
    const n = order.items.length;
    return {
      order, cliente, bg, fg,
      sub: `${cliente.nombre} · Registrado el ${order.fecha}`,
      cancelled: order.estado === 'Cancelado',
      editable: order.estado === 'Pendiente' || order.estado === 'En proceso',
      stepIndex: ORDER_STATUSES.indexOf(order.estado),
      itemCount: `${n} ${n === 1 ? 'ítem' : 'ítems'}`,
      items: order.items.map((it, index) => {
        const m = d.materiales.find((x) => x.id === it.matId) ?? { nombre: 'Material eliminado', codigo: '—', unidad: '' };
        return { index, nombre: m.nombre, codigo: m.codigo, qty: `${it.qty} ${m.unidad.toLowerCase()}`, precio: money(it.precio), sub: money(it.qty * it.precio) };
      }),
      subtotal: money(sub),
      igv: money(sub * IGV),
      total: money(sub * (1 + IGV)),
    };
  });

  protected readonly materials = computed(() => this.store.db().materiales);
  protected readonly newItemMat = signal('m1');
  protected readonly newItemQty = signal('1');

  constructor() {
    // Si el pedido deja de existir (p. ej. se eliminó), vuelve al listado.
    effect(() => {
      if (!this.order()) this.router.navigate(['/pedidos']);
    });
  }

  protected setStatus(value: EstadoPedido): void {
    const order = this.order();
    if (!order || value === order.estado) return;
    const old = order.estado;
    this.store.updateOrder(order.id, (o) => ({ ...o, estado: value }), 'Cambió estado', `${order.codigo}: ${old} → ${value}`);
    this.store.flash(`Estado actualizado a ${value}`);
  }

  protected removeItem(index: number, nombre: string): void {
    const order = this.order();
    if (!order) return;
    this.store.updateOrder(order.id, (o) => ({ ...o, items: o.items.filter((_, j) => j !== index) }), 'Editó', `${order.codigo}: quitó ${nombre}`);
  }

  protected addItem(): void {
    const order = this.order();
    const m = this.store.db().materiales.find((x) => x.id === this.newItemMat());
    if (!order || !m) return;
    const qty = Math.max(1, parseInt(this.newItemQty(), 10) || 1);
    this.store.updateOrder(
      order.id,
      (o) => {
        const exists = o.items.some((i) => i.matId === m.id);
        return {
          ...o,
          items: exists
            ? o.items.map((i) => (i.matId === m.id ? { ...i, qty: i.qty + qty } : i))
            : [...o.items, { matId: m.id, qty, precio: m.precio }],
        };
      },
      'Editó',
      `${order.codigo}: agregó ${qty} × ${m.nombre}`,
    );
    this.newItemQty.set('1');
    this.store.flash('Ítem agregado');
  }

  protected delete(): void {
    const order = this.order();
    if (order) this.actions.askDelete('pedidos', order);
  }
}
