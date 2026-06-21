import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';
import { AuthService } from '../../../core/services/auth.service';
import { trigger, transition, style, query, animate, group } from '@angular/animations';

export const slideInAnimation = trigger('routeAnimations', [
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0 })
    ], { optional: true }),
    query(':leave', [
      animate('200ms ease-in', style({ opacity: 0 }))
    ], { optional: true }),
    query(':enter', [
      animate('300ms ease-out', style({ opacity: 1 }))
    ], { optional: true })
  ])
]);

@Component({
  selector: 'app-user-layout',
  templateUrl: './user-layout.component.html',
  styleUrls: ['./user-layout.component.css'],
  animations: [slideInAnimation]
})
export class UserLayoutComponent implements OnInit {
  isSidebarRole = false;
  showDashboardLayout = false;
  isAuthPage = false;
  showWizard = false;
  wizardOpenSession = 0;

  constructor(
    private router: Router,
    private layoutService: LayoutService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateLayoutState();
      }
    });

    // Initial check
    this.updateLayoutState();
  }

  private updateLayoutState(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    
    // Default to navbar if not specified
    const layoutType = route.data['layout'] || 'navbar';
    const useSidebarLayout = layoutType === 'sidebar';

    this.layoutService.setDashboardLayout(useSidebarLayout);
    this.layoutService.setSidebarRole(useSidebarLayout);

    this.isSidebarRole = useSidebarLayout;
    this.showDashboardLayout = useSidebarLayout;
  }

  openWizard(): void {
    this.wizardOpenSession += 1;
    this.showWizard = true;
  }

  prepareRoute(outlet: RouterOutlet) {
    if (outlet && outlet.isActivated) {
      let route = outlet.activatedRoute;
      while (route.firstChild) {
        route = route.firstChild;
      }
      return route.snapshot.data['animation'] || null;
    }
    return null;
  }
}
