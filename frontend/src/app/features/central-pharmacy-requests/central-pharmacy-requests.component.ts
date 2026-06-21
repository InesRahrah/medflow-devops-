import { Component, OnInit, OnDestroy } from '@angular/core';
import { RequestService } from '../../core/services/request.service';

@Component({
  selector: 'app-central-pharmacy-requests',
  templateUrl: './central-pharmacy-requests.component.html',
  styleUrls: ['./central-pharmacy-requests.component.css']
})
export class CentralPharmacyRequestsComponent implements OnInit, OnDestroy {

  requests: any[] = [];
  filteredRequests: any[] = [];

  selectedTab: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';

  isLoading = false;
  successMessage = '';
  errorMessage = '';

  selectedRequest: any = null;
  showDetailModal = false;

  deliveryAgents: any[] = [];
  selectedDeliveryAgent: any = null;

  private subscriptions: any[] = [];

  constructor(private requestService: RequestService) {}

  ngOnInit() {
    this.resetComponent();
    this.loadRequests();
    this.loadDeliveryAgents();
  }

  ngOnDestroy() {
    // ✅ Nettoyer toutes les subscriptions
    this.subscriptions.forEach(sub => sub?.unsubscribe?.());
  }

  resetComponent() {
    // ✅ Réinitialiser l'état au démarrage ou après reconnexion
    this.requests = [];
    this.filteredRequests = [];
    this.selectedTab = 'PENDING';
    this.isLoading = false;
    this.successMessage = '';
    this.errorMessage = '';
    this.selectedRequest = null;
    this.showDetailModal = false;
    this.selectedDeliveryAgent = null;
  }

  loadRequests() {
    this.isLoading = true;

    const sub = this.requestService.getAllForCentral().subscribe({
      next: (res: any[]) => {
        // ✅ Use backend structure directly (request.delivery object)
        // Backend returns: request.delivery { deliveryAgentId, deliveryAgentName, vehicleType, deliveryStatus, trackingNumber }
        this.requests = res;
        console.log('📤 Requests loaded:', this.requests);
        
        this.filterRequests();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = "Error loading requests ❌";
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(sub);
  }

  loadDeliveryAgents() {
    const sub = this.requestService.getDeliveryAgents().subscribe({
      next: (res: any[]) => {
        this.deliveryAgents = res;
      },
      error: (err) => console.error(err)
    });
    
    this.subscriptions.push(sub);
  }

  filterRequests() {
    this.filteredRequests = this.requests.filter(
      r => r.requestStatus === this.selectedTab
    );
  }

  onTabChange(tab: 'PENDING' | 'APPROVED' | 'REJECTED') {
    this.selectedTab = tab;
    this.filterRequests();
  }

  getCountByStatus(status: string) {
    return this.requests.filter(r => r.requestStatus === status).length;
  }

  viewDetails(req: any) {
    this.selectedRequest = req;
    this.showDetailModal = true;
  }

  closeModal() {
    this.showDetailModal = false;
    this.selectedRequest = null;
    this.selectedDeliveryAgent = null;
  }

  acceptRequest(req: any) {
    const sub = this.requestService.approve(req.id).subscribe(() => {
      this.loadRequests();
    });
    this.subscriptions.push(sub);
  }

  rejectRequestDirect(req: any) {
    const sub = this.requestService.reject(req.id).subscribe(() => {
      this.loadRequests();
    });
    this.subscriptions.push(sub);
  }

  // ✅ Assign delivery using correct payload structure
  assignDelivery() {

    if (!this.selectedRequest || this.selectedRequest.requestStatus !== 'APPROVED') {
      this.errorMessage = "Only approved requests can be assigned ❌";
      return;
    }

    if (!this.selectedDeliveryAgent) {
      this.errorMessage = "Please select a delivery agent ❌";
      return;
    }

    const agent = this.selectedDeliveryAgent;

    // ✅ Correct payload structure for backend
    const payload = {
      deliveryAgentId: agent.id,
      deliveryAgentName: agent.deliveryName || agent.name,
      vehicleType: agent.vehicleType
    };

    console.log('📤 Assigning delivery with payload:', payload);
    console.log('💾 Selected request:', this.selectedRequest);
    console.log('👤 Agent details:', agent);

    const sub = this.requestService.assignDelivery(this.selectedRequest.id, payload).subscribe({
      next: (res: any) => {
        console.log('✅ Delivery assigned successfully:', res);

        // ✅ Update selectedRequest.delivery from backend response
        // Backend returns: { ...request, delivery: { deliveryAgentId, deliveryAgentName, vehicleType, deliveryStatus, trackingNumber } }
        if (res.delivery) {
          this.selectedRequest.delivery = res.delivery;
        } else {
          // Fallback if response doesn't include full delivery object
          this.selectedRequest.delivery = {
            deliveryAgentId: agent.id,
            deliveryAgentName: agent.name,
            vehicleType: agent.vehicleType,
            deliveryStatus: res?.deliveryStatus || 'PENDING',
            trackingNumber: res?.trackingNumber || ('TRK-' + this.selectedRequest.id + '-' + new Date().getTime())
          };
        }

        // ✅ Update request in list
        this.requests = this.requests.map(r =>
          r.id === this.selectedRequest.id ? this.selectedRequest : r
        );

        this.filterRequests();
        this.selectedDeliveryAgent = null;
        this.successMessage = "✅ Delivery assigned successfully!";

        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error: any) => {
        console.error('❌ Assignment error:', error);
        this.errorMessage = error?.error?.message || "Assignment failed ❌";
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
    
    this.subscriptions.push(sub);
  }
}