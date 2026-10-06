import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { NotificationService } from '../notifications/notification-service';
import { ApiError } from './api-error';
import { apiErrorInterceptor } from './api-error-interceptor';

describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  const notifications = { error: vi.fn<(message: string) => void>() };

  beforeEach(() => {
    notifications.error.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  /** Performs a GET that fails with the given response and returns what the caller sees. */
  function failWith(status: number, body: object | string | null): ApiError {
    let received: unknown;
    http.get('/boom').subscribe({ error: (error: unknown) => (received = error) });
    const request = controller.expectOne('/boom');
    if (status === 0) {
      request.error(new ProgressEvent('error'));
    } else {
      request.flush(body, { status, statusText: 'Error' });
    }
    expect(received).toBeInstanceOf(ApiError);
    return received as ApiError;
  }

  it('does not interfere with successful responses', () => {
    let result: unknown;
    http.get('/ok').subscribe((value) => (result = value));

    controller.expectOne('/ok').flush({ fine: true });

    expect(result).toEqual({ fine: true });
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('shows the backend message for a 400 and exposes field errors to the caller', () => {
    const error = failWith(400, {
      status: 400,
      error: 'validation_error',
      message: 'Datos inválidos.',
      details: { isbn: ['Ya existe un libro con este ISBN.'], category: 'Este parámetro es obligatorio.' },
    });

    expect(notifications.error).toHaveBeenCalledExactlyOnceWith('Datos inválidos.');
    expect(error.status).toBe(400);
    expect(error.code).toBe('validation_error');
    expect(error.details).toEqual({
      isbn: ['Ya existe un libro con este ISBN.'],
      category: ['Este parámetro es obligatorio.'],
    });
  });

  it('falls back to a default message for a 400 without a body', () => {
    failWith(400, null);

    expect(notifications.error).toHaveBeenCalledExactlyOnceWith('Los datos enviados no son válidos.');
  });

  it('shows the backend message for a 404', () => {
    const error = failWith(404, { status: 404, error: 'not_found', message: 'No encontrado.', details: null });

    expect(notifications.error).toHaveBeenCalledExactlyOnceWith('No encontrado.');
    expect(error.code).toBe('not_found');
    expect(error.details).toBeNull();
  });

  it('shows a generic message for a 500 and never leaks the server text', () => {
    const error = failWith(500, { status: 500, error: 'internal_error', message: 'Traceback: secreto' });

    expect(notifications.error).toHaveBeenCalledExactlyOnceWith(
      'Ocurrió un error interno en el servidor. Inténtalo de nuevo más tarde.',
    );
    expect(error.code).toBe('internal_error');
  });

  it('reports a 503 with the backend message', () => {
    const error = failWith(503, {
      status: 503,
      error: 'service_unavailable',
      message: 'Servicio de tasas de cambio no disponible.',
      details: null,
    });

    expect(notifications.error).toHaveBeenCalledExactlyOnceWith('Servicio de tasas de cambio no disponible.');
    expect(error.code).toBe('service_unavailable');
  });

  it('reports a 503 with a default message when the body is not JSON', () => {
    failWith(503, '<html>Bad gateway</html>');

    expect(notifications.error).toHaveBeenCalledExactlyOnceWith(
      'El servicio no está disponible temporalmente. Inténtalo de nuevo más tarde.',
    );
  });

  it('reports a network failure (status 0) as a connection problem', () => {
    const error = failWith(0, null);

    expect(notifications.error).toHaveBeenCalledExactlyOnceWith(
      'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.',
    );
    expect(error.status).toBe(0);
    expect(error.code).toBe('network_error');
  });

  it('ignores details that are not a field-to-messages map', () => {
    const error = failWith(400, { status: 400, error: 'validation_error', message: 'Mal', details: ['x'] });

    expect(error.details).toBeNull();
  });
});
