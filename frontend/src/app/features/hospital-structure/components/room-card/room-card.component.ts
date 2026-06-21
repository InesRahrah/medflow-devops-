import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Room, Bed } from '../../models/hospital-structure.model';
import { HospitalStructureService } from '../../../../core/services/hospital-structure.service';

@Component({
  selector: 'app-room-card',
  templateUrl: './room-card.component.html',
  styleUrls: ['./room-card.component.css'],
})
export class RoomCardComponent implements OnInit {
  @Input() room!: Room;
  @Output() cardClick = new EventEmitter<Room>();
  @Output() edit = new EventEmitter<Room>();
  @Output() delete = new EventEmitter<Room>();

  beds: Bed[] = [];
  displayBeds: Bed[] = [];
  extraBedsCount: number = 0;

  constructor(private hospitalService: HospitalStructureService) {}

  ngOnInit(): void {
    if (this.room && this.room.id) {
      this.hospitalService.getBedsByRoom(this.room.id).subscribe((beds) => {
        this.beds = beds;
        this.displayBeds = this.beds.slice(0, 6);
        this.extraBedsCount = Math.max(0, this.beds.length - 6);
      });
    }
  }

  onClick(): void {
    this.cardClick.emit(this.room);
  }

  onEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.edit.emit(this.room);
  }

  onDelete(event: MouseEvent): void {
    event.stopPropagation();
    this.delete.emit(this.room);
  }

  get typeColor(): string {
    switch (this.room.type) {
      case 'ICU':
        return '#ef4444';
      case 'EMERGENCY':
        return '#f97316';
      case 'OR':
        return '#8b5cf6';
      case 'WARD':
        return '#3b82f6';
      default:
        return '#22c55e';
    }
  }

  get typeBgColor(): string {
    switch (this.room.type) {
      case 'ICU':
        return '#fef2f2';
      case 'EMERGENCY':
        return '#fff7ed';
      case 'OR':
        return '#f5f3ff';
      case 'WARD':
        return '#eff6ff';
      default:
        return '#f0fdf4';
    }
  }
}
