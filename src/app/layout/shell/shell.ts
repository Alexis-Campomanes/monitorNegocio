import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { MODULE_IDS, ModuleId } from '../../core/models';
import { Store } from '../../core/store';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatButtonModule, MatDividerModule, MatIconModule, MatListModule, MatMenuModule,
    MatSidenavModule, MatToolbarModule, MatTooltipModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly store = inject(Store);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  private readonly narrow = toSignal(
    inject(BreakpointObserver).observe('(max-width: 760px)').pipe(map((s) => s.matches)),
    { initialValue: false },
  );

  protected readonly collapsed = computed(() => this.store.sidebarCollapsed() || this.narrow());

  protected readonly navItems = computed(() => {
    const mods = this.store.modules();
    return MODULE_IDS.map((id) => ({ id, label: mods[id].label, icon: mods[id].icon }));
  });

  protected readonly initials = computed(() =>
    (this.store.user()?.nombre ?? '')
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join(''),
  );

  protected readonly crumb = computed(() => {
    const [mod, id] = this.url().split('?')[0].split('/').filter(Boolean);
    const label = this.store.modules()[mod as ModuleId]?.label ?? '';
    if (mod === 'pedidos' && id) {
      const order = this.store.db().pedidos.find((o) => o.id === id);
      return order ? `${label} / ${order.codigo}` : label;
    }
    return label;
  });

  protected logout(): void {
    this.store.logout();
    this.router.navigate(['/login']);
  }
}
