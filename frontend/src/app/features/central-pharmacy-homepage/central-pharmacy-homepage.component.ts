import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { RequestService } from '../../core/services/request.service';

@Component({
  selector: 'app-central-pharmacy-homepage',
  templateUrl: './central-pharmacy-homepage.component.html',
  styleUrls: ['./central-pharmacy-homepage.component.css'],
})
export class CentralPharmacyHomepageComponent implements OnInit {

  region: string = '';
  userFirstName: string = '';
  userLastName: string = '';
  isLoading: boolean = false;

  stats = {
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0
  };

  constructor(
    private authService: AuthService,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    setTimeout(() => this.loadStats(), 150);
  }

  // ✅ USER INFO
  loadUserInfo(): void {
    this.userFirstName = this.authService.getUserFirstName() || 'Welcome';
    this.userLastName = this.authService.getUserLastName() || '';

    const token = this.authService.decodeToken();
    if (token) {
      this.region = token.region || '';
      console.log('Homepage - Region loaded:', this.region);
    }
  }

  // ✅ STATS
  loadStats(): void {
    this.isLoading = true;
    console.log('🔥 Homepage - Starting stats load');
    console.log('🔥 Homepage - Region:', this.region);
    console.log('🔥 Homepage - User:', this.userFirstName);

    this.requestService.getAllForCentral().subscribe({
      next: (requests: any[]) => {
        console.log('🔥 Homepage - API Response received, total items:', requests?.length || 0);
        console.log('🔥 Homepage - Raw data:', requests);

        // 🔥 GET ALL REQUESTS FIRST
        const allRequests = Array.isArray(requests) ? requests : [];
        console.log('🔥 Homepage - All requests count:', allRequests.length);
        
        // 📍 FILTER BY REGION IF AVAILABLE
        let filtered = allRequests;
        if (this.region) {
          filtered = allRequests.filter(r => r?.region === this.region);
          console.log('🔥 Homepage - Filtered by region:', this.region);
          console.log('🔥 Homepage - Filtered requests count:', filtered.length);
        } else {
          console.warn('🔥 Homepage - No region to filter by, using all requests');
        }

        // 📊 CALCULATE STATS
        this.stats.totalRequests = filtered.length;
        this.stats.pendingRequests = filtered.filter(r => r?.requestStatus === 'PENDING').length;
        this.stats.approvedRequests = filtered.filter(r => r?.requestStatus === 'APPROVED').length;
        this.stats.rejectedRequests = filtered.filter(r => r?.requestStatus === 'REJECTED').length;

        console.log('🔥 Homepage - Final Statistics:', {
          total: this.stats.totalRequests,
          pending: this.stats.pendingRequests,
          approved: this.stats.approvedRequests,
          rejected: this.stats.rejectedRequests
        });

        this.isLoading = false;
      },

      error: (error: any) => {
        console.error('🔥 Homepage - Error loading statistics:', error);
        this.isLoading = false;
        
        // Fallback: Load my requests only
        this.requestService.getMyRequests().subscribe({
          next: (myRequests: any[]) => {
            console.log('🔥 Homepage - Fallback: Loaded my requests:', myRequests?.length || 0);
            const allReqs = Array.isArray(myRequests) ? myRequests : [];
            this.stats.totalRequests = allReqs.length;
            this.stats.pendingRequests = allReqs.filter(r => r?.requestStatus === 'PENDING').length;
            this.stats.approvedRequests = allReqs.filter(r => r?.requestStatus === 'APPROVED').length;
            this.stats.rejectedRequests = allReqs.filter(r => r?.requestStatus === 'REJECTED').length;
          },
          error: (fallbackError: any) => {
            console.error('🔥 Homepage - Fallback also failed:', fallbackError);
          }
        });
      }
    });
  }

  // ✅ GREETING
  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  // ✅ REFRESH
  refreshStats(): void {
    this.loadStats();
  }

  // ✅ ACTION HANDLERS
  onReviewRequests(): void {
    // Navigate to requests
  }

  onViewAnalytics(): void {
    // Navigate to dashboard
  }

  onEditProfile(): void {
    // Navigate to profile
  }
}