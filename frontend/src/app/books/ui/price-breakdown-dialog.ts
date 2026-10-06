import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

import { PriceCalculation } from '../domain/price-calculation.model';
import { PriceBreakdown } from './price-breakdown';

export interface PriceBreakdownDialogData {
  readonly bookTitle: string;
  readonly calculation: PriceCalculation;
}

/** Dialog showing the outcome of a price calculation started from the catalog list. */
@Component({
  selector: 'app-price-breakdown-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, PriceBreakdown],
  template: `
    <h2 mat-dialog-title>Precio de venta calculado</h2>
    <mat-dialog-content>
      <p class="book">{{ data.bookTitle }}</p>
      <app-price-breakdown [calculation]="data.calculation" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton="filled" mat-dialog-close type="button" cdkFocusInitial>Entendido</button>
    </mat-dialog-actions>
  `,
  styles: `
    .book {
      margin: 0 0 12px;
      font: var(--mat-sys-title-small);
    }
  `,
})
export class PriceBreakdownDialog {
  protected readonly data = inject<PriceBreakdownDialogData>(MAT_DIALOG_DATA);
}
