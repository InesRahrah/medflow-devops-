import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanMatch,
  Route,
  UrlSegment,
  Router,
  UrlTree,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ROLE_CONFIG } from '../config/role-config';

@Injectable({ providedIn: 'root' })
export class RoleAccessGuard implements CanActivate, CanMatch {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canMatch(
    route: Route,
    segments: UrlSegment[],
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    const expectedRoles = (route.data?.['roles'] || []) as string[];
    const allowGuest = !!route.data?.['allowGuest'];
    return this.checkAccess(expectedRoles, allowGuest);
  }

  canActivate(
    route: ActivatedRouteSnapshot,
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    const expectedRoles = (route.data['roles'] || []) as string[];
    const allowGuest = !!route.data['allowGuest'];
    return this.checkAccess(expectedRoles, allowGuest);
  }

  private checkAccess(
    expectedRoles: string[],
    allowGuest: boolean,
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    const token = this.authService.getToken();
    const isLoggedIn = !!token;

    if (!isLoggedIn) {
      return allowGuest ? true : this.router.parseUrl('/login');
    }

    const profile$ = this.authService.hasRoleInStoredProfile()
      ? of(this.authService.getStoredUserInfo())
      : this.authService.getProfile();

    return profile$.pipe(
      map(() => {
        const role = this.authService.getUserRole().toUpperCase();
        const staffRole = this.authService.getStaffRole();
        const effectiveRole = staffRole || role;

        // Requirement: Prevent staff/authenticated users from staying on public routes if redirect is desired
        // But only if they are logged in and it's a guest-allowed route
        if (isLoggedIn && allowGuest && effectiveRole !== 'PATIENT' && effectiveRole !== 'UNKNOWN') {
           // If they are staff and on a public route, redirect to their dashboard
          return this.router.parseUrl(this.getDashboardRoute(effectiveRole));
        }

        if (!expectedRoles.length || expectedRoles.includes(role) || (staffRole && expectedRoles.includes(staffRole))) {
          return true;
        }

        return this.router.parseUrl(this.getDashboardRoute(effectiveRole));
      }),
      catchError(() => of(this.router.parseUrl('/login'))),
    );
  }

  private getDashboardRoute(role: string): string {
    const config = ROLE_CONFIG[role.toUpperCase()];
    return config ? config.baseRoute : '/';
  }
}
