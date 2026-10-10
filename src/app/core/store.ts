import { HttpErrorResponse } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, Observable, of } from 'rxjs';
import { Api, LoginRespuesta, toRol } from './api';
import { nowStamp, today } from './format';
import { Auditoria, AnyRecord, Db, ModuleId, Pedido, Usuario } from './models';
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
  private readonly api = inject(Api);
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
    this.loadFromApi();
  }

  /** Reemplaza usuarios, clientes, proveedores, materiales, pedidos y auditoría con los del backend. */
  private loadFromApi(): void {
    this.api.loadDb().subscribe({
      next: (remote) => this.db.update((d) => ({ ...d, ...remote })),
      error: () => this.flash('No se pudo conectar con el backend. Trabajando con datos locales.'),
    });
  }

  flash(msg: string): void {
    this.snackBar.open(msg, undefined, { duration: 2400, panelClass: 'app-toast' });
  }

  /** Registra una acción local con las mismas columnas que la auditoría del backend. */
  private log(data: Db, tablaAfectada: string, accion: string, registroId: string): Db {
    const entry: Auditoria = {
      id: 'a' + Date.now() + Math.random(),
      hostIp: '—',
      accion,
      tablaAfectada,
      registroId,
      fechaHora: nowStamp(),
    };
    return { ...data, auditoria: [entry, ...data.auditoria] };
  }

  /** Valida contra el backend. Emite null si entra, o el mensaje de error para mostrar. */
  login(codVendedor: string, password: string): Observable<string | null> {
    return this.api.login(codVendedor.trim(), password).pipe(
      map((r) => {
        this.startSession(r);
        return null;
      }),
      catchError((err: HttpErrorResponse) => of(
        err.status === 0 ? 'No se pudo conectar con el backend.' : (err.error?.mensaje ?? 'No se pudo iniciar sesión.'),
      )),
    );
  }

  private startSession(r: LoginRespuesta): void {
    const u: Usuario = {
      id: r.codVendedor, nombre: r.dscVendedor, email: '', rol: toRol(r.rolId), ultimo: nowStamp(), estado: 'Activo',
    };
    const data = this.db();
    let nd: Db = { ...data, usuarios: [u, ...data.usuarios.filter((x) => x.id !== u.id)] };
    nd = this.log(nd, 'Sesión', 'Inició sesión', 'Acceso desde navegador web');
    this.db.set(nd);
    this.userId.set(u.id);
    this.flash(`Bienvenido, ${u.nombre.split(' ')[0]}`);
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

  /** Trae los ítems del pedido desde el backend (su código es el id del pedido) y reemplaza los locales. */
  loadOrderItems(orderId: string): void {
    this.api.detalle(orderId).subscribe({
      next: (items) => this.db.update((d) => ({
        ...d,
        pedidos: d.pedidos.map((o) => (o.id === orderId ? { ...o, items } : o)),
      })),
      error: () => this.flash('No se pudieron cargar los ítems del pedido.'),
    });
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
