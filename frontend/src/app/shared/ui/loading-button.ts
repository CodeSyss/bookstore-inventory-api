import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

export type LoadingButtonAppearance = 'text' | 'filled' | 'outlined' | 'tonal';

/**
 * Button with its own spinner: while `loading` it is disabled and shows a spinner in place
 * of the icon. With `iconOnly` it renders a compact icon button using `label` as tooltip
 * and accessible name.
 */
@Component({
  selector: 'app-loading-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    @if (iconOnly()) {
      <button
        matIconButton
        type="button"
        [disabled]="disabled() || loading()"
        [attr.aria-label]="label()"
        [attr.aria-busy]="loading()"
        [matTooltip]="label()"
        (click)="pressed.emit()"
      >
        @if (loading()) {
          <mat-progress-spinner mode="indeterminate" diameter="20" aria-label="Cargando" />
        } @else {
          <mat-icon>{{ icon() }}</mat-icon>
        }
      </button>
    } @else {
      <button
        [matButton]="appearance()"
        type="button"
        [disabled]="disabled() || loading()"
        [attr.aria-busy]="loading()"
        (click)="pressed.emit()"
      >
        @if (loading()) {
          <mat-progress-spinner mode="indeterminate" diameter="18" aria-label="Cargando" />
        } @else if (icon()) {
          <mat-icon>{{ icon() }}</mat-icon>
        }
        {{ loading() && loadingLabel() ? loadingLabel() : label() }}
      </button>
    }
  `,
  styles: `
    :host {
      display: inline-block;
    }

    mat-progress-spinner {
      display: inline-block;
      vertical-align: middle;
    }
  `,
})
export class LoadingButton {
  readonly label = input.required<string>();
  readonly icon = input<string | null>(null);
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly iconOnly = input(false);
  readonly appearance = input<LoadingButtonAppearance>('text');
  /** Optional text shown instead of `label` while loading. */
  readonly loadingLabel = input<string | null>(null);

  readonly pressed = output<void>();
}
