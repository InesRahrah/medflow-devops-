import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ROLE_CONFIG, NavLink } from '../../../core/config/role-config';


export interface NavGroup {
  section?: string;
  links: NavLink[];
}


@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit {
  userRole: string = 'UNKNOWN';
  navGroups: NavGroup[] = [];


  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}


  ngOnInit(): void {
    this.userRole = this.authService.getUserRole();
    this.generateLinks();
  }


  generateLinks(): void {
    const role = (this.userRole || '').toUpperCase();
    const staffRole = this.authService.getStaffRole();
    const effectiveRole = staffRole || role;

      console.log('👤 userRole:', role);
  console.log('🏥 staffRole:', staffRole);
  console.log('✅ effectiveRole:', effectiveRole);
  console.log('🔗 links count:', ROLE_CONFIG[effectiveRole]?.links?.length);


    const config = ROLE_CONFIG[effectiveRole];
    if (config) {
      this.navGroups = this.groupLinks(config.links);
    } else {
      console.warn('SidebarComponent: No links defined for role:', effectiveRole);
      this.navGroups = [];
    }
  }


  private groupLinks(links: NavLink[]): NavGroup[] {
    const groups: NavGroup[] = [];

    links.forEach(link => {
      let group = groups.find(g => g.section === link.section);
      if (!group) {
        group = { section: link.section, links: [] };
        groups.push(group);
      }
      group.links.push(link);
    });

    return groups;
  }


  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}