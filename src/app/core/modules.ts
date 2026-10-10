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
  /** Orden por defecto de la tabla. */
  orderBy?: { key: string; dir: 'asc' | 'desc' };
  cols: ColumnDef<T>[];
  fields?: FieldDef[];
}

const opts = (arr: string[]): Option[] => arr.map((v) => ({ value: v, label: v }));
const ESTADOS = opts(['Activo', 'Inactivo']);
const ROLES = ['Administrador', 'Vendedor', 'Almacén', 'Auditor'];
/** Unidades de la tabla material del backend. */
const UNIDADES = ['BT', 'CJ', 'PZ'];

/** Definición de cada módulo: columnas de tabla, filtros y campos del formulario. */
export function buildModules(d: Db): Record<ModuleId, ModuleDef> {
  const cli = (id: string) => d.clientes.find((c) => c.id === id)?.nombre ?? '—';

  const mods: { [K in ModuleId]: ModuleDef<Db[K][number]> } = {
    clientes: {
      id: 'clientes', label: 'Clientes', icon: 'group', singular: 'cliente', nameKey: 'nombre',
      filterKey: 'estado', filters: ['Activo', 'Inactivo'],
      cols: [
        { key: 'nombre', label: 'Cliente', get: (r) => r.nombre, strong: true },
        { key: 'ruc', label: 'RUC', get: (r) => r.ruc, mono: true },
        { key: 'email', label: 'Correo', get: (r) => r.email ?? '' },
        { key: 'estado', label: 'Estado', get: (r) => r.estado, badge: true },
      ],
      fields: [
        { key: 'nombre', label: 'Razón social' },
        { key: 'ruc', label: 'RUC' },
        { key: 'estado', label: 'Estado', options: ESTADOS },
      ],
    },
    proveedores: {
      id: 'proveedores', label: 'Proveedores', icon: 'local_shipping', singular: 'proveedor', nameKey: 'nombre',
      filterKey: 'estado', filters: ['Activo', 'Inactivo'],
      cols: [
        { key: 'nombre', label: 'Proveedor', get: (r) => r.nombre, strong: true },
        { key: 'email', label: 'Correo', get: (r) => r.email ?? '' },
        { key: 'telefono', label: 'Teléfono', get: (r) => r.telefono },
        { key: 'direccion', label: 'Dirección', get: (r) => r.direccion ?? '' },
        { key: 'estado', label: 'Estado', get: (r) => r.estado, badge: true },
      ],
      fields: [
        { key: 'nombre', label: 'Razón social' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'estado', label: 'Estado', options: ESTADOS },
      ],
    },
    usuarios: {
      id: 'usuarios', label: 'Usuarios', icon: 'person', singular: 'usuario', nameKey: 'nombre',
      filterKey: 'rol', filters: ROLES,
      cols: [
        { key: 'id', label: 'Usuario', get: (r) => r.id, mono: true },
        { key: 'nombre', label: 'Nombre', get: (r) => r.nombre, strong: true },
        { key: 'rol', label: 'Rol', get: (r) => r.rol, badge: true },
        { key: 'estado', label: 'Estado', get: (r) => r.estado, badge: true },
      ],
      fields: [
        { key: 'nombre', label: 'Nombre completo' },
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
        { key: 'total', label: 'Total', get: (r) => money(r.montoTotal ?? orderTotal(r)), right: true, strong: true },
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
      filterKey: 'accion', filters: ['INSERT', 'UPDATE', 'DELETE'],
      cols: [
        { key: 'hostIp', label: 'Host IP', get: (r) => r.hostIp, mono: true },
        { key: 'accion', label: 'Acción', get: (r) => r.accion, badge: true },
        { key: 'tablaAfectada', label: 'Tabla', get: (r) => r.tablaAfectada },
        { key: 'registroId', label: 'Registro', get: (r) => r.registroId, muted: true },
        { key: 'fechaHora', label: 'Fecha y hora', get: (r) => r.fechaHora, mono: true },
      ],
    },
    materiales: {
      id: 'materiales', label: 'Materiales', icon: 'inventory_2', singular: 'material', nameKey: 'nombre',
      filterKey: 'unidad', filters: UNIDADES,
      orderBy: { key: 'codigo', dir: 'desc' },
      cols: [
        { key: 'codigo', label: 'Código', get: (r) => r.codigo, mono: true },
        { key: 'nombre', label: 'Material', get: (r) => r.nombre, strong: true },
        { key: 'unidad', label: 'Unidad', get: (r) => r.unidad },
        { key: 'precio', label: 'Precio', get: (r) => money(r.precio), right: true },
      ],
      fields: [
        { key: 'codigo', label: 'Código' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'unidad', label: 'Unidad', options: opts(UNIDADES) },
        { key: 'precio', label: 'Precio unitario', type: 'number' },
      ],
    },
  };
  return mods as unknown as Record<ModuleId, ModuleDef>;
}

/** Lee un campo arbitrario de un registro (para formularios genéricos). */
export function fieldOf(r: AnyRecord, key: string): unknown {
  return (r as unknown as Record<string, unknown>)[key];
}
