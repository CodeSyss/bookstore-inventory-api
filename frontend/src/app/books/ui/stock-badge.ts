import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { LOW_STOCK_THRESHOLD } from '../domain/book.model';

/** Stock quantity with a warning treatment when it is at or below the threshold. */
@Component({
  selector: 'app-stock-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <span class="badge" [class.low]="low()" [class.empty]="quantity() === 0" [attr.aria-label]="ariaLabel()">
      @if (low()) {
        <mat-icon class="icon" aria-hidden="true">warning</mat-icon>
      }
      {{ quantity() }}
    </span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 10px;
      border-radius: 999px;
      font: var(--mat-sys-label-large);
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface);
    }

    .badge.low {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }

    .badge.empty {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }

    .icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
  `,
})
export class StockBadge {
  readonly quantity = input.required<number>();
  readonly threshold = input(LOW_STOCK_THRESHOLD);

  protected readonly low = computed(() => this.quantity() <= this.threshold());
  protected readonly ariaLabel = computed(() => {
    const quantity = this.quantity();
    const units = `${quantity} ${quantity === 1 ? 'unidad' : 'unidades'}`;
    return this.low() ? `${units}, stock bajo` : units;
  });
}
