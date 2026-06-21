import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Floor } from '../../models/hospital-structure.model';

@Component({
  selector: 'app-floor-card',
  templateUrl: './floor-card.component.html',
  styleUrls: ['./floor-card.component.css'],
})
export class FloorCardComponent {
  @Input() floor!: Floor;
  @Output() cardClick = new EventEmitter<Floor>();

  onClick(): void {
    this.cardClick.emit(this.floor);
  }
}
