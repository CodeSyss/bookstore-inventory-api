import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { NotificationService } from '../notifications/notification-service';
import { ApiError } from './api-error';

/**
 * Converts every HTTP failure into an {@link ApiError}, shows it as a toast and
 * rethrows it so callers can still react (for example mapping field errors onto a form).
 */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(NotificationService);

  return next(request).pipe(
    catchError((failure: unknown) => {
      if (!(failure instanceof HttpErrorResponse)) {
        return throwError(() => failure);
      }
      const apiError = ApiError.fromResponse(failure.status, failure.error);
      notifications.error(apiError.message);
      return throwError(() => apiError);
    }),
  );
};
