import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RequestService } from '../../core/services/request.service';
import { RequestItemService } from '../../core/services/request-item.service';
import { StockService } from '../../core/services/stock.service';

@Component({
  selector: 'app-pharmacist-requests',
  templateUrl: './pharmacist-requests.component.html',
  styleUrls: ['./pharmacist-requests.component.css']
})
export class PharmacistRequestsComponent implements OnInit {

  showForm = false;
  selectedRequest: any = null;
  isEditMode = false;

  products: any[] = [];
  items: any[] = [];
  requests: any[] = [];

  priority = 'HIGH';
  comments = '';

  // ✅ stocker user ici
  user: any = null;

  constructor(
    private requestService: RequestService,
    private itemService: RequestItemService,
    private stockService: StockService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {

    // ✅ récupérer user UNE SEULE FOIS
    this.user = JSON.parse(localStorage.getItem('user_info') || '{}');

    console.log("USER INFO:", this.user);

    this.loadProducts();
    this.loadRequests();
    this.addItem();

    this.route.queryParams.subscribe(params => {
      if (params['productId']) {
        const productId = params['productId'];

        this.items[0].productId = parseInt(productId);
        this.showForm = true;

        setTimeout(() => {
          const formElement = document.querySelector('.form-card');
          if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
  }

  loadProducts() {
    this.stockService.getAll().subscribe((res: any[]) => {
      this.products = res.map(s => s.product);
    });
  }

  // ✅ afficher uniquement ses requests
  loadRequests() {
    this.requestService.getMyRequests().subscribe({
      next: (res: any[]) => {
        this.requests = res;
      },
      error: (error: any) => {
        console.error("Error loading requests:", error);
      }
    });
  }

  addItem() {
    this.items.push({
      productId: null,
      quantity: 1
    });
  }

  createRequest() {

    // ✅ sécurité
    if (!this.user || !this.user.region) {
      alert("User region not found !");
      return;
    }

    const request = {
      requestStatus: 'PENDING',
      requestPriority: this.priority,
      requestComment: this.comments || '',
      region: this.user.region // ✅ FIX IMPORTANT
    };

    this.requestService.create(request).subscribe({
      next: (res: any) => {

        const requestId = res.id;

       this.items.forEach(item => {

  const payload = {
    requestedQuantity: item.quantity,
    itemNote: 'UI item',
    request: {
      id: requestId
    },
    product: {
      id: item.productId
    }
  };

  this.itemService.create(payload).subscribe({
    next: () => console.log("Item saved"),
    error: err => console.error("Item error:", err)
  });
});

        alert("Request created successfully");

        this.items = [];
        this.showForm = false;
        this.comments = '';

        this.loadRequests();
        this.addItem();
      },
      error: (error: any) => {
        console.error("Error creating request:", error);
      }
    });
  }

  deleteRequest(id: number) {
    if (confirm("Are you sure to delete this request?")) {
      this.requestService.delete(id).subscribe(() => {
        alert("Deleted successfully");
        this.loadRequests();
      });
    }
  }

  editRequest(req: any) {
    this.selectedRequest = { ...req };
    this.isEditMode = true;
  }

  cancelEdit() {
    this.selectedRequest = null;
    this.isEditMode = false;
  }

  updateRequest() {
    this.requestService.update(this.selectedRequest.id, this.selectedRequest)
      .subscribe(() => {
        alert("Updated successfully");
        this.selectedRequest = null;
        this.isEditMode = false;
        this.loadRequests();
      });
  }
}