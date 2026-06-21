import { Component, Input } from '@angular/core';
import { Bed } from '../../models/hospital-structure.model';

@Component({
  selector: 'app-bed-item',
  templateUrl: './bed-item.component.html',
  styleUrls: ['./bed-item.component.css'],
})
export class BedItemComponent {
  @Input() bed!: Bed;

  get statusColor(): string {
    switch (this.bed.status) {
      case 'FREE': return '#22c55e';
      case 'OCCUPIED': return '#ef4444';
      case 'RESERVED': return '#f59e0b';
      default: return '#94a3b8';
    }
  }

  get statusBgColor(): string {
    switch (this.bed.status) {
      case 'FREE': return '#f0fdf4';
      case 'OCCUPIED': return '#fef2f2';
      case 'RESERVED': return '#fffbeb';
      default: return '#f8fafc';
    }
  }

  get statusLabel(): string {
    return this.bed.status.charAt(0) + this.bed.status.slice(1).toLowerCase();
  }
}
