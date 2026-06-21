import { Component, OnInit, ViewChild, NgZone } from '@angular/core';
import { RequestService } from '../../core/services/request.service';
import { AuthService } from '../../core/services/auth.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-central-pharmacy-dashboard',
  templateUrl: './central-pharmacy-dashboard.component.html',
  styleUrls: ['./central-pharmacy-dashboard.component.css'],
})
export class CentralPharmacyDashboardComponent implements OnInit {
  @ViewChild('pieCanvas') pieCanvas: any;
  @ViewChild('barCanvas') barCanvas: any;

  // 📊 STATISTICS
  totalRequests = 0;
  pendingRequests = 0;
  approvedRequests = 0;
  rejectedRequests = 0;

  // 🎨 DISPLAY COUNTERS (animated)
  displayTotal = 0;
  displayPending = 0;
  displayApproved = 0;
  displayRejected = 0;

  // 🔧 STATE
  region = '';
  isLoading = true;
  isRefreshing = false;
  allRequests: any[] = [];

  // 📈 CHARTS
  pieChart: any;
  barChart: any;

  constructor(
    private requestService: RequestService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadRegion();
    this.loadStatistics();
  }

  // 🌍 LOAD REGION FROM TOKEN
  loadRegion(): void {
    const tokenData = this.authService.decodeToken();
    if (tokenData?.region) {
      this.region = tokenData.region;
    }
  }

  // 📊 LOAD STATISTICS
  loadStatistics(): void {
    this.isLoading = true;

    this.requestService.getAllForCentral().subscribe({
      next: (res: any[]) => {
        this.allRequests = Array.isArray(res) ? res : [];

        // Filter by region
        const filtered = this.region
          ? this.allRequests.filter(r => r?.region === this.region)
          : this.allRequests;

        // Calculate statistics
        this.totalRequests = filtered.length;
        this.pendingRequests = filtered.filter(r => r?.requestStatus === 'PENDING').length;
        this.approvedRequests = filtered.filter(r => r?.requestStatus === 'APPROVED').length;
        this.rejectedRequests = filtered.filter(r => r?.requestStatus === 'REJECTED').length;

        // Animate counters
        this.animateCounters();

        // Initialize charts after delay to ensure DOM is ready
        setTimeout(() => {
          this.initCharts();
        }, 100);

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  // ✨ ANIMATE COUNTERS
  animateCounters(): void {
    const duration = 800;
    const steps = 60;
    const interval = duration / steps;

    const animateValue = (start: number, end: number, callback: (val: number) => void) => {
      let current = start;
      const increment = (end - start) / steps;
      const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
          callback(end);
          clearInterval(timer);
        } else {
          callback(Math.floor(current));
        }
      }, interval);
    };

    animateValue(0, this.totalRequests, (val) => this.displayTotal = val);
    animateValue(0, this.pendingRequests, (val) => this.displayPending = val);
    animateValue(0, this.approvedRequests, (val) => this.displayApproved = val);
    animateValue(0, this.rejectedRequests, (val) => this.displayRejected = val);
  }

  // 📈 INITIALIZE CHARTS
  initCharts(): void {
    // Destroy existing charts if they exist
    if (this.pieChart) this.pieChart.destroy();
    if (this.barChart) this.barChart.destroy();

    this.createPieChart();
    this.createBarChart();
  }

  // 🥧 PIE CHART
  createPieChart(): void {
    const ctx = document.getElementById('pieChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Approved', 'Rejected'],
        datasets: [
          {
            data: [this.pendingRequests, this.approvedRequests, this.rejectedRequests],
            backgroundColor: ['#FFA500', '#00A8E8', '#FF6B6B'],
            borderColor: ['#ffffff', '#ffffff', '#ffffff'],
            borderWidth: 3,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 12, weight: '500' },
              color: '#333',
              padding: 15
            }
          }
        }
      } as any
    });
  }

  // 📊 BAR CHART
  createBarChart(): void {
    const ctx = document.getElementById('barChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Pending', 'Approved', 'Rejected'],
        datasets: [
          {
            label: 'Number of Requests',
            data: [this.pendingRequests, this.approvedRequests, this.rejectedRequests],
            backgroundColor: ['#FFA500', '#00A8E8', '#FF6B6B'],
            borderRadius: 8,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            labels: {
              font: { size: 12 },
              color: '#333'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#666',
              font: { size: 11 }
            },
            grid: {
              color: '#f0f0f0'
            }
          },
          x: {
            ticks: {
              color: '#666',
              font: { size: 11 }
            },
            grid: {
              display: false
            }
          }
        }
      } as any
    });
  }

  // 🔄 REFRESH DATA
  refreshData(): void {
    this.isRefreshing = true;
    setTimeout(() => {
      this.loadStatistics();
      this.isRefreshing = false;
    }, 500);
  }

  // 💡 GET INSIGHT MESSAGE
  getInsight(): string {
    if (this.totalRequests === 0) {
      return '📭 No requests at the moment';
    }
    if (this.pendingRequests > this.approvedRequests * 2) {
      return '⚠️ High number of pending requests - action needed';
    }
    if (this.pendingRequests === 0) {
      return '✅ All requests processed successfully';
    }
    return '📊 System running smoothly';
  }

  // 📊 CALCULATE PERCENTAGE
  getPercent(value: number): number {
    return this.totalRequests > 0 ? (value / this.totalRequests) * 100 : 0;
  }

  // 🎯 GET STATUS BADGE CLASS
  getStatusClass(status: string): string {
    return `badge-${status.toLowerCase()}`;
  }
}