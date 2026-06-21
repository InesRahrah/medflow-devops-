import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import {
  DmrService,
  LabQueueItemResponse,
} from '../../core/services/dmr.service';

export interface LabRequest {
  id: string;
  patientName: string;
  testType: string;
  status: string;
  doctorName: string;
}

export interface Activity {
  title: string;
  desc: string;
  time: string;
  type: string;
  icon: string;
}

@Component({
  selector: 'app-lab-dashboard',
  templateUrl: './lab-dashboard.component.html',
  styleUrl: './lab-dashboard.component.css',
})
export class LabDashboardComponent implements OnInit {
  recentRequests: LabRequest[] = [];
  recentActivity: Activity[] = [];

  constructor(
    private authService: AuthService,
    private dmrService: DmrService,
  ) {}

  ngOnInit(): void {
    const laboId = this.authService.getUserIdAsString();
    if (!laboId) {
      return;
    }

    this.dmrService.getLabReports(laboId).subscribe({
      next: (requests: LabQueueItemResponse[]) => {
        this.recentRequests = (requests || []).slice(0, 6).map((item) => ({
          id: item.requestId,
          patientName: item.patientName || 'Patient',
          testType: item.testType,
          status: item.status,
          doctorName: item.requestedByName || 'Doctor',
        }));
      },
      error: () => {
        this.recentRequests = [];
      },
    });
  }
}
