import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Application top bar with branding and primary navigation. */
@Component({
  selector: 'app-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatToolbarModule],
  template: `
    <mat-toolbar class="toolbar">
      <a class="brand" routerLink="/books" aria-label="Inventario de Librería, ir al inicio">
        <mat-icon aria-hidden="true">auto_stories</mat-icon>
        <span class="brand-name">Inventario de Librería</span>
      </a>
      <span class="spacer"></span>
      <nav aria-label="Navegación principal" class="nav">
        <a
          matButton="tonal"
          routerLink="/books"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          aria-label="Inventario"
          [routerLinkActiveOptions]="{ exact: true }"
        >
          <mat-icon>inventory_2</mat-icon>
          <span class="nav-label">Inventario</span>
        </a>
      </nav>
    </mat-toolbar>
  `,
  styles: `
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      color: var(--mat-sys-primary);
      text-decoration: none;
      font: var(--mat-sys-title-large);
    }

    .spacer {
      flex: 1 1 auto;
    }

    .nav {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    @media (max-width: 600px) {
      .brand-name {
        font: var(--mat-sys-title-medium);
      }

      .nav-label {
        display: none;
      }
    }
  `,
})
export class AppToolbar {}
