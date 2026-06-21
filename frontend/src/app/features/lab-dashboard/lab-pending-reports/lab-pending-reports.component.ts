import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import {
  DmrService,
  LabQueueItemResponse,
} from '../../../core/services/dmr.service';
import {
  BodyScanLayer,
  LabScanSelection,
  parseLabRequestNotes,
} from '../../../shared/utils/lab-scan-metadata';

@Component({
  selector: 'app-lab-pending-reports',
  templateUrl: './lab-pending-reports.component.html',
  styleUrl: './lab-pending-reports.component.css',
})
export class LabPendingReportsComponent implements OnInit {
  reports: LabQueueItemResponse[] = [];
  searchTerm = '';
  showCompleted = true;
  loading = false;
  errorMessage = '';
  showUploadModal = false;
  selectedReportForUpload: LabQueueItemResponse | null = null;
  showScanPreviewModal = false;
  selectedReportForScanPreview: LabQueueItemResponse | null = null;
  uploadErrorMessage = '';
  isUploading = false;
  isUploadDragOver = false;
  readonly defaultScanLayers: BodyScanLayer[] = ['surface'];

  private readonly parsedNotesByRequestId: Record<
    string,
    ReturnType<typeof parseLabRequestNotes>
  > = {};

  uploadResultForm = {
    findings: '',
    conclusions: '',
    file: null as File | null,
  };

  constructor(
    private authService: AuthService,
    private dmrService: DmrService,
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    const laboId = this.authService.getUserIdAsString();
    if (!laboId) {
      this.errorMessage = 'Unable to identify laboratory account.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.dmrService.getLabReports(laboId).subscribe({
      next: (requests) => {
        this.reports = requests || [];
        this.clearParsedNotesCache();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load lab reports.';
        this.reports = [];
        this.clearParsedNotesCache();
        this.loading = false;
      },
    });
  }

  get filteredReports(): LabQueueItemResponse[] {
    const source = this.showCompleted
      ? this.reports
      : this.reports.filter(
          (req) => (req.status || '').toUpperCase() !== 'COMPLETED',
        );

    const needle = (this.searchTerm || '').toLowerCase().trim();
    if (!needle) {
      return source;
    }

    return source.filter(
      (req) =>
        (req.patientName || '').toLowerCase().includes(needle) ||
        (req.testType || '').toLowerCase().includes(needle) ||
        (req.status || '').toLowerCase().includes(needle),
    );
  }

  toggleCompletedVisibility(): void {
    this.showCompleted = !this.showCompleted;
  }

  isPending(status?: string): boolean {
    return (status || '').toUpperCase() === 'PENDING';
  }

  isCompleted(status?: string): boolean {
    return (status || '').toUpperCase() === 'COMPLETED';
  }

  getStatusLabel(status?: string): string {
    const value = (status || '').trim();
    if (!value) {
      return 'Unknown';
    }

    const normalized = value.toUpperCase();
    if (normalized === 'PENDING') {
      return 'Pending';
    }

    if (normalized === 'COMPLETED') {
      return 'Completed';
    }

    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  canUploadResult(report: LabQueueItemResponse): boolean {
    return (report.status || '').toUpperCase() !== 'COMPLETED';
  }

  openUploadModal(report: LabQueueItemResponse): void {
    this.selectedReportForUpload = report;
    this.showUploadModal = true;
    this.uploadErrorMessage = '';
    this.isUploading = false;
    this.isUploadDragOver = false;
    this.uploadResultForm = {
      findings: '',
      conclusions: '',
      file: null,
    };
  }

  openScanPreviewModal(report: LabQueueItemResponse): void {
    this.selectedReportForScanPreview = report;
    this.showScanPreviewModal = true;
  }

  closeScanPreviewModal(): void {
    this.selectedReportForScanPreview = null;
    this.showScanPreviewModal = false;
  }

  onScanPreviewModalBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.classList.contains('upload-result-modal')) {
      this.closeScanPreviewModal();
    }
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
    this.selectedReportForUpload = null;
    this.uploadErrorMessage = '';
    this.isUploading = false;
    this.isUploadDragOver = false;
    this.uploadResultForm = {
      findings: '',
      conclusions: '',
      file: null,
    };
  }

  getReportDisplayNotes(report: LabQueueItemResponse): string {
    return this.parseReportNotes(report).cleanNotes;
  }

  getReportScanSelection(
    report: LabQueueItemResponse,
  ): LabScanSelection | null {
    return this.parseReportNotes(report).selection;
  }

  hasReportScanSelection(report: LabQueueItemResponse): boolean {
    return !!this.getReportScanSelection(report);
  }

  getSelectedReportPreviewSelection(): LabScanSelection | null {
    if (!this.selectedReportForScanPreview) {
      return null;
    }

    return this.getReportScanSelection(this.selectedReportForScanPreview);
  }

  getSelectedReportPreviewNotes(): string {
    if (!this.selectedReportForScanPreview) {
      return '';
    }

    return this.getReportDisplayNotes(this.selectedReportForScanPreview);
  }

  onUploadModalBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (
      target?.classList.contains('upload-result-modal') &&
      !this.isUploading
    ) {
      this.closeUploadModal();
    }
  }

  onUploadFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadResultForm.file = input.files[0];
      this.uploadErrorMessage = '';
    }
  }

  onUploadFileDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isUploadDragOver = true;
  }

  onUploadFileDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isUploadDragOver = false;
  }

  onUploadFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isUploadDragOver = false;

    const droppedFile = event.dataTransfer?.files?.[0];
    if (!droppedFile) {
      return;
    }

    this.uploadResultForm.file = droppedFile;
    this.uploadErrorMessage = '';
  }

  clearUploadFile(): void {
    this.uploadResultForm.file = null;
  }

  getUploadFileExtension(fileName?: string): string {
    const value = (fileName || '').trim();
    const dotIndex = value.lastIndexOf('.');
    if (dotIndex < 0 || dotIndex === value.length - 1) {
      return 'FILE';
    }

    return value.slice(dotIndex + 1).toUpperCase();
  }

  getUploadFileCategory(
    fileName?: string,
  ): 'pdf' | 'image' | 'sheet' | 'doc' | 'archive' | 'generic' {
    const extension = this.getUploadFileExtension(fileName).toLowerCase();

    if (extension === 'pdf') {
      return 'pdf';
    }

    if (
      ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)
    ) {
      return 'image';
    }

    if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return 'sheet';
    }

    if (['doc', 'docx', 'txt', 'rtf'].includes(extension)) {
      return 'doc';
    }

    if (['zip', 'rar', '7z'].includes(extension)) {
      return 'archive';
    }

    return 'generic';
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

  submitUploadResult(): void {
    if (!this.selectedReportForUpload) {
      this.uploadErrorMessage = 'Missing lab request information.';
      return;
    }

    const laboId = this.authService.getUserIdAsString();
    if (!laboId) {
      this.uploadErrorMessage = 'Unable to identify laboratory account.';
      return;
    }

    if (
      !this.uploadResultForm.findings.trim() ||
      !this.uploadResultForm.conclusions.trim()
    ) {
      this.uploadErrorMessage = 'Findings and conclusions are required.';
      return;
    }

    if (!this.uploadResultForm.file) {
      this.uploadErrorMessage = 'Please upload the result file.';
      return;
    }

    const resultText = [
      `Findings: ${this.uploadResultForm.findings.trim()}`,
      `Conclusion: ${this.uploadResultForm.conclusions.trim()}`,
    ].join('\n\n');

    const payload = new FormData();
    payload.append('labRequestId', this.selectedReportForUpload.requestId);
    payload.append('laboId', laboId);
    payload.append('resultText', resultText);
    payload.append('file', this.uploadResultForm.file);

    this.isUploading = true;
    this.uploadErrorMessage = '';

    this.dmrService
      .createLabResultWithFile(
        this.selectedReportForUpload.medicalCaseId,
        payload,
      )
      .subscribe({
        next: () => {
          this.isUploading = false;
          this.closeUploadModal();
          this.loadReports();
        },
        error: () => {
          this.isUploading = false;
          this.uploadErrorMessage = 'Could not upload the lab result.';
        },
      });
  }

  private parseReportNotes(report: LabQueueItemResponse) {
    const requestId =
      report.requestId || `${report.patientId}-${report.requestedAt}`;
    if (!this.parsedNotesByRequestId[requestId]) {
      this.parsedNotesByRequestId[requestId] = parseLabRequestNotes(
        report.notes || '',
      );
    }

    return this.parsedNotesByRequestId[requestId];
  }

  private clearParsedNotesCache(): void {
    Object.keys(this.parsedNotesByRequestId).forEach((key) => {
      delete this.parsedNotesByRequestId[key];
    });
  }
}
