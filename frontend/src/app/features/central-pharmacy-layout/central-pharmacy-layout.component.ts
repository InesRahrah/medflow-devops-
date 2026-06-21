import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-central-pharmacy-layout',
  templateUrl: './central-pharmacy-layout.component.html',
  styleUrls: ['./central-pharmacy-layout.component.css'],
})
export class CentralPharmacyLayoutComponent implements OnInit {
  isSidebarCollapsed = false;

  constructor() {}

  ngOnInit(): void {}

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
