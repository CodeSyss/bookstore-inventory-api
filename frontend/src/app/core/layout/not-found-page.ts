import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { EmptyState } from '../../shared/ui/empty-state';

@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, EmptyState],
  template: `
    <section class="page">
      <app-empty-state
        icon="travel_explore"
        title="Página no encontrada"
        description="La dirección que ingresaste no existe."
      >
        <a matButton="filled" routerLink="/books">Ir al inventario</a>
      </app-empty-state>
    </section>
  `,
})
export class NotFoundPage {}
