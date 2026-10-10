import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { nowStamp, today } from './format';
import { AnyRecord, Db, ModuleId, Pedido, Usuario } from './models';
import { buildModules } from './modules';
import { SEED } from './seed';

const STORAGE_KEY = 'nucleo.state.v1';

interface Persisted {
  db: Db;
  userId: string | null;
}

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

export interface SaveResult {
  error?: string;
  createdOrderId?: string;
}

/** Estado de la aplicación: datos, sesión y auditoría de cada acción. */
@Injectable({ providedIn: 'root' })
export class Store {
  private readonly snackBar = inject(MatSnackBar);
  private readonly initial = load();

  readonly db = signal<Db>(this.initial?.db ?? structuredClone(SEED));
  private readonly userId = signal<string | null>(this.initial?.userId ?? null);

  readonly user = computed(() => {
    const id = this.userId();
    return id ? (this.db().usuarios.find((u) => u.id === id) ?? null) : null;
  });
  readonly modules = computed(() => buildModules(this.db()));

  /** Preferencias de visualización. */
  readonly density = signal<'comfortable' | 'compact'>('comfortable');
  readonly sidebarCollapsed = signal(false);

  constructor() {
    effect(() => {
      const state: Persisted = { db: this.db(), userId: this.userId() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Sin almacenamiento disponible: el estado vive solo en memoria.
      }
    });
  }

  flash(msg: string): void {
    this.snackBar.open(msg, undefined, { duration: 2400, panelClass: 'app-toast' });
  }

  private log(data: Db, modulo: string, accion: string, detalle: string, user?: Usuario | null): Db {
    const u = user ?? this.user();
    const entry = {
      id: 'a' + Date.now() + Math.random(),
      fecha: nowStamp(),
      usuario: u ? u.nombre : '—',
      modulo,
      accion,
      detalle,
    };
    return { ...data, auditoria: [entry, ...data.auditoria] };
  }

  login(email: string, password: string): string | null {
    const data = this.db();
    const u = data.usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return 'No encontramos una cuenta con ese correo.';
    if (u.estado !== 'Activo') return 'Esta cuenta está inactiva. Contacta a un administrador.';
    if (password.length < 4) return 'La contraseña debe tener al menos 4 caracteres.';
    const ultimo = nowStamp();
    let nd: Db = { ...data, usuarios: data.usuarios.map((x) => (x.id === u.id ? { ...x, ultimo } : x)) };
    nd = this.log(nd, 'Sesión', 'Inició sesión', 'Acceso desde navegador web', u);
    this.db.set(nd);
    this.userId.set(u.id);
    this.flash(`Bienvenido, ${u.nombre.split(' ')[0]}`);
    return null;
  }

  logout(): void {
    this.db.set(this.log(this.db(), 'Sesión', 'Cerró sesión', 'Salida del sistema'));
    this.userId.set(null);
  }

  saveRecord(module: ModuleId, form: Record<string, string>, editId?: string): SaveResult {
    const mod = this.modules()[module];
    const fields = (mod.fields ?? []).filter((f) => !(editId && module === 'pedidos' && (f.key === 'matId' || f.key === 'qty')));
    if (fields.some((x) => String(form[x.key] ?? '').trim() === '')) return { error: 'Completa todos los campos.' };

    const rec: Record<string, string | number> = {};
    fields.forEach((x) => (rec[x.key] = x.type === 'number' ? Number(form[x.key]) : form[x.key]));
    const data = this.db();

    if (module === 'pedidos' && !editId) {
      const mat = data.materiales.find((m) => m.id === rec['matId']);
      if (!mat) return { error: 'Selecciona un material.' };
      const max = Math.max(1041, ...data.pedidos.map((o) => +o.codigo.split('-')[1]));
      const o: Pedido = {
        id: 'o' + Date.now(),
        codigo: 'PED-' + (max + 1),
        clienteId: String(rec['clienteId']),
        fecha: today(),
        estado: rec['estado'] as Pedido['estado'],
        items: [{ matId: mat.id, qty: Math.max(1, Number(rec['qty'])), precio: mat.precio }],
      };
      const cliente = data.clientes.find((c) => c.id === o.clienteId);
      this.db.set(this.log({ ...data, pedidos: [o, ...data.pedidos] }, 'Pedidos', 'Creó', `${o.codigo} para ${cliente?.nombre ?? '—'}`));
      this.flash(`${o.codigo} creado`);
      return { createdOrderId: o.id };
    }

    const name = String(rec[mod.nameKey ?? 'id'] ?? '');
    const list = data[module] as AnyRecord[];
    if (!editId) {
      const created = { ...rec, id: module[0] + Date.now(), ...(module === 'usuarios' ? { ultimo: '—' } : {}) };
      this.db.set(this.log({ ...data, [module]: [created, ...list] }, mod.label, 'Creó', name));
      const singular = mod.singular ?? '';
      this.flash(`${singular[0].toUpperCase() + singular.slice(1)} creado`);
    } else {
      const updated = list.map((r) => (r.id === editId ? { ...r, ...rec } : r));
      this.db.set(this.log({ ...data, [module]: updated }, mod.label, 'Editó', name));
      this.flash('Cambios guardados');
    }
    return {};
  }

  /** Devuelve false si la eliminación no está permitida. */
  deleteRecord(module: ModuleId, id: string, name: string): boolean {
    if (module === 'usuarios' && id === this.userId()) {
      this.flash('No puedes eliminar tu propio usuario');
      return false;
    }
    const data = this.db();
    const mod = this.modules()[module];
    const list = (data[module] as AnyRecord[]).filter((r) => r.id !== id);
    this.db.set(this.log({ ...data, [module]: list }, mod.label, 'Eliminó', name));
    this.flash(`${name} eliminado`);
    return true;
  }

  updateOrder(orderId: string, fn: (o: Pedido) => Pedido, accion: string, detalle: string): void {
    const data = this.db();
    const pedidos = data.pedidos.map((o) => (o.id === orderId ? fn(o) : o));
    this.db.set(this.log({ ...data, pedidos }, 'Pedidos', accion, detalle));
  }
}
