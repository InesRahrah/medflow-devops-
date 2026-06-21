import { Component } from '@angular/core';

@Component({
  selector: 'app-patient-dashboard',
  templateUrl: './patient-dashboard.component.html',
  styleUrl: './patient-dashboard.component.css'
})
export class PatientDashboardComponent {
  sidebarOpen = false;
  sidebarWidth = 380;
  private resizing = false;
  private startX = 0;
  private startWidth = 380;

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  startResizing(event: MouseEvent) {
    this.resizing = true;
    this.startX = event.clientX;
    this.startWidth = this.sidebarWidth;
    document.addEventListener('mousemove', this.resizeSidebar);
    document.addEventListener('mouseup', this.stopResizing);
  }

  resizeSidebar = (event: MouseEvent) => {
    if (!this.resizing) return;
    const dx = this.startX - event.clientX;
    let newWidth = this.startWidth + dx;
    if (newWidth < 280) newWidth = 280;
    if (newWidth > window.innerWidth * 0.9) newWidth = window.innerWidth * 0.9;
    this.sidebarWidth = newWidth;
  };

  stopResizing = () => {
    this.resizing = false;
    document.removeEventListener('mousemove', this.resizeSidebar);
    document.removeEventListener('mouseup', this.stopResizing);
  };
}
