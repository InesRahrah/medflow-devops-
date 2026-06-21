import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-hospitals',
  template: `
    <div class="admin-page">
      <header class="page-header">
        <div class="title-group">
          <h1>Hospitals</h1>
          <p>Manage and monitor all hospitals on the platform.</p>
        </div>
      </header>

      <div class="placeholder-content">
        <div class="empty-state">
          <div class="icon-circle">
            <i class="fas fa-hospital"></i>
          </div>
          <h2>Hospital Network Management</h2>
          <p>The hospital administration module is being finalized. You will soon be able to add, edit, and monitor clinical facilities across the entire network from this centralized view.</p>
          <button class="btn-primary" routerLink="/admin/dashboard">
            <i class="fas fa-arrow-left"></i>
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .placeholder-content {
      background: white;
      border-radius: 16px;
      padding: 4rem 2rem;
      border: 1px solid #e5e7eb63;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }
    .empty-state {
      text-align: center;
      max-width: 480px;
    }
    .icon-circle {
      width: 80px;
      height: 80px;
      background: #f0f9ff;
      color: var(--primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      margin: 0 auto 1.5rem;
    }
    h2 {
      font-size: 1.5rem;
      color: #0f172a;
      margin-bottom: 1rem;
    }
    p {
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
  `]
})
export class AdminHospitalsComponent {}
