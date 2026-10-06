import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { PriceCalculation } from '../domain/price-calculation.model';

/** Step-by-step breakdown of how a selling price was derived from the USD cost. */
@Component({
  selector: 'app-price-breakdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, MatIconModule],
  template: `
    @let calc = calculation();

    @if (calc.rateSource === 'fallback') {
      <div class="notice" role="status">
        <mat-icon aria-hidden="true">info</mat-icon>
        <p>
          Se utilizó la tasa de cambio por defecto porque el servicio de tasas en vivo no estuvo disponible. El
          precio puede diferir del valor real del mercado.
        </p>
      </div>
    }

    <dl class="breakdown">
      <div class="row">
        <dt>Costo original</dt>
        <dd>{{ calc.costUsd | currency: 'USD' : 'symbol' : '1.2-2' }}</dd>
      </div>
      <div class="row">
        <dt>Tasa de cambio aplicada</dt>
        <dd>
          1 USD = {{ calc.exchangeRate | number: '1.2-6' }} {{ calc.currency }}
          <span class="source" [class.fallback]="calc.rateSource === 'fallback'">
            {{ calc.rateSource === 'live' ? 'En vivo' : 'Por defecto' }}
          </span>
        </dd>
      </div>
      <div class="row">
        <dt>Costo en moneda local</dt>
        <dd>{{ calc.costLocal | currency: calc.currency : 'symbol' : '1.2-2' }}</dd>
      </div>
      <div class="row">
        <dt>Margen de ganancia</dt>
        <dd>{{ calc.marginPercentage | number: '1.0-2' }} %</dd>
      </div>
      <div class="row total">
        <dt>Precio de venta final</dt>
        <dd>{{ calc.sellingPriceLocal | currency: calc.currency : 'symbol' : '1.2-2' }}</dd>
      </div>
      <div class="row">
        <dt>Moneda</dt>
        <dd>{{ calc.currency }}</dd>
      </div>
      <div class="row">
        <dt>Calculado el</dt>
        <dd>{{ calc.calculatedAt | date: 'medium' }}</dd>
      </div>
    </dl>
  `,
  styles: `
    :host {
      display: block;
    }

    .notice {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: var(--mat-sys-corner-small);
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);

      mat-icon {
        flex: none;
      }

      p {
        margin: 0;
      }
    }

    .breakdown {
      margin: 0;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);

      &:last-child {
        border-bottom: 0;
      }
    }

    dt {
      color: var(--mat-sys-on-surface-variant);
    }

    dd {
      margin: 0;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .total {
      dt,
      dd {
        color: var(--mat-sys-primary);
        font: var(--mat-sys-title-medium);
      }
    }

    .source {
      margin-left: 8px;
      padding: 1px 8px;
      border-radius: 999px;
      font: var(--mat-sys-label-small);
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);

      &.fallback {
        background: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
      }
    }
  `,
})
export class PriceBreakdown {
  readonly calculation = input.required<PriceCalculation>();
}
