import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanMatch,
  Route,
  Router,
  UrlSegment,
  UrlTree,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate, CanMatch {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    return this.checkRole(route.data);
  }

  canMatch(route: Route, segments: UrlSegment[]): boolean | UrlTree {
    return this.checkRole(route.data);
  }

  private checkRole(data?: Record<string, any>): boolean | UrlTree {
    const expectedRolesRaw = (data?.['roles'] as string[] | undefined)
      ?? ((data?.['role'] as string | undefined) ? [data?.['role']] : []);

    if (!expectedRolesRaw.length) {
      return true;
    }

    const expectedRoles = expectedRolesRaw
      .map((role) => String(role).toUpperCase().trim())
      .filter((role) => !!role);

    const staffOnly = String(data?.['source'] || '').toLowerCase() === 'staff';

    const token = this.authService.getToken();
    if (!token) {
      return this.router.parseUrl('/login');
    }

    const staffRole = this.authService.getStaffRole();
    const userRole = this.authService.getSystemRole() ?? this.authService.getUserRole();

    const matchesStaffRole = !!staffRole && expectedRoles.includes(staffRole);
    const matchesUserRole = !!userRole && expectedRoles.includes(String(userRole).toUpperCase());

    if ((staffOnly && matchesStaffRole) || (!staffOnly && (matchesStaffRole || matchesUserRole))) {
      return true;
    }

    return this.router.parseUrl('/unauthorized');
  }
}
