import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { InsuranceService, Claim } from '../../core/services/insurance.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-insurance-claims-queue',
  templateUrl: './insurance-claims-queue.component.html',
  styleUrl: './insurance-claims-queue.component.css'
})
export class InsuranceClaimsQueueComponent implements OnInit, OnDestroy {

  claims: Claim[] = [];
  filteredClaims: Claim[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  statusFilter = 'ALL';

  // Modals
  showCreateModal = false;
  showEditModal   = false;
  showRejectModal = false;
  showDeleteModal = false;

  selectedClaim: Claim | null = null;
  selectedClaimId: number | null = null;
  rejectionReason = '';

  createForm: FormGroup;
  editForm: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private insuranceService: InsuranceService,
    private fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      patientId:        ['', Validators.required],
      doctorId:         ['', Validators.required],
      patientName:      ['', Validators.required],
      patientEmail:     [''],
      patientPhone:     [''],
      insuranceCompany: ['', Validators.required],
      description:      [''],
      amount:           [null, [Validators.required, Validators.min(0)]],
      consultationId:   [null]
    });

    this.editForm = this.fb.group({
      patientId:        ['', Validators.required],
      doctorId:         ['', Validators.required],
      patientName:      ['', Validators.required],
      patientEmail:     [''],
      patientPhone:     [''],
      insuranceCompany: ['', Validators.required],
      description:      [''],
      amount:           [null, [Validators.required, Validators.min(0)]],
      consultationId:   [null]
    });
  }

  ngOnInit(): void { this.loadClaims(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── READ ────────────────────────────────────────────
  loadClaims(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.insuranceService.getAllClaims()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.claims = data;
          this.applyFilter();
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load claims. Please try again.';
          this.isLoading = false;
          console.error(err);
        }
      });
  }

  // ─── FILTER ──────────────────────────────────────────
  applyFilter(): void {
    this.filteredClaims = this.statusFilter === 'ALL'
      ? [...this.claims]
      : this.claims.filter(c => c.status === this.statusFilter);
  }

  filterBy(status: string): void {
    this.statusFilter = status;
    this.applyFilter();
  }

  // ─── STATS ───────────────────────────────────────────
  get stats(): Record<string, number> {
    return this.claims.reduce((acc, c) => {
      const key = c.status || 'PENDING';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // ─── CREATE ──────────────────────────────────────────
  openCreateModal(): void {
    this.createForm.reset();
    this.showCreateModal = true;
  }

  submitCreate(): void {
    if (this.createForm.invalid) return;
    this.isLoading = true;
    this.insuranceService.createClaim(this.createForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created) => {
          this.claims = [created, ...this.claims];
          this.applyFilter();
          this.showCreateModal = false;
          this.isLoading = false;
          this.showSuccessMsg('Claim créé avec succès !');
        },
        error: () => {
          this.errorMessage = 'Erreur lors de la création.';
          this.isLoading = false;
        }
      });
  }

  // ─── EDIT ────────────────────────────────────────────
  openEditModal(claim: Claim): void {
    this.selectedClaim = claim;
    this.editForm.patchValue(claim);
    this.showEditModal = true;
  }

  submitEdit(): void {
    if (this.editForm.invalid || !this.selectedClaim?.id) return;
    this.isLoading = true;
    this.insuranceService.updateClaim(this.selectedClaim.id, this.editForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const i = this.claims.findIndex(c => c.id === updated.id);
          if (i !== -1) this.claims[i] = updated;
          this.claims = [...this.claims];
          this.applyFilter();
          this.showEditModal = false;
          this.isLoading = false;
          this.showSuccessMsg('Claim mis à jour !');
        },
        error: () => {
          this.errorMessage = 'Erreur lors de la mise à jour.';
          this.isLoading = false;
        }
      });
  }

  // ─── APPROVE ─────────────────────────────────────────
  approveClaim(id: number): void {
    this.updateStatus(id, 'APPROVED');
  }

  // ─── REJECT ──────────────────────────────────────────
  openRejectModal(id: number): void {
    this.selectedClaimId = id;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (this.selectedClaimId !== null) {
      this.updateStatus(this.selectedClaimId, 'REJECTED', this.rejectionReason);
      this.showRejectModal = false;
      this.selectedClaimId = null;
    }
  }

  cancelReject(): void {
    this.showRejectModal = false;
    this.selectedClaimId = null;
    this.rejectionReason = '';
  }

  // ─── PAID ────────────────────────────────────────────
  markAsPaid(id: number): void {
    this.updateStatus(id, 'PAID');
  }

  // ─── DELETE ──────────────────────────────────────────
  openDeleteModal(id: number): void {
    this.selectedClaimId = id;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.selectedClaimId === null) return;
    this.insuranceService.deleteClaim(this.selectedClaimId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.claims = this.claims.filter(c => c.id !== this.selectedClaimId);
          this.applyFilter();
          this.showDeleteModal = false;
          this.selectedClaimId = null;
          this.showSuccessMsg('Claim supprimé.');
        },
        error: (err) => {
          console.error('Delete failed', err);
          this.errorMessage = 'Erreur lors de la suppression.';
        }
      });
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.selectedClaimId = null;
  }

  // ─── UPDATE STATUS ────────────────────────────────────
  updateStatus(id: number, status: string, rejectionReason?: string): void {
    this.insuranceService.updateStatus(id, status, rejectionReason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const index = this.claims.findIndex(c => c.id === id);
          if (index !== -1) {
            this.claims[index] = updated;
            this.claims = [...this.claims];
          }
          this.applyFilter();
          this.showSuccessMsg(`Statut mis à jour : ${status}`);
        },
        error: (err) => {
          console.error('Status update failed', err);
          this.errorMessage = 'Erreur lors du changement de statut.';
        }
      });
  }

  // ─── HELPERS ─────────────────────────────────────────
  closeAllModals(): void {
    this.showCreateModal = false;
    this.showEditModal   = false;
    this.showRejectModal = false;
    this.showDeleteModal = false;
    this.selectedClaim   = null;
    this.selectedClaimId = null;
  }

  showSuccessMsg(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3000);
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':      return 'status-pending';
      case 'approved':     return 'status-approved';
      case 'under review': return 'status-review';
      case 'rejected':     return 'status-rejected';
      case 'paid':         return 'status-paid';
      default:             return '';
    }
  }
}