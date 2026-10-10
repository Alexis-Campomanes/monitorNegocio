export type ModuleId = 'clientes' | 'proveedores' | 'usuarios' | 'pedidos' | 'auditoria' | 'materiales';

export const MODULE_IDS: ModuleId[] = ['clientes', 'proveedores', 'usuarios', 'pedidos', 'auditoria', 'materiales'];

export type Estado = 'Activo' | 'Inactivo';
export type Rol = 'Administrador' | 'Vendedor' | 'Almacén' | 'Auditor';
export type EstadoPedido = 'Pendiente' | 'En proceso' | 'Enviado' | 'Entregado' | 'Cancelado';

export const ORDER_STATUSES: EstadoPedido[] = ['Pendiente', 'En proceso', 'Enviado', 'Entregado', 'Cancelado'];

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  ultimo: string;
  estado: Estado;
}

export interface Cliente {
  id: string;
  nombre: string;
  ruc: string;
  email?: string;
  contacto: string;
  telefono: string;
  ciudad: string;
  estado: Estado;
}

export interface Proveedor {
  id: string;
  nombre: string;
  ruc: string;
  rubro: string;
  contacto: string;
  telefono: string;
  email?: string;
  direccion?: string;
  estado: Estado;
}

export interface Material {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  stock: number;
  min: number;
  precio: number;
  proveedorId: string;
}

export interface PedidoItem {
  matId: string;
  qty: number;
  precio: number;
}

export interface Pedido {
  id: string;
  codigo: string;
  clienteId: string;
  fecha: string;
  /** Total que trae el listado del backend (montoTotal). Ausente en pedidos creados localmente. */
  montoTotal?: number;
  estado: EstadoPedido;
  items: PedidoItem[];
}

export interface Auditoria {
  id: string;
  hostIp: string;
  accion: string;
  tablaAfectada: string;
  registroId: string;
  fechaHora: string;
}

export interface Db {
  usuarios: Usuario[];
  clientes: Cliente[];
  proveedores: Proveedor[];
  materiales: Material[];
  pedidos: Pedido[];
  auditoria: Auditoria[];
}

export type AnyRecord = Db[ModuleId][number];
