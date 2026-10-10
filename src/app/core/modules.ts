import { money, orderTotal } from './format';
import { AnyRecord, Db, ModuleId, ORDER_STATUSES } from './models';

export interface Option {
  value: string;
  label: string;
}

export interface ColumnDef<T> {
  key: string;
  label: string;
  get: (r: T) => string;
  strong?: boolean;
  mono?: boolean;
  right?: boolean;
  badge?: boolean;
  muted?: boolean;
  color?: (r: T) => string;
}

export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'number';
  options?: Option[];
}

export interface ModuleDef<T = AnyRecord> {
  id: ModuleId;
  label: string;
  icon: string;
  singular?: string;
  nameKey?: string;
  readOnly?: boolean;
  filterKey: string;
  filters: string[];
  cols: ColumnDef<T>[];
  fields?: FieldDef[];
}

const opts = (arr: string[]): Option[] => arr.map((v) => ({ value: v, label: v }));
const ESTADOS = opts(['Activo', 'Inactivo']);
const ROLES = ['Administrador', 'Vendedor', 'Almacén', 'Auditor'];
const CATEGORIAS = ['Construcción', 'Metales', 'Madera', 'Plásticos', 'Eléctricos'];

/** Definición de cada módulo: columnas de tabla, filtros y campos del formulario. */
export function buildModules(d: Db): Record<ModuleId, ModuleDef> {
  const cli = (id: string) => d.clientes.find((c) => c.id === id)?.nombre ?? '—';
  const prov = (id: string) => d.proveedores.find((p) => p.id === id)?.nombre ?? '—';

  const mods: { [K in ModuleId]: ModuleDef<Db[K][number]> } = {
    clientes: {
      id: 'clientes', label: 'Clientes', icon: 'group', singular: 'cliente', nameKey: 'nombre',
      filterKey: 'estado', filters: ['Activo', 'Inactivo'],
      cols: [
        { key: 'nombre', label: 'Cliente', get: (r) => r.nombre, strong: true },
        { key: 'ruc', label: 'RUC', get: (r) => r.ruc, mono: true },
        { key: 'contacto', label: 'Contacto', get: (r) => r.contacto },
        { key: 'telefono', label: 'Teléfono', get: (r) => r.telefono },
        { key: 'ciudad', label: 'Ciudad', get: (r) => r.ciudad },
        { key: 'estado', label: 'Estado', get: (r) => r.estado, badge: true },
      ],
      fields: [
        { key: 'nombre', label: 'Razón social' },
        { key: 'ruc', label: 'RUC' },
        { key: 'contacto', label: 'Contacto' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'ciudad', label: 'Ciudad' },
        { key: 'estado', label: 'Estado', options: ESTADOS },
      ],
    },
    proveedores: {
      id: 'proveedores', label: 'Proveedores', icon: 'local_shipping', singular: 'proveedor', nameKey: 'nombre',
      filterKey: 'estado', filters: ['Activo', 'Inactivo'],
      cols: [
        { key: 'nombre', label: 'Proveedor', get: (r) => r.nombre, strong: true },
        { key: 'ruc', label: 'RUC', get: (r) => r.ruc, mono: true },
        { key: 'rubro', label: 'Rubro', get: (r) => r.rubro },
        { key: 'contacto', label: 'Contacto', get: (r) => r.contacto },
        { key: 'telefono', label: 'Teléfono', get: (r) => r.telefono },
        { key: 'estado', label: 'Estado', get: (r) => r.estado, badge: true },
      ],
      fields: [
        { key: 'nombre', label: 'Razón social' },
        { key: 'ruc', label: 'RUC' },
        { key: 'rubro', label: 'Rubro' },
        { key: 'contacto', label: 'Contacto' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'estado', label: 'Estado', options: ESTADOS },
      ],
    },
    usuarios: {
      id: 'usuarios', label: 'Usuarios', icon: 'person', singular: 'usuario', nameKey: 'nombre',
      filterKey: 'rol', filters: ROLES,
      cols: [
        { key: 'nombre', label: 'Nombre', get: (r) => r.nombre, strong: true },
        { key: 'email', label: 'Correo', get: (r) => r.email },
        { key: 'rol', label: 'Rol', get: (r) => r.rol, badge: true },
        { key: 'ultimo', label: 'Último acceso', get: (r) => r.ultimo, mono: true },
        { key: 'estado', label: 'Estado', get: (r) => r.estado, badge: true },
      ],
      fields: [
        { key: 'nombre', label: 'Nombre completo' },
        { key: 'email', label: 'Correo', type: 'email' },
        { key: 'rol', label: 'Rol', options: opts(ROLES) },
        { key: 'estado', label: 'Estado', options: ESTADOS },
      ],
    },
    pedidos: {
      id: 'pedidos', label: 'Pedidos', icon: 'assignment', singular: 'pedido', nameKey: 'codigo',
      filterKey: 'estado', filters: ORDER_STATUSES,
      cols: [
        { key: 'codigo', label: 'Código', get: (r) => r.codigo, mono: true, strong: true },
        { key: 'cliente', label: 'Cliente', get: (r) => cli(r.clienteId) },
        { key: 'fecha', label: 'Fecha', get: (r) => r.fecha },
        { key: 'items', label: 'Ítems', get: (r) => String(r.items.length), right: true },
        { key: 'total', label: 'Total', get: (r) => money(orderTotal(r)), right: true, strong: true },
        { key: 'estado', label: 'Estado', get: (r) => r.estado, badge: true },
      ],
      fields: [
        {
          key: 'clienteId', label: 'Cliente',
          options: d.clientes.filter((c) => c.estado === 'Activo').map((c) => ({ value: c.id, label: c.nombre })),
        },
        { key: 'matId', label: 'Material inicial', options: d.materiales.map((m) => ({ value: m.id, label: m.nombre })) },
        { key: 'qty', label: 'Cantidad', type: 'number' },
        { key: 'estado', label: 'Estado', options: opts(ORDER_STATUSES.slice(0, 2)) },
      ],
    },
    auditoria: {
      id: 'auditoria', label: 'Auditoría', icon: 'verified_user', readOnly: true,
      filterKey: 'modulo', filters: ['Sesión', 'Clientes', 'Proveedores', 'Usuarios', 'Pedidos', 'Materiales'],
      cols: [
        { key: 'fecha', label: 'Fecha y hora', get: (r) => r.fecha, mono: true },
        { key: 'usuario', label: 'Usuario', get: (r) => r.usuario, strong: true },
        { key: 'modulo', label: 'Módulo', get: (r) => r.modulo },
        { key: 'accion', label: 'Acción', get: (r) => r.accion, badge: true },
        { key: 'detalle', label: 'Detalle', get: (r) => r.detalle, muted: true },
      ],
    },
    materiales: {
      id: 'materiales', label: 'Materiales', icon: 'inventory_2', singular: 'material', nameKey: 'nombre',
      filterKey: 'categoria', filters: CATEGORIAS,
      cols: [
        { key: 'codigo', label: 'Código', get: (r) => r.codigo, mono: true },
        { key: 'nombre', label: 'Material', get: (r) => r.nombre, strong: true },
        { key: 'categoria', label: 'Categoría', get: (r) => r.categoria },
        {
          key: 'stock', label: 'Stock', get: (r) => `${r.stock} ${r.unidad.toLowerCase()}`, right: true, strong: true,
          color: (r) => (r.stock < r.min ? 'var(--danger)' : 'var(--ink-900)'),
        },
        { key: 'precio', label: 'Precio', get: (r) => money(r.precio), right: true },
        { key: 'proveedor', label: 'Proveedor', get: (r) => prov(r.proveedorId) },
      ],
      fields: [
        { key: 'codigo', label: 'Código' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'categoria', label: 'Categoría', options: opts(CATEGORIAS) },
        { key: 'unidad', label: 'Unidad', options: opts(['Unidad', 'Bolsa', 'Varilla', 'Plancha', 'Rollo', 'Kg', 'Millar']) },
        { key: 'stock', label: 'Stock', type: 'number' },
        { key: 'min', label: 'Stock mínimo', type: 'number' },
        { key: 'precio', label: 'Precio unitario', type: 'number' },
        { key: 'proveedorId', label: 'Proveedor', options: d.proveedores.map((p) => ({ value: p.id, label: p.nombre })) },
      ],
    },
  };
  return mods as unknown as Record<ModuleId, ModuleDef>;
}

/** Lee un campo arbitrario de un registro (para formularios genéricos). */
export function fieldOf(r: AnyRecord, key: string): unknown {
  return (r as unknown as Record<string, unknown>)[key];
}
