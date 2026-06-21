import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  DmrService,
  LabQueueItemResponse,
} from '../../../core/services/dmr.service';

@Component({
  selector: 'app-lab-upload-result',
  templateUrl: './lab-upload-result.component.html',
  styleUrl: './lab-upload-result.component.css',
})
export class LabUploadResultComponent implements OnInit {
  requestId: string | null = null;
  requestSummary: LabQueueItemResponse | null = null;
  isDragOver = false;

  resultData = {
    findings: '',
    conclusions: '',
    file: null as File | null,
  };

  loading = false;
  isUploading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private dmrService: DmrService,
  ) {}

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id');
    this.loadRequestSummary();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.resultData.file = input.files[0];
      this.errorMessage = '';
    }
  }

  onFileDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onFileDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;

    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    this.resultData.file = file;
    this.errorMessage = '';
  }

  clearSelectedFile(): void {
    this.resultData.file = null;
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes <= 0) {
      return '0 KB';
    }

    const kilobytes = bytes / 1024;
    if (kilobytes < 1024) {
      return `${kilobytes.toFixed(1)} KB`;
    }

    return `${(kilobytes / 1024).toFixed(2)} MB`;
  }

  submitResult(): void {
    if (!this.requestSummary || !this.requestId) {
      this.errorMessage = 'Missing lab request information.';
      return;
    }

    const laboId = this.authService.getUserIdAsString();
    if (!laboId) {
      this.errorMessage = 'Unable to identify laboratory account.';
      return;
    }

    if (
      !this.resultData.findings.trim() ||
      !this.resultData.conclusions.trim()
    ) {
      this.errorMessage = 'Findings and conclusions are required.';
      return;
    }

    if (!this.resultData.file) {
      this.errorMessage = 'Please upload the result file.';
      return;
    }

    const resultText = [
      `Findings: ${this.resultData.findings.trim()}`,
      `Conclusion: ${this.resultData.conclusions.trim()}`,
    ]
      .filter((section) => !!section)
      .join('\n\n');

    const payload = new FormData();
    payload.append('labRequestId', this.requestId);
    payload.append('laboId', laboId);
    payload.append('resultText', resultText);
    payload.append('file', this.resultData.file);

    this.isUploading = true;
    this.errorMessage = '';

    this.dmrService
      .createLabResultWithFile(this.requestSummary.medicalCaseId, payload)
      .subscribe({
        next: () => {
          this.isUploading = false;
          this.router.navigate(['/lab/pending-reports']);
        },
        error: () => {
          this.isUploading = false;
          this.errorMessage = 'Could not upload the lab result.';
        },
      });
  }

  private loadRequestSummary(): void {
    if (!this.requestId) {
      this.errorMessage = 'Missing request id.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.dmrService.getLabRequestSummary(this.requestId).subscribe({
      next: (summary) => {
        this.requestSummary = summary;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Could not load request details.';
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/lab/pending-reports']);
  }

  getStatusLabel(status?: string): string {
    const value = (status || '').trim().toUpperCase();
    if (value === 'COMPLETED') {
      return 'Completed';
    }
    if (value === 'PENDING') {
      return 'Pending';
    }
    return 'Pending';
  }

  isCompletedStatus(status?: string): boolean {
    return (status || '').trim().toUpperCase() === 'COMPLETED';
  }
}
