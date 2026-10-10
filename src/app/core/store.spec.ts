import { TestBed } from '@angular/core/testing';
import { Store } from './store';

describe('Store', () => {
  let store: Store;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(Store);
  });

  it('rechaza correos desconocidos y cuentas inactivas', () => {
    expect(store.login('nadie@empresa.com', 'demo1234')).toContain('No encontramos');
    expect(store.login('carla.mendoza@empresa.com', 'demo1234')).toContain('inactiva');
    expect(store.user()).toBeNull();
  });

  it('inicia sesión y registra la acción en auditoría', () => {
    expect(store.login('valeria.rios@empresa.com', 'demo1234')).toBeNull();
    expect(store.user()?.nombre).toBe('Valeria Ríos');
    expect(store.db().auditoria[0].accion).toBe('Inició sesión');
  });

  it('crea un pedido con código correlativo', () => {
    store.login('valeria.rios@empresa.com', 'demo1234');
    const res = store.saveRecord('pedidos', { clienteId: 'c1', matId: 'm1', qty: '3', estado: 'Pendiente' });
    const created = store.db().pedidos.find((o) => o.id === res.createdOrderId);
    expect(created?.codigo).toBe('PED-1049');
    expect(created?.items).toEqual([{ matId: 'm1', qty: 3, precio: 28.5 }]);
  });

  it('no permite eliminar el propio usuario', () => {
    store.login('valeria.rios@empresa.com', 'demo1234');
    expect(store.deleteRecord('usuarios', 'u1', 'Valeria Ríos')).toBe(false);
    expect(store.deleteRecord('clientes', 'c2', 'Ferretería El Progreso')).toBe(true);
    expect(store.db().clientes.some((c) => c.id === 'c2')).toBe(false);
  });
});
