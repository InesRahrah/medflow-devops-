import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SetupGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<boolean | UrlTree> {
    const isSetupRequired = this.authService.isSetupRequired();
    const isSetupPage = state.url.includes('/setup-account');

    if (isSetupRequired) {
      if (isSetupPage) {
        return true;
      }
      return this.router.createUrlTree(['/setup-account']);
    } else {
      if (isSetupPage) {
        // If they don't need setup but try to access the setup page, redirect to dashboard/home
        return this.router.createUrlTree(['/']);
      }
      return true;
    }
  }
}
