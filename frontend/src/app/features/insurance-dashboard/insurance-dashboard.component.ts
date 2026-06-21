import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { InsuranceService, Claim } from '../../core/services/insurance.service';

@Component({
  selector: 'app-insurance-dashboard',
  templateUrl: './insurance-dashboard.component.html',
  styleUrl: './insurance-dashboard.component.css'
})
export class InsuranceDashboardComponent implements OnInit, OnDestroy {

  claims: Claim[] = [];
  recentClaims: Claim[] = [];
  totalAmount = 0;
  isLoading = false;

  private destroy$ = new Subject<void>();

  constructor(private insuranceService: InsuranceService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.insuranceService.getAllClaims()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.claims = data;
          this.recentClaims = data.slice(0, 3);
          this.totalAmount = data.reduce((sum, c) => sum + (c.amount || 0), 0);
          this.isLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
        }
      });
  }

  get stats(): Record<string, number> {
    return this.claims.reduce((acc, c) => {
      const key = c.status || 'PENDING';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  get approvalRate(): string {
    const total = this.claims.length;
    if (total === 0) return '0%';
    return (((this.stats['APPROVED'] || 0) / total) * 100).toFixed(0) + '%';
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':  return 'pending';
      case 'approved': return 'approved';
      case 'rejected': return 'review';
      case 'paid':     return 'approved';
      default:         return '';
    }
  }
}