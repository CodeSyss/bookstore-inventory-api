import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LoadingButton } from '../../shared/ui/loading-button';

/** Action buttons for one book; `icons` is compact (table row), `card` labels the calculate action. */
@Component({
  selector: 'app-book-row-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, LoadingButton],
  host: { '[attr.variant]': 'variant()' },
  template: `
    <app-loading-button
      [label]="'Calcular precio de venta'"
      icon="calculate"
      [iconOnly]="variant() === 'icons'"
      [appearance]="'tonal'"
      [loading]="calculating()"
      [disabled]="deleting()"
      (pressed)="calculate.emit()"
    />
    <button
      matIconButton
      type="button"
      aria-label="Ver detalle"
      matTooltip="Ver detalle"
      [disabled]="deleting()"
      (click)="view.emit()"
    >
      <mat-icon>visibility</mat-icon>
    </button>
    <button
      matIconButton
      type="button"
      aria-label="Editar libro"
      matTooltip="Editar libro"
      [disabled]="deleting()"
      (click)="edit.emit()"
    >
      <mat-icon>edit</mat-icon>
    </button>
    <button
      matIconButton
      type="button"
      aria-label="Eliminar libro"
      matTooltip="Eliminar libro"
      [disabled]="deleting() || calculating()"
      (click)="remove.emit()"
    >
      <mat-icon>delete</mat-icon>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-wrap: nowrap;
    }

    :host([variant='card']) {
      flex-wrap: wrap;
    }
  `,
})
export class BookRowActions {
  readonly variant = input<'icons' | 'card'>('icons');
  readonly calculating = input(false);
  readonly deleting = input(false);

  readonly calculate = output<void>();
  readonly view = output<void>();
  readonly edit = output<void>();
  readonly remove = output<void>();
}
