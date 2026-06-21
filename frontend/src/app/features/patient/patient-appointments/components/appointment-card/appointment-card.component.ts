import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-appointment-card',
  templateUrl: './appointment-card.component.html',
  styleUrls: ['./appointment-card.component.css']
})
export class AppointmentCardComponent {
  @Input() doctorName = '';
  @Input() notes = '';
  @Input() dateLabel = '';
  @Input() timeLabel = '';
  @Input() statusLabel = '';
  @Input() statusColor = '#3b82f6';
  @Input() timeline = false;
  @Input() past = false;
  @Input() important = false;
  @Input() allowManageActions = true;

  @Output() preconsultation = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() postpone = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
}
