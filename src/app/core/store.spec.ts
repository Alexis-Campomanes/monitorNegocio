import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Store } from './store';

const LOGIN_URL = 'http://localhost:5263/api/Auth/login';

const VENDEDOR_OK = { mensaje: 'Login correcto', codVendedor: '370', dscVendedor: 'Freddy Palacios Abramonte', rolId: 1 };

describe('Store', () => {
  let store: Store;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(Store);
    http = TestBed.inject(HttpTestingController);
  });

  /** Dispara el login y devuelve el resultado que emite el store (undefined si aún no responde). */
  function login(codVendedor: string, password: string): string | null | undefined {
    let result: string | null | undefined;
    store.login(codVendedor, password).subscribe((r) => (result = r));
    return result;
  }

  it('rechaza la clave incorrecta sin iniciar sesión', () => {
    let result: string | null | undefined;
    store.login('370', '0000').subscribe((r) => (result = r));
    http.expectOne(LOGIN_URL).flush({ mensaje: 'Clave incorrecta.' }, { status: 401, statusText: 'Unauthorized' });
    expect(result).toBe('Clave incorrecta.');
    expect(store.user()).toBeNull();
  });

  it('inicia sesión con el backend y registra la acción en auditoría', () => {
    let result: string | null | undefined;
    store.login('370', '2021').subscribe((r) => (result = r));
    http.expectOne(LOGIN_URL).flush(VENDEDOR_OK);
    expect(result).toBeNull();
    expect(store.user()?.nombre).toBe('Freddy Palacios Abramonte');
    expect(store.user()?.rol).toBe('Vendedor');
    expect(store.db().auditoria[0].accion).toBe('Inició sesión');
  });

  it('crea un pedido con código correlativo', () => {
    login('370', '2021');
    http.expectOne(LOGIN_URL).flush(VENDEDOR_OK);
    const res = store.saveRecord('pedidos', { clienteId: 'c1', matId: 'm1', qty: '3', estado: 'Pendiente' });
    const created = store.db().pedidos.find((o) => o.id === res.createdOrderId);
    expect(created?.codigo).toBe('PED-1049');
    expect(created?.items).toEqual([{ matId: 'm1', qty: 3, precio: 28.5 }]);
  });

  it('no permite eliminar el propio usuario', () => {
    login('370', '2021');
    http.expectOne(LOGIN_URL).flush(VENDEDOR_OK);
    expect(store.deleteRecord('usuarios', '370', 'Freddy Palacios Abramonte')).toBe(false);
    expect(store.deleteRecord('clientes', 'c2', 'Ferretería El Progreso')).toBe(true);
    expect(store.db().clientes.some((c) => c.id === 'c2')).toBe(false);
  });
});
