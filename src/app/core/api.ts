import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { Auditoria, Cliente, Db, Estado, EstadoPedido, Material, Pedido, PedidoItem, Proveedor, Rol, Usuario } from './models';

/** URL base del backend (backendPrueba, ver launchSettings.json). */
const API_URL = 'http://localhost:5263/api';

// Formas que devuelve el backend (camelCase por defecto en ASP.NET).
interface ClienteDto { codigoCliente: string; nombreDescripcion: string; documento: string; email: string | null }
interface UsuarioDto { codVendedor: string; dscVendedor: string; activo: boolean; rolId: number | null; dscRol: string | null }
interface ProveedorDto { transporteId: string; nombreProveedor: string; telefono: string | null; email: string | null; direccion: string | null; estado: string }
interface MaterialDto { codigoMaterial: string; descripcionMaterial: string; unidad: string; precioNeto: number }
interface PedidoDto { codigoPedido: string; codigoCliente: string; fechaPedido: string; montoTotal: number; estado: string }
interface DetallePedidoDto { codMaterial: string; cantidad: number; precioNeto: number }
interface DetallePedidoResumenDto { items: DetallePedidoDto[] }
interface AuditLogDto { hostIp: string | null; accion: string | null; tablaAfectada: string | null; registroId: string | null; fechaHora: string | null }

/** Respuesta de POST /api/Auth/login cuando la clave es correcta. */
export interface LoginRespuesta { mensaje: string; codVendedor: string; dscVendedor: string; rolId: number | null }

const pad = (n: number) => String(n).padStart(2, '0');

function fecha(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function fechaHora(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${fecha(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const estado = (v: string | null): Estado => (v === 'Inactivo' ? 'Inactivo' : 'Activo');

/**
 * Cliente de la API. Los campos que el backend no expone (contacto, ciudad, RUC de proveedor,
 * stock, etc.) quedan vacíos o en cero.
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  /** Valida código de vendedor y clave. Los errores llegan como HttpErrorResponse con `error.mensaje`. */
  login(codVendedor: string, password: string): Observable<LoginRespuesta> {
    return this.http.post<LoginRespuesta>(`${API_URL}/Auth/login`, { codVendedor, password });
  }

  /** Trae las colecciones del backend ya convertidas al modelo del frontend. */
  loadDb(): Observable<Pick<Db, 'usuarios' | 'clientes' | 'proveedores' | 'materiales' | 'pedidos' | 'auditoria'>> {
    return forkJoin({
      usuarios: this.http.get<UsuarioDto[]>(`${API_URL}/Usuarios`),
      clientes: this.http.get<ClienteDto[]>(`${API_URL}/clientes`),
      proveedores: this.http.get<ProveedorDto[]>(`${API_URL}/proveedores`),
      materiales: this.http.get<MaterialDto[]>(`${API_URL}/materiales`),
      pedidos: this.http.get<PedidoDto[]>(`${API_URL}/pedidos`),
      auditoria: this.http.get<AuditLogDto[]>(`${API_URL}/auditlogs`),
    }).pipe(
      map((r) => ({
        usuarios: r.usuarios.map(toUsuario),
        clientes: r.clientes.map(toCliente),
        proveedores: r.proveedores.map(toProveedor),
        materiales: r.materiales.map(toMaterial),
        pedidos: r.pedidos.map(toPedido),
        auditoria: r.auditoria.map(toAuditoria),
      })),
    );
  }

  /** Ítems de un pedido por su código (GET /api/DetallePedidos/{codigoPedido}). */
  detalle(codigoPedido: string): Observable<PedidoItem[]> {
    return this.http.get<DetallePedidoResumenDto>(`${API_URL}/DetallePedidos/${encodeURIComponent(codigoPedido)}`)
      .pipe(map((d) => d.items.map((i) => ({ matId: i.codMaterial, qty: i.cantidad, precio: i.precioNeto }))));
  }
}

function toUsuario(u: UsuarioDto): Usuario {
  return {
    id: u.codVendedor, nombre: u.dscVendedor, email: '', rol: toRol(u.rolId), ultimo: '', estado: u.activo ? 'Activo' : 'Inactivo',
  };
}

function toCliente(c: ClienteDto): Cliente {
  return {
    id: c.codigoCliente, nombre: c.nombreDescripcion, ruc: c.documento, email: c.email ?? '',
    contacto: '', telefono: '', ciudad: '', estado: 'Activo',
  };
}

function toProveedor(p: ProveedorDto): Proveedor {
  return {
    id: p.transporteId, nombre: p.nombreProveedor, ruc: '', rubro: '',
    contacto: '', telefono: p.telefono ?? '', email: p.email ?? '', direccion: p.direccion ?? '',
    estado: estado(p.estado),
  };
}

function toMaterial(m: MaterialDto): Material {
  return {
    id: m.codigoMaterial, codigo: m.codigoMaterial, nombre: m.descripcionMaterial,
    categoria: '', unidad: m.unidad, stock: 0, min: 0, precio: m.precioNeto, proveedorId: '',
  };
}

/** Los ítems llegan al abrir el detalle (loadOrderItems), no con el listado. */
function toPedido(p: PedidoDto): Pedido {
  return {
    id: p.codigoPedido, codigo: p.codigoPedido, clienteId: p.codigoCliente,
    fecha: fecha(p.fechaPedido), montoTotal: p.montoTotal, estado: toEstadoPedido(p.estado), items: [],
  };
}

/** Códigos de estado de la tabla pedidos. P = Pendiente (supuesto), E = Entregado (confirmado). */
const ESTADOS_PEDIDO: Record<string, EstadoPedido> = { P: 'Pendiente', E: 'Entregado' };

/** Un código desconocido se muestra tal cual para que no pase inadvertido. */
function toEstadoPedido(codigo: string): EstadoPedido {
  return ESTADOS_PEDIDO[codigo] ?? (codigo as EstadoPedido);
}

/**
 * Roles del backend (tabla roles): 1 = vendedor, 2 = Supervisor.
 * Supervisor se muestra como Administrador porque es el rol con más permisos del frontend.
 */
export function toRol(rolId: number | null): Rol {
  return rolId === 2 ? 'Administrador' : 'Vendedor';
}

function toAuditoria(a: AuditLogDto, i: number): Auditoria {
  return {
    id: `api-${i}`, hostIp: a.hostIp ?? '—', accion: a.accion ?? '—', tablaAfectada: a.tablaAfectada ?? '—',
    registroId: a.registroId ?? '—', fechaHora: fechaHora(a.fechaHora),
  };
}
