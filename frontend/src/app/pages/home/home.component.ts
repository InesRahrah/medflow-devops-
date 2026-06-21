import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  activeRole: string = 'patient';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    const userInfo = this.authService.getStoredUserInfo();
    if (this.authService.getToken() && userInfo && userInfo.setupCompleted === false) {
      this.router.navigate(['/setup-account']);
    }
  }

  roles = [
    { id: 'patient', label: 'Patient', icon: 'patient-icon' },
    { id: 'doctor', label: 'Doctor', icon: 'doctor-icon' },
    { id: 'laboratory', label: 'Laboratory', icon: 'lab-icon' },
    { id: 'hospital', label: 'Hospital', icon: 'hospital-icon' },
    { id: 'insurance', label: 'Insurance', icon: 'insurance-icon' }
  ];

  selectRole(roleId: string) {
    this.activeRole = roleId;
  }
}
