import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private isSidebarRoleSubject = new BehaviorSubject<boolean>(false);
  isSidebarRole$ = this.isSidebarRoleSubject.asObservable();

  private showDashboardLayoutSubject = new BehaviorSubject<boolean>(false);
  showDashboardLayout$ = this.showDashboardLayoutSubject.asObservable();

  setSidebarRole(isActive: boolean): void {
    this.isSidebarRoleSubject.next(isActive);
  }

  setDashboardLayout(show: boolean): void {
    this.showDashboardLayoutSubject.next(show);
  }
}
