import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

type Severity = 'success' | 'error' | 'warning';

const DURATION_MS: Record<Severity, number> = {
  success: 4000,
  warning: 6000,
  error: 7000,
};

/** Single entry point for user-facing toast notifications. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, 'success');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  private show(message: string, severity: Severity): void {
    const config: MatSnackBarConfig = {
      duration: DURATION_MS[severity],
      panelClass: `snackbar-${severity}`,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    };
    this.snackBar.open(message, 'Cerrar', config);
  }
}
