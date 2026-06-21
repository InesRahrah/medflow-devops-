import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-quick-actions-bar',
  templateUrl: './quick-actions-bar.component.html',
  styleUrl: './quick-actions-bar.component.css',
})
export class QuickActionsBarComponent {
  @Input() patientId: string | null = null;
  @Output() onNewConsultation = new EventEmitter<void>();
  @Output() onAddPrescription = new EventEmitter<void>();
  @Output() onUploadLab = new EventEmitter<void>();
  @Output() onAddNote = new EventEmitter<void>();

  handleNewConsultation(): void {
    this.onNewConsultation.emit();
  }

  handleAddPrescription(): void {
    this.onAddPrescription.emit();
  }

  handleUploadLab(): void {
    this.onUploadLab.emit();
  }

  handleAddNote(): void {
    this.onAddNote.emit();
  }
}
