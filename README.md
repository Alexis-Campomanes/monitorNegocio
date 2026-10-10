# Núcleo — Monitor de negocio

Aplicación web en **Angular 22 + Angular Material** para gestionar clientes, proveedores,
usuarios, pedidos, materiales y la auditoría de cada acción. Implementa el diseño
`Motor Web` de Claude Design.

## Funcionalidades

- **Login** con validación (cuenta demo: `valeria.rios@empresa.com`, cualquier contraseña de 4+ caracteres).
- **Módulos CRUD** (Clientes, Proveedores, Usuarios, Materiales) con búsqueda, filtros por chips,
  diálogo de alta/edición y confirmación de eliminación.
- **Pedidos** con detalle: línea de tiempo de estado, ítems editables, resumen con IGV (18 %) y datos del cliente.
- **Auditoría**: registro de solo lectura de inicios de sesión, altas, ediciones, eliminaciones y cambios de estado.
- Menú lateral contraíble, vista compacta de tablas y persistencia local (`localStorage`).

## Estructura

```
src/app/
  core/        modelos, datos semilla, definición de módulos, store (signals) y guards
  layout/      shell con toolbar, menú de usuario y sidenav
  features/    login, listado genérico de módulos y detalle de pedido
  shared/      diálogos de formulario y confirmación
```

## Desarrollo

Requiere Node.js 22.22.3+ o 24.15+.

```bash
npm install
npm start        # http://localhost:4200
npm test         # pruebas unitarias (Vitest)
npm run build    # build de producción en dist/
```
