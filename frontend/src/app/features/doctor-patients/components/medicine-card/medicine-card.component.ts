import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface MedicineItem {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: {
    morning: number;
    noon: number;
    night: number;
  };
  duration: number;
  notes: string;
}

@Component({
  selector: 'app-medicine-card',
  templateUrl: './medicine-card.component.html',
  styleUrl: './medicine-card.component.css',
})
export class MedicineCardComponent {
  @Input() medicine: MedicineItem | null = null;
  @Output() onRemove = new EventEmitter<string>();
  @Output() onDuplicate = new EventEmitter<string>();
  @Output() onSave = new EventEmitter<MedicineItem>();

  isExpanded = false;
  isSaving = false;
  editedMedicine: MedicineItem | null = null;

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded && this.medicine) {
      this.editedMedicine = JSON.parse(JSON.stringify(this.medicine));
    }
  }

  handleRemove(): void {
    if (this.medicine) {
      this.onRemove.emit(this.medicine.id);
    }
  }

  handleDuplicate(): void {
    if (this.medicine) {
      this.onDuplicate.emit(this.medicine.id);
    }
  }

  handleSave(): void {
    if (this.editedMedicine) {
      this.isSaving = true;
      // Simulate save delay
      setTimeout(() => {
        this.onSave.emit(this.editedMedicine!);
        this.isSaving = false;
        this.isExpanded = false;
      }, 300);
    }
  }

  handleCancel(): void {
    this.isExpanded = false;
    this.editedMedicine = null;
  }

  getTotalDailyDosage(): number {
    if (!this.medicine) return 0;
    return this.medicine.dosage.morning + this.medicine.dosage.noon + this.medicine.dosage.night;
  }

  get durationLabel(): string {
    if (!this.medicine) return '';
    return this.medicine.duration === 1 ? '1 day' : `${this.medicine.duration} days`;
  }
}
