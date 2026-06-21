import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { InsightsService, InsightsData } from '../../../core/services/insights.service';
import { StockService } from '../../../core/services/stock.service';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-pharmacy',
  template: `
    <div class="admin-page">
      <header class="page-header">
        <div class="title-group">
          <h1>
            <i class="fas fa-pills"></i>
            Pharmacy Insights
          </h1>
          <p>Global pharmaceutical distribution and inventory analytics</p>
        </div>
        <button
          class="btn-refresh"
          (click)="refreshData()"
          [disabled]="isLoading"
          title="Refresh data"
        >
          <i class="fas fa-sync-alt" [class.spinning]="isLoading"></i>
          Refresh
        </button>
        <button
          class="btn-view-all-stocks"
          (click)="openAllStocksModal()"
          title="View all stocks in inventory"
        >
          <i class="fas fa-warehouse"></i>
          View All Stocks
        </button>
      </header>

      <!-- Loading State -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Loading analytics...</p>
      </div>

      <!-- Error Message -->
      <div class="error-alert" *ngIf="error">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ error }}</span>
      </div>

      <!-- Main Content -->
      <div class="content" *ngIf="!isLoading && insights">
        <!-- Primary Metrics Row -->
        <div class="metrics-grid">
          <div class="metric-card metric-primary">
            <div class="metric-icon">
              <i class="fas fa-boxes"></i>
            </div>
            <div class="metric-info">
              <h3>Total Products</h3>
              <p class="metric-value">{{ insights.totalProducts }}</p>
            </div>
          </div>

          <div class="metric-card metric-warning">
            <div class="metric-icon">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="metric-info">
              <h3>Low Stock Items</h3>
              <p class="metric-value">{{ insights.lowStockItems }}</p>
            </div>
          </div>

          <div class="metric-card metric-info">
            <div class="metric-icon">
              <i class="fas fa-file-invoice"></i>
            </div>
            <div class="metric-info">
              <h3>Total Requests</h3>
              <p class="metric-value">{{ insights.totalRequests }}</p>
            </div>
          </div>

          <div class="metric-card metric-success">
            <div class="metric-icon">
              <i class="fas fa-truck"></i>
            </div>
            <div class="metric-info">
              <h3>Active Deliveries</h3>
              <p class="metric-value">{{ insights.activeDeliveries }}</p>
            </div>
          </div>

          <div class="metric-card metric-secondary">
            <div class="metric-icon">
              <i class="fas fa-users"></i>
            </div>
            <div class="metric-info">
              <h3>Delivery Agents</h3>
              <p class="metric-value">{{ insights.totalDeliveryAgents }}</p>
            </div>
          </div>
        </div>

        <!-- Status Breakdown Row -->
        <div class="status-breakdown">
          <div class="status-card">
            <h4>Request Status</h4>
            <div class="status-item">
              <span class="status-label">Pending</span>
              <span class="status-count pending">{{ insights.requestsByStatus.pending }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Approved</span>
              <span class="status-count approved">{{ insights.requestsByStatus.approved }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Rejected</span>
              <span class="status-count rejected">{{ insights.requestsByStatus.rejected }}</span>
            </div>
          </div>

          <div class="status-card">
            <h4>Delivery Status</h4>
            <div class="status-item">
              <span class="status-label">Pending</span>
              <span class="status-count pending">{{ insights.deliveriesByStatus.pending }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">In Progress</span>
              <span class="status-count inprogress">{{ insights.deliveriesByStatus.inProgress }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Delivered</span>
              <span class="status-count delivered">{{ insights.deliveriesByStatus.delivered }}</span>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="charts-row">
          <div class="chart-container">
            <h3>Drug Type Distribution</h3>
            <canvas #drugTypeChart></canvas>
          </div>

          <div class="chart-container">
            <h3>Requests by Status</h3>
            <canvas #requestsStatusChart></canvas>
          </div>

          <div class="chart-container">
            <h3>Deliveries by Status</h3>
            <canvas #deliveriesStatusChart></canvas>
          </div>
        </div>

        <!-- Recent Requests Table -->
        <div class="table-section" *ngIf="insights.recentRequests.length > 0">
          <h3>
            <i class="fas fa-history"></i>
            Recent Requests
          </h3>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Hospital Name</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let req of insights.recentRequests">
                  <td>{{ req.hospitalName }}</td>
                  <td>
                    <span class="status-badge" [class]="'status-' + (req.status | lowercase)">
                      {{ req.status | titlecase }}
                    </span>
                  </td>
                  <td>{{ req.createdAt | date: 'short' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- All Stocks Modal -->
        <div class="all-stocks-modal" *ngIf="showAllStocks">
          <div class="all-stocks-modal-overlay" (click)="closeAllStocksModal()"></div>
          <div class="all-stocks-modal-content">
            <div class="all-stocks-modal-header">
              <h2>📦 Complete Inventory - All Stocks</h2>
              <button class="btn-close-modal" (click)="closeAllStocksModal()">✕</button>
            </div>
            
            <!-- Search Bar -->
            <div class="search-bar-container">
              <i class="fas fa-search"></i>
              <input 
                type="text" 
                class="search-input"
                [(ngModel)]="searchTerm"
                (input)="filterStocks()"
                placeholder="Search by product name or type..."
              >
              <span *ngIf="searchTerm" class="search-clear" (click)="searchTerm=''; filterStocks()">✕</span>
            </div>
            
            <div class="all-stocks-modal-body">
              <div *ngIf="!filteredStocks || filteredStocks.length === 0" class="no-stocks">
                <p>{{ searchTerm ? 'No stocks match your search' : 'No stocks found in inventory' }}</p>
              </div>
              
              <div *ngIf="filteredStocks && filteredStocks.length > 0" class="all-stocks-list">
                <div *ngFor="let stock of filteredStocks" class="all-stock-item" (click)="openEditStockModal(stock)" style="cursor: pointer;">
                  <div class="stock-header">
                    <h4>{{ stock.name }}</h4>
                    <span class="stock-badge" [ngClass]="{'stock-low': stock.availableQuantity <= stock.minThreshold, 'stock-ok': stock.availableQuantity > stock.minThreshold}">
                      {{ stock.availableQuantity <= stock.minThreshold ? '⚠️ LOW' : '✅ OK' }}
                    </span>
                  </div>
                  
                  <div class="stock-details-grid">
                    <div class="detail-item">
                      <span class="detail-label">Product Type:</span>
                      <span class="detail-value">{{ stock.type || 'N/A' }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Available Qty:</span>
                      <span class="detail-value">{{ stock.availableQuantity }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Min Threshold:</span>
                      <span class="detail-value">{{ stock.minThreshold }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Expiration Date:</span>
                      <span class="detail-value">{{ stock.expirationDate | date: 'dd/MM/yyyy' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Edit Stock Form Modal -->
        <div class="edit-stock-modal" *ngIf="editingStock">
          <div class="edit-stock-modal-overlay" (click)="closeEditStockModal()"></div>
          <div class="edit-stock-modal-content">
            <div class="edit-stock-modal-header">
              <h2>✏️ Edit Stock: {{ editingStock.name }}</h2>
              <button class="btn-close-modal" (click)="closeEditStockModal()">✕</button>
            </div>
            
            <div class="edit-stock-modal-body">
              <form (ngSubmit)="saveStock()" #editForm="ngForm">
                <div class="form-group">
                  <label>Product Name</label>
                  <input type="text" [(ngModel)]="editingStock.name" name="name" readonly class="form-input-readonly">
                </div>

                <div class="form-group">
                  <label>Product Type</label>
                  <input type="text" [(ngModel)]="editingStock.type" name="type" readonly class="form-input-readonly">
                </div>

                <div class="form-group">
                  <label>Available Quantity</label>
                  <input type="number" [(ngModel)]="editingStock.availableQuantity" name="availableQuantity" 
                    class="form-input" [ngClass]="{'error': formErrors['availableQuantity']}" (input)="validateForm()">
                  <span *ngIf="formErrors['availableQuantity']" class="error-message">
                    <i class="fas fa-exclamation-circle"></i> {{ formErrors['availableQuantity'] }}
                  </span>
                </div>

                <div class="form-group">
                  <label>Minimum Threshold</label>
                  <input type="number" [(ngModel)]="editingStock.minThreshold" name="minThreshold" 
                    class="form-input" [ngClass]="{'error': formErrors['minThreshold']}" (input)="validateForm()">
                  <span *ngIf="formErrors['minThreshold']" class="error-message">
                    <i class="fas fa-exclamation-circle"></i> {{ formErrors['minThreshold'] }}
                  </span>
                </div>

                <div class="form-group">
                  <label>Expiration Date</label>
                  <input type="date" [(ngModel)]="formattedExpirationDate" name="expirationDate" 
                    class="form-input" [ngClass]="{'error': formErrors['expirationDate']}" (change)="updateExpirationDate()">
                  <span *ngIf="formErrors['expirationDate']" class="error-message">
                    <i class="fas fa-exclamation-circle"></i> {{ formErrors['expirationDate'] }}
                  </span>
                </div>

                <div class="form-actions">
                  <button type="button" class="btn-cancel" (click)="closeEditStockModal()">Cancel</button>
                  <button type="submit" class="btn-save" [disabled]="savingStock || !isFormValid()">
                    <span *ngIf="!savingStock">💾 Save Changes</span>
                    <span *ngIf="savingStock">Saving...</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Stocks Modal (for requests - can be removed if not needed) -->
        <div class="stocks-modal" *ngIf="selectedRequest">
          <div class="stocks-modal-overlay" (click)="closeStocksModal()"></div>
          <div class="stocks-modal-content">
            <div class="stocks-modal-header">
              <h2>📦 Stocks for {{ selectedRequest.hospitalName }}</h2>
              <button class="btn-close-modal" (click)="closeStocksModal()">✕</button>
            </div>
            
            <div class="stocks-modal-body">
              <div *ngIf="!requestStocks || requestStocks.length === 0" class="no-stocks">
                <p>No stocks found for this request</p>
              </div>
              
              <div *ngIf="requestStocks && requestStocks.length > 0" class="stocks-list">
                <div *ngFor="let stock of requestStocks" class="stock-item">
                  <div class="stock-info">
                    <h4>{{ stock.name }}</h4>
                    <div class="stock-attributes">
                      <p><strong>Type:</strong> {{ stock.type || 'N/A' }}</p>
                      <p><strong>Available:</strong> {{ stock.availableQuantity }}</p>
                      <p><strong>Threshold:</strong> {{ stock.minThreshold }}</p>
                      <p><strong>Expiration:</strong> {{ stock.expirationDate | date: 'dd/MM/yyyy' }}</p>
                    </div>
                  </div>
                  <button class="btn-modify" (click)="openEditStockModal(stock)" title="Modify this stock">
                    ✏️ Modify
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Low Stock Products -->
        <div class="table-section" *ngIf="insights.lowStockProducts.length > 0">
          <h3>
            <i class="fas fa-exclamation-circle"></i>
            Low Stock Products ({{ insights.lowStockProducts.length }})
          </h3>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Type</th>
                  <th>Available</th>
                  <th>Threshold</th>
                  <th>Urgency</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let product of insights.lowStockProducts | slice: 0: 10"
                  [class]="'urgency-' + getStockUrgency(product.availableQuantity, product.minThreshold)"
                >
                  <td>{{ product.name }}</td>
                  <td><span class="badge">{{ product.type || 'N/A' }}</span></td>
                  <td>{{ product.availableQuantity }} {{ product.unit }}</td>
                  <td>{{ product.minThreshold }} {{ product.unit }}</td>
                  <td>
                    <span class="urgency-badge" [class]="getStockUrgency(product.availableQuantity, product.minThreshold)">
                      {{ getStockUrgency(product.availableQuantity, product.minThreshold) | titlecase }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Expiring Products -->
        <div class="table-section" *ngIf="insights.expiringProducts.length > 0">
          <h3>
            <i class="fas fa-calendar-days"></i>
            Expiring Soon ({{ insights.expiringProducts.length }})
          </h3>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Type</th>
                  <th>Expiration Date</th>
                  <th>Days Until Expiry</th>
                  <th>Available Qty</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let product of insights.expiringProducts | slice: 0: 10"
                  [class]="'expire-' + getExpiryUrgency(product.daysUntilExpiry)"
                >
                  <td>{{ product.name }}</td>
                  <td><span class="badge">{{ product.type || 'N/A' }}</span></td>
                  <td>{{ product.expirationDate | date: 'mediumDate' }}</td>
                  <td>
                    <span class="expiry-badge" [class]="getExpiryUrgency(product.daysUntilExpiry)">
                      {{ product.daysUntilExpiry }} days
                    </span>
                  </td>
                  <td>{{ product.availableQuantity }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 2rem; }

    .page-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; padding: 2rem; border-radius: 12px; flex-wrap: wrap; gap: 1rem;
    }

    .title-group h1 {
      margin: 0; font-size: 2rem; display: flex; align-items: center; gap: 1rem;
    }

    .title-group p { margin: 0.5rem 0 0 0; opacity: 0.95; }

    .btn-refresh {
      background: rgba(255,255,255,0.2); color: white; border: 2px solid rgba(255,255,255,0.4);
      padding: 0.6rem 1.2rem; border-radius: 50px; cursor: pointer; font-weight: 600;
      display: flex; align-items: center; gap: 0.5rem; transition: all 0.3s ease;
    }

    .btn-refresh:hover:not(:disabled) { background: rgba(255,255,255,0.3); }
    .btn-refresh:disabled { opacity: 0.7; cursor: not-allowed; }
    .btn-refresh i.spinning { animation: spin 1s linear infinite; }
    
    .btn-view-all-stocks {
      background: rgba(255,255,255,0.2); color: white; border: 2px solid rgba(255,255,255,0.4);
      padding: 0.6rem 1.2rem; border-radius: 50px; cursor: pointer; font-weight: 600;
      display: flex; align-items: center; gap: 0.5rem; transition: all 0.3s ease;
    }

    .btn-view-all-stocks:hover { background: rgba(255,255,255,0.3); }
    
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    .loading-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 1000;
    }

    .spinner {
      width: 50px; height: 50px; border: 4px solid #e0e0e0; border-top-color: #667eea;
      border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;
    }

    .loading-overlay p { color: white; font-weight: 600; }

    .error-alert {
      background: #ffebee; color: #c62828; padding: 1rem; border-radius: 8px;
      margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem;
      border-left: 4px solid #c62828;
    }

    .content { }

    .metrics-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex; align-items: center; gap: 1rem; border-left: 4px solid;
      transition: all 0.3s ease;
    }

    .metric-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0,0,0,0.15); }

    .metric-primary { border-left-color: #667eea; }
    .metric-warning { border-left-color: #f59e0b; }
    .metric-danger { border-left-color: #ef4444; }
    .metric-info { border-left-color: #3b82f6; }
    .metric-success { border-left-color: #10b981; }
    .metric-secondary { border-left-color: #8b5cf6; }

    .metric-icon {
      width: 60px; height: 60px; border-radius: 12px; display: flex;
      align-items: center; justify-content: center; font-size: 1.8rem; color: white; flex-shrink: 0;
    }

    .metric-primary .metric-icon { background: linear-gradient(135deg, #667eea, #764ba2); }
    .metric-warning .metric-icon { background: linear-gradient(135deg, #f59e0b, #f97316); }
    .metric-danger .metric-icon { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .metric-info .metric-icon { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .metric-success .metric-icon { background: linear-gradient(135deg, #10b981, #059669); }
    .metric-secondary .metric-icon { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }

    .metric-info h3 { margin: 0; font-size: 0.85rem; color: #666; font-weight: 600; }
    .metric-value { margin: 0.5rem 0 0 0; font-size: 1.8rem; font-weight: 800; color: #333; }

    .status-breakdown {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .status-card {
      background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .status-card h4 { margin: 0 0 1rem 0; font-size: 1rem; color: #333; }

    .status-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.8rem 0; border-bottom: 1px solid #f0f0f0;
    }

    .status-item:last-child { border-bottom: none; }

    .status-label { color: #666; font-weight: 600; }

    .status-count {
      font-size: 1.3rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 6px;
    }

    .status-count.pending { color: #f59e0b; background: #fef3c7; }
    .status-count.approved { color: #10b981; background: #d1fae5; }
    .status-count.rejected { color: #ef4444; background: #fee2e2; }
    .status-count.inprogress { color: #2563eb; background: #dbeafe; }
    .status-count.delivered { color: #059669; background: #d1fae5; }

    .charts-row {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .chart-container {
      background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .chart-container h3 { margin: 0 0 1rem 0; font-size: 1.1rem; color: #333; }
    .chart-container canvas { max-height: 300px; }

    .table-section {
      background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 1.5rem;
    }

    .table-section h3 {
      margin: 0 0 1rem 0; font-size: 1.1rem; color: #333;
      display: flex; align-items: center; gap: 0.5rem;
    }

    .table-wrapper { overflow-x: auto; }

    .data-table {
      width: 100%; border-collapse: collapse; font-size: 0.9rem;
    }

    .data-table thead { background: #f8f9fa; }
    .data-table th {
      padding: 1rem; text-align: left; font-weight: 700; color: #333;
      border-bottom: 2px solid #e0e0e0;
    }

    .data-table td { padding: 0.8rem 1rem; border-bottom: 1px solid #f0f0f0; }
    .data-table tbody tr { transition: all 0.2s ease; }
    .data-table tbody tr:hover { background: #f8f9fa; }

    .data-table tr.urgency-critical { background: rgba(239, 68, 68, 0.05); }
    .data-table tr.urgency-high { background: rgba(245, 158, 11, 0.05); }
    .data-table tr.expire-critical { background: rgba(239, 68, 68, 0.05); }
    .data-table tr.expire-high { background: rgba(245, 158, 11, 0.05); }

    .badge {
      display: inline-block; background: #e0e7ff; color: #667eea;
      padding: 0.3rem 0.6rem; border-radius: 12px; font-size: 0.75rem;
      font-weight: 600; text-transform: uppercase;
    }

    .status-badge {
      display: inline-block; padding: 0.4rem 0.8rem; border-radius: 12px;
      font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
    }

    .status-badge.status-pending { background: #fef3c7; color: #92400e; }
    .status-badge.status-approved { background: #d1fae5; color: #065f46; }
    .status-badge.status-rejected { background: #fee2e2; color: #991b1b; }

    .urgency-badge {
      display: inline-block; padding: 0.4rem 0.8rem; border-radius: 12px;
      font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
    }

    .urgency-badge.critical { background: #fee2e2; color: #991b1b; }
    .urgency-badge.high { background: #fef3c7; color: #92400e; }
    .urgency-badge.medium { background: #dbeafe; color: #1e40af; }

    .expiry-badge {
      display: inline-block; padding: 0.4rem 0.8rem; border-radius: 12px;
      font-size: 0.75rem; font-weight: 700;
    }

    .expiry-badge.critical { background: #fee2e2; color: #991b1b; }
    .expiry-badge.high { background: #fef3c7; color: #92400e; }
    .expiry-badge.medium { background: #dbeafe; color: #1e40af; }
    .expiry-badge.low { background: #d1fae5; color: #065f46; }

    /* Stocks Modal Styles */
    .stocks-modal {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000;
      display: flex; align-items: center; justify-content: center;
    }

    .stocks-modal-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); cursor: pointer;
    }

    .stocks-modal-content {
      position: relative; background: white; border-radius: 12px;
      max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .stocks-modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.5rem; border-bottom: 1px solid #e0e0e0; background: #f8f9fa;
      position: sticky; top: 0;
    }

    .stocks-modal-header h2 {
      margin: 0; font-size: 1.25rem; color: #333;
    }

    .btn-close-modal {
      background: none; border: none; font-size: 1.5rem; cursor: pointer;
      color: #666; padding: 0; width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
    }

    .btn-close-modal:hover { background: #e0e0e0; border-radius: 6px; }

    .stocks-modal-body {
      padding: 1.5rem;
    }

    .no-stocks {
      text-align: center; padding: 2rem;
      color: #999; font-size: 1rem;
    }

    .stocks-list {
      display: flex; flex-direction: column; gap: 1rem;
    }

    .stock-item {
      display: flex; justify-content: space-between; align-items: center;
      background: #f8f9fa; padding: 1rem; border-radius: 8px;
      border-left: 4px solid #667eea; transition: all 0.2s ease;
    }

    .stock-item:hover { background: #f0f1ff; }

    .stock-info { flex: 1; }

    .stock-info h4 {
      margin: 0 0 0.8rem 0; font-size: 1rem; color: #333;
    }

    .stock-attributes {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;
      font-size: 0.85rem;
    }

    .stock-attributes p {
      margin: 0; color: #666;
    }

    .stock-attributes strong {
      color: #333; font-weight: 600;
    }

    .btn-modify {
      background: #667eea; color: white; border: none;
      padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer;
      font-weight: 600; font-size: 0.9rem; transition: all 0.2s ease;
      white-space: nowrap; margin-left: 1rem;
    }

    .btn-modify:hover { background: #5568d3; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }

    .btn-action.btn-view-stocks {
      background: #667eea; color: white; border: none;
      padding: 0.6rem 1rem; border-radius: 6px; cursor: pointer;
      font-weight: 600; font-size: 0.9rem; transition: all 0.2s ease;
    }

    .btn-action.btn-view-stocks:hover { background: #5568d3; }

    /* All Stocks Modal Styles */
    .all-stocks-modal {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1001;
      display: flex; align-items: center; justify-content: center;
    }

    .all-stocks-modal-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); cursor: pointer;
    }

    .all-stocks-modal-content {
      position: relative; background: white; border-radius: 12px;
      max-width: 1000px; width: 95%; max-height: 85vh; overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .all-stocks-modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.5rem; border-bottom: 1px solid #e0e0e0; background: #f8f9fa;
      position: sticky; top: 0; z-index: 10;
    }

    .all-stocks-modal-header h2 {
      margin: 0; font-size: 1.25rem; color: #333;
    }

    .all-stocks-modal-body {
      padding: 1.5rem;
    }

    /* Search Bar Styles */
    .search-bar-container {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      padding: 0 1.5rem 1.5rem;
      position: relative;
    }

    .search-bar-container i {
      color: #999;
      font-size: 1.1rem;
    }

    .search-input {
      flex: 1;
      padding: 0.8rem 1rem 0.8rem 0.5rem;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 0.95rem;
      outline: none;
      transition: all 0.3s ease;
    }

    .search-input:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      background: #f8f9ff;
    }

    .search-input::placeholder {
      color: #aaa;
    }

    .search-clear {
      cursor: pointer;
      color: #999;
      font-size: 1.2rem;
      font-weight: bold;
      transition: color 0.2s ease;
      padding: 0 0.5rem;
    }

    .search-clear:hover {
      color: #667eea;
    }

    .all-stocks-list {
      display: flex; flex-direction: column; gap: 1.2rem;
    }

    .all-stock-item {
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border: 1px solid #e0e0e0; border-left: 4px solid #667eea;
      padding: 1.2rem; border-radius: 8px; transition: all 0.2s ease;
    }

    .all-stock-item:hover {
      background: linear-gradient(135deg, #f0f1ff 0%, #ffffff 100%);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    }

    .stock-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1rem;
    }

    .stock-header h4 {
      margin: 0; font-size: 1.1rem; color: #333; flex: 1;
    }

    .stock-badge {
      display: inline-block; padding: 0.4rem 0.8rem; border-radius: 6px;
      font-size: 0.75rem; font-weight: 700; white-space: nowrap;
    }

    .stock-badge.stock-low { background: #fee2e2; color: #991b1b; }
    .stock-badge.stock-ok { background: #d1fae5; color: #065f46; }

    .stock-details-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem; margin-bottom: 1rem;
      padding: 1rem; background: white; border-radius: 6px;
    }

    .detail-item {
      display: flex; flex-direction: column; gap: 0.3rem;
    }

    .detail-label {
      font-size: 0.75rem; color: #999; font-weight: 600; text-transform: uppercase;
    }

    .detail-value {
      font-size: 0.95rem; color: #333; font-weight: 600;
    }

    .btn-modify-stock {
      background: #667eea; color: white; border: none;
      padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer;
      font-weight: 600; font-size: 0.9rem; transition: all 0.2s ease;
      width: 100%;
    }

    .btn-modify-stock:hover {
      background: #5568d3; transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    /* Edit Stock Form Modal */
    .edit-stock-modal {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1002;
      display: flex; align-items: center; justify-content: center;
    }

    .edit-stock-modal-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); cursor: pointer;
    }

    .edit-stock-modal-content {
      position: relative; background: white; border-radius: 12px;
      max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .edit-stock-modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.5rem; border-bottom: 1px solid #e0e0e0; background: #f8f9fa;
      position: sticky; top: 0; z-index: 10;
    }

    .edit-stock-modal-header h2 {
      margin: 0; font-size: 1.2rem; color: #333;
    }

    .edit-stock-modal-body {
      padding: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block; font-weight: 600; color: #333;
      margin-bottom: 0.5rem; font-size: 0.95rem;
    }

    .form-input, .form-input-readonly {
      width: 100%; padding: 0.8rem; border: 1px solid #e0e0e0;
      border-radius: 6px; font-size: 0.95rem; font-family: inherit;
      transition: all 0.2s ease;
    }

    .form-input {
      background: white; color: #333;
    }

    .form-input:focus {
      outline: none; border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-input-readonly {
      background: #f8f9fa; color: #666; cursor: not-allowed;
    }

    /* Input with error state */
    .form-input.error {
      border-color: #dc2626 !important;
      background: #fef2f2;
    }

    /* Error Message Styles */
    .error-message {
      display: block;
      margin-top: 0.4rem;
      color: #dc2626;
      font-size: 0.85rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .error-message i {
      font-size: 0.9rem;
    }

    .form-actions {
      display: flex; gap: 1rem; margin-top: 2rem;
    }

    .btn-cancel {
      flex: 1; padding: 0.8rem 1.2rem; border: 1px solid #e0e0e0;
      background: white; color: #666; border-radius: 6px;
      cursor: pointer; font-weight: 600; transition: all 0.2s ease;
    }

    .btn-cancel:hover { background: #f8f9fa; border-color: #999; }

    .btn-save {
      flex: 1; padding: 0.8rem 1.2rem; background: #667eea;
      color: white; border: none; border-radius: 6px;
      cursor: pointer; font-weight: 600; transition: all 0.2s ease;
    }

    .btn-save:hover:not(:disabled) {
      background: #5568d3; transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-save:disabled {
      opacity: 0.7; cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .page-header { flex-direction: column; }
      .metrics-grid { grid-template-columns: 1fr 1fr; }
      .charts-row { grid-template-columns: 1fr; }
      .status-breakdown { grid-template-columns: 1fr; }
      .data-table { font-size: 0.8rem; }
      .data-table th, .data-table td { padding: 0.6rem; }
    }
  `]
})
export class AdminPharmacyComponent implements OnInit, OnDestroy {
  @ViewChild('drugTypeChart', { static: false }) drugTypeChartRef!: ElementRef;
  @ViewChild('requestsStatusChart', { static: false }) requestsStatusChartRef!: ElementRef;
  @ViewChild('deliveriesStatusChart', { static: false }) deliveriesStatusChartRef!: ElementRef;

  isLoading = true;
  insights: InsightsData | null = null;
  error: string | null = null;

  drugTypeChart: Chart | null = null;
  requestsStatusChart: Chart | null = null;
  deliveriesStatusChart: Chart | null = null;

  constructor(private insightsService: InsightsService, private stockService: StockService) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.isLoading = true;
    this.error = null;

    this.insightsService.getFullAnalytics().subscribe({
      next: (data) => {
        this.insights = data;
        this.isLoading = false;
        setTimeout(() => this.initializeCharts(), 100);
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        this.error = 'Failed to load pharmacy analytics. Please try again.';
        this.isLoading = false;
      },
    });
  }

  initializeCharts(): void {
    if (!this.insights) return;
    this.destroyCharts();
    this.initDrugTypeChart();
    this.initRequestsStatusChart();
    this.initDeliveriesStatusChart();
  }

  initDrugTypeChart(): void {
    if (!this.drugTypeChartRef || !this.insights) return;
    const ctx = this.drugTypeChartRef.nativeElement.getContext('2d');
    const colors = this.generateColors(this.insights.drugTypeDistribution.length);
    const data = this.insights.drugTypeDistribution.map((d) => d.count);
    const total = data.reduce((a, b) => a + b, 0);
    const percentages = data.map((d) => ((d / total) * 100).toFixed(1));
    const labelsWithPercentage = this.insights.drugTypeDistribution.map(
      (d, i) => `${d.type} (${percentages[i]}%)`
    );

    this.drugTypeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labelsWithPercentage,
        datasets: [
          {
            data: data,
            backgroundColor: colors,
            borderColor: '#fff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 }, padding: 12 },
          },
        },
      },
    });
  }

  initRequestsStatusChart(): void {
    if (!this.requestsStatusChartRef || !this.insights) return;
    const ctx = this.requestsStatusChartRef.nativeElement.getContext('2d');
    const { pending, approved, rejected } = this.insights.requestsByStatus;
    const data = [pending, approved, rejected];
    const total = data.reduce((a, b) => a + b, 0);
    const percentages = data.map((d) => ((d / total) * 100).toFixed(1));

    this.requestsStatusChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Pending', 'Approved', 'Rejected'],
        datasets: [
          {
            label: 'Requests',
            data: data,
            backgroundColor: ['#FFA500', '#4CAF50', '#F44336'],
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const idx = context.dataIndex;
                return `${data[idx]} requests (${percentages[idx]}%)`;
              },
            },
          },
        },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  initDeliveriesStatusChart(): void {
    if (!this.deliveriesStatusChartRef || !this.insights) return;
    const ctx = this.deliveriesStatusChartRef.nativeElement.getContext('2d');
    const { pending, inProgress, delivered } = this.insights.deliveriesByStatus;
    const data = [pending, inProgress, delivered];
    const total = data.reduce((a, b) => a + b, 0);
    const percentages = data.map((d) => ((d / total) * 100).toFixed(1));
    const labelsWithPercentage = [
      `Pending (${percentages[0]}%)`,
      `In Progress (${percentages[1]}%)`,
      `Delivered (${percentages[2]}%)`,
    ];

    this.deliveriesStatusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labelsWithPercentage,
        datasets: [
          {
            data: data,
            backgroundColor: ['#FFC107', '#2196F3', '#4CAF50'],
            borderColor: '#fff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 }, padding: 12 },
          },
        },
      },
    });
  }

  destroyCharts(): void {
    [this.drugTypeChart, this.requestsStatusChart, this.deliveriesStatusChart].forEach(
      (chart) => {
        if (chart) chart.destroy();
      }
    );
    this.drugTypeChart = null;
    this.requestsStatusChart = null;
    this.deliveriesStatusChart = null;
  }

  private generateColors(count: number): string[] {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52C9A5',
    ];
    return colors.slice(0, count);
  }

  refreshData(): void {
    this.loadAnalytics();
  }

  getStockUrgency(available: number, threshold: number): string {
    if (available === 0) return 'critical';
    if (available <= threshold * 0.5) return 'high';
    return 'medium';
  }

  getExpiryUrgency(days: number): string {
    if (days <= 0) return 'critical';
    if (days <= 7) return 'critical';
    if (days <= 14) return 'high';
    if (days <= 21) return 'medium';
    return 'low';
  }

  // 📦 STOCKS MODAL MANAGEMENT
  selectedRequest: any = null;
  requestStocks: any[] = [];
  
  // 📦 ALL STOCKS MODAL
  showAllStocks = false;
  allStocks: any[] = [];
  searchTerm: string = '';
  filteredStocks: any[] = [];

  openAllStocksModal(): void {
    console.log('📦 Opening all stocks modal');
    this.showAllStocks = true;
    this.searchTerm = '';
    
    // Get ALL stocks from insights service
    if (this.insights && this.insights.allStocks) {
      this.allStocks = this.insights.allStocks;
      this.filteredStocks = [...this.allStocks];
      console.log('📦 All stocks loaded:', this.allStocks);
    }
  }

  closeAllStocksModal(): void {
    this.showAllStocks = false;
    this.allStocks = [];
    this.filteredStocks = [];
    this.searchTerm = '';
  }

  filterStocks(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredStocks = [...this.allStocks];
      return;
    }
    
    this.filteredStocks = this.allStocks.filter(stock => 
      (stock.name && stock.name.toLowerCase().includes(term)) ||
      (stock.type && stock.type.toLowerCase().includes(term))
    );
    console.log(`🔍 Search results: ${this.filteredStocks.length} stocks found`);
  }

  viewRequestStocks(request: any): void {
    console.log('📦 Viewing stocks for request:', request);
    this.selectedRequest = request;
    
    // Filter stocks by the selected request's hospital name
    if (this.insights && this.insights.lowStockProducts) {
      this.requestStocks = this.insights.lowStockProducts;
      console.log('📦 Stocks for', request.hospitalName, ':', this.requestStocks);
    }
  }

  closeStocksModal(): void {
    this.selectedRequest = null;
    this.requestStocks = [];
  }

  // 📝 EDIT STOCK FORM
  editingStock: any = null;
  savingStock = false;
  formattedExpirationDate: string = '';
  originalExpirationDate: string = '';
  formErrors: { [key: string]: string } = {};

  openEditStockModal(stock: any): void {
    console.log('✏️ Opening edit form for stock:', stock);
    // Create a copy to avoid modifying the original
    this.editingStock = { ...stock };
    // Format the expiration date for the input date field (YYYY-MM-DD)
    this.formattedExpirationDate = this.formatDateForInput(this.editingStock.expirationDate);
    this.originalExpirationDate = this.formattedExpirationDate;
    this.formErrors = {};
    console.log('📅 Formatted date:', this.formattedExpirationDate);
  }

  formatDateForInput(dateString: any): string {
    if (!dateString) return '';
    
    // If it's already in YYYY-MM-DD format, return as is
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
      return dateString.substring(0, 10);
    }

    // Parse the date and convert to YYYY-MM-DD
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error('Error formatting date:', e);
      return '';
    }
  }

  updateExpirationDate(): void {
    if (this.formattedExpirationDate) {
      this.editingStock.expirationDate = this.formattedExpirationDate;
      this.validateForm();
    }
  }

  validateForm(): { isValid: boolean; errors: { [key: string]: string } } {
    this.formErrors = {};

    // Validate Available Quantity
    if (!this.editingStock.availableQuantity && this.editingStock.availableQuantity !== 0) {
      this.formErrors['availableQuantity'] = 'Available quantity is required';
    } else if (this.editingStock.availableQuantity < 0) {
      this.formErrors['availableQuantity'] = 'Available quantity cannot be negative';
    }

    // Validate Minimum Threshold
    if (!this.editingStock.minThreshold && this.editingStock.minThreshold !== 0) {
      this.formErrors['minThreshold'] = 'Minimum threshold is required';
    } else if (this.editingStock.minThreshold < 0) {
      this.formErrors['minThreshold'] = 'Minimum threshold cannot be negative';
    }

    // Validate Expiration Date
    if (!this.formattedExpirationDate) {
      this.formErrors['expirationDate'] = 'Expiration date is required';
    } else {
      const selectedDate = new Date(this.formattedExpirationDate);
      const originalDate = new Date(this.originalExpirationDate);
      
      // Check if selected date is before original date
      if (selectedDate < originalDate) {
        this.formErrors['expirationDate'] = `Expiration date cannot be before ${this.originalExpirationDate}`;
      }
      
      // Check if date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        this.formErrors['expirationDate'] = 'Expiration date cannot be in the past';
      }
    }

    const isValid = Object.keys(this.formErrors).length === 0;
    console.log('✅ Form validation result:', isValid, this.formErrors);
    return { isValid, errors: this.formErrors };
  }

  closeEditStockModal(): void {
    this.editingStock = null;
    this.formattedExpirationDate = '';
    this.originalExpirationDate = '';
    this.savingStock = false;
    this.formErrors = {};
  }

  isFormValid(): boolean {
    return Object.keys(this.formErrors).length === 0;
  }

  saveStock(): void {
    if (!this.editingStock) return;
    
    // Validate form before saving
    const validation = this.validateForm();
    if (!validation.isValid) {
      console.error('❌ Form validation failed:', this.formErrors);
      alert('Please fix the following errors:\n' + Object.values(this.formErrors).join('\n'));
      return;
    }
    
    this.savingStock = true;
    console.log('💾 Saving stock:', this.editingStock);

    // Prepare the data for the API
    // Convert date to ISO 8601 format with time (backend expects LocalDateTime)
    let formattedDate = this.editingStock.expirationDate;
    if (formattedDate && !formattedDate.includes('T')) {
      formattedDate = `${formattedDate}T00:00:00`;
    }

    const updateData = {
      availableQuantity: this.editingStock.availableQuantity,
      minThreshold: this.editingStock.minThreshold,
      expirationDate: formattedDate,
    };
    
    console.log('📤 Sending to API:', updateData);

    this.stockService.update(this.editingStock.id, updateData).subscribe({
      next: (response) => {
        console.log('✅ Stock updated successfully:', response);
        this.savingStock = false;
        alert('Stock updated successfully!');
        this.closeEditStockModal();
        // Reload the data to reflect changes
        this.loadAnalytics();
      },
      error: (error) => {
        console.error('❌ Error updating stock:', error);
        this.savingStock = false;
        alert('Error updating stock: ' + (error.error?.message || error.message));
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }
}
