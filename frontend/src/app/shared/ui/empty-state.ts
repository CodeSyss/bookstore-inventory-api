import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Centered illustration-less placeholder; actions are projected as content. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <mat-icon class="icon" aria-hidden="true">{{ icon() }}</mat-icon>
    <h2 class="title">{{ title() }}</h2>
    @if (description()) {
      <p class="description">{{ description() }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
      padding: 48px 16px;
      color: var(--mat-sys-on-surface-variant);
    }

    .icon {
      width: 56px;
      height: 56px;
      font-size: 56px;
      color: var(--mat-sys-outline);
    }

    .title {
      font: var(--mat-sys-title-large);
      color: var(--mat-sys-on-surface);
    }

    .description {
      margin: 0;
      max-width: 44ch;
    }

    .actions {
      margin-top: 12px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }
  `,
})
export class EmptyState {
  readonly icon = input('inventory_2');
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
