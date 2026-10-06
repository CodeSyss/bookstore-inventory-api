import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppToolbar } from './core/layout/app-toolbar';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AppToolbar],
  template: `
    <app-toolbar />
    <main id="main-content">
      <router-outlet />
    </main>
  `,
})
export class App {}
