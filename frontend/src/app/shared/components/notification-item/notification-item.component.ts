import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EnrichedNotification, NotificationWorkflowStatus } from '../../../core/models/notification.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-notification-item',
  standalone: false,
  templateUrl: './notification-item.component.html',
  styleUrls: ['./notification-item.component.css'],
})
export class NotificationItemComponent {
  /** The enriched notification to display. */
  @Input() notification!: EnrichedNotification;

  /**
   * Compact mode — used inside the navbar dropdown.
   * Hides appointment time rows and uses smaller padding.
   */
  @Input() compact = false;

  /** Emitted (with the notification id) after a successful action. */
  @Output() actionDone = new EventEmitter<number>();

  /** Emitted (with the notification id) when the user clicks the item. */
  @Output() readRequest = new EventEmitter<number>();

  actionLoading = false;
  actionError = '';
  showCounterForm = false;
  counterDateTime = '';

  constructor(
    private appointmentService: AppointmentService,
    private notificationService: NotificationService,
  ) {}

  // ── Getters ───────────────────────────────────────────────────────────────

  hasActions(): boolean {
    if (this.notification.actionType === 'INFO' || this.notification.isFinal) {
      return false;
    }

    // For plain doctor-initiated postpone (not a counter), only show actions
    // when there is still an actual proposal pending (not yet confirmed/finalized).
    if (this.notification.actionType === 'DOCTOR_POSTPONE_REQUEST') {
      return this.canPatientDecidePostpone();
    }

    // Counter-proposal and other actionable pending types always show buttons.
    return true;
  }

  showStatusBadge(): boolean {
    return this.notification.isFinal;
  }

  getStatusBadgeClass(): string {
    switch (this.notification.workflowStatus) {
      case 'ACCEPTED':
        return 'status-accepted';
      case 'REJECTED':
        return 'status-rejected';
      case 'COUNTER_PROPOSED':
        return 'status-counter';
      default:
        return 'status-pending';
    }
  }

  getStatusBadgeText(): string {
    switch (this.notification.workflowStatus) {
      case 'ACCEPTED':
        return 'Accepted';
      case 'REJECTED':
        return 'Rejected';
      case 'COUNTER_PROPOSED':
        return 'New time proposed';
      default:
        return 'Pending';
    }
  }

  getStatusBadgeIcon(): string {
    switch (this.notification.workflowStatus) {
      case 'ACCEPTED':
        return '✅';
      case 'REJECTED':
        return '❌';
      case 'COUNTER_PROPOSED':
        return '🔁';
      default:
        return '⏳';
    }
  }

  showTimesInfo(): boolean {
    const type = this.notification.actionType;
    const isPostpone =
      type === 'DOCTOR_POSTPONE_REQUEST' ||
      type === 'DOCTOR_COUNTER_PROPOSAL' ||
      type === 'PATIENT_POSTPONE_REQUEST';
    return isPostpone && !this.compact && !!(this.notification.scheduledAt || this.notification.pendingScheduledAt);
  }

  showCancellationContext(): boolean {
    const isCancelType =
      this.notification.actionType === 'PATIENT_CANCEL_REQUEST' ||
      this.notification.actionType === 'DOCTOR_CANCEL_REQUEST';
    return isCancelType && !this.compact && !!this.notification.scheduledAt;
  }

  getAvatarClass(): string {
    switch (this.notification.actionType) {
      case 'DOCTOR_APPOINTMENT_REQUEST':
        return 'avatar-info';
      case 'DOCTOR_CANCEL_REQUEST':
      case 'PATIENT_CANCEL_REQUEST':
        return 'avatar-cancel';
      case 'DOCTOR_COUNTER_PROPOSAL':
        return 'avatar-counter';
      case 'DOCTOR_POSTPONE_REQUEST':
      case 'PATIENT_POSTPONE_REQUEST':
        return 'avatar-postpone';
      default:
        return 'avatar-info';
    }
  }

  getActorName(): string {
    const actorNameRaw = String(this.notification.actorName || '').trim();
    const actorName = this.isInvalidDisplayName(actorNameRaw) ? '' : actorNameRaw;

    const patientNameRaw = String(this.notification.patientName || '').trim();
    const patientName = this.isInvalidDisplayName(patientNameRaw) ? '' : patientNameRaw;

    const doctorNameRaw = String(this.notification.doctorName || '').trim();
    const doctorName = this.isInvalidDisplayName(doctorNameRaw) ? '' : doctorNameRaw;

    const parsedFromMessage = this.parseActorNameFromMessage(String(this.notification.message || ''));
    const recipientRole = String(this.notification.recipientRole || '').toUpperCase();

    // Patient UI should prefer doctor identity if actorName is absent.
    // Doctor UI should prefer patient identity if actorName is absent.
    if (recipientRole === 'PATIENT') {
      return actorName || doctorName || patientName || parsedFromMessage || 'Unknown user';
    }

    return actorName || patientName || parsedFromMessage || 'Unknown user';
  }

  getActorMeta(): string {
    const actorRole = String(this.notification.actorRole || '').toUpperCase();
    const recipientRole = String(this.notification.recipientRole || '').toUpperCase();

    if (actorRole === 'PATIENT') {
      return 'patient';
    }

    if (actorRole === 'DOCTOR') {
      return this.notification.doctorSpecialty || 'doctor';
    }

    if (recipientRole === 'PATIENT') {
      return this.notification.doctorSpecialty || 'doctor';
    }
    return 'patient';
  }

  getInitials(name: string): string {
    return (name || 'D')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0])
      .join('')
      .toUpperCase();
  }

  getDefaultMessage(): string {
    switch (this.notification.actionType) {
      case 'DOCTOR_APPOINTMENT_REQUEST':
        return 'The doctor has scheduled an appointment for you. Please confirm or decline.';
      case 'PATIENT_APPOINTMENT_REQUEST':
        return 'A patient submitted a new appointment request.';
      case 'DOCTOR_CANCEL_REQUEST':
        return 'The doctor has requested to cancel your appointment.';
      case 'DOCTOR_POSTPONE_REQUEST':
        return 'The doctor has proposed a new appointment time.';
      case 'DOCTOR_COUNTER_PROPOSAL':
        return 'The doctor declined your request and has suggested an alternative time.';
      case 'PATIENT_POSTPONE_REQUEST':
        return 'The patient has requested to reschedule the appointment.';
      case 'PATIENT_CANCEL_REQUEST':
        return 'The patient has requested to cancel the appointment.';
      default:
        return 'You have a new notification.';
    }
  }

  getDisplayMessage(): string {
    const original = String(this.notification.message || '').trim();
    const actor = this.getActorName();
    const eventType = String(this.notification.eventType || '').toUpperCase();
    const recipientRole = String(this.notification.recipientRole || '').toUpperCase();
    const workflowStatus = this.notification.workflowStatus;
    const isDoctorRecipient = recipientRole === 'DOCTOR';

    if (isDoctorRecipient && workflowStatus === 'REJECTED') {
      const current = this.formatDateTime(this.notification.scheduledAt);
      const proposed = this.formatDateTime(this.notification.pendingScheduledAt);

      switch (this.notification.actionType) {
        case 'DOCTOR_CANCEL_REQUEST':
          return `${actor} declined your cancellation request${current !== '—' ? ` for the appointment scheduled on ${current}` : ''}.`;
        case 'DOCTOR_POSTPONE_REQUEST':
          return `${actor} declined your reschedule request${proposed !== '—' ? ` for ${proposed}` : ''}${current !== '—' ? ` and wants to keep the ${current} appointment` : ''}.`;
        case 'DOCTOR_COUNTER_PROPOSAL':
          return `${actor} declined your proposed alternative time${proposed !== '—' ? ` (${proposed})` : ''}${current !== '—' ? ` and wants to keep the ${current} appointment` : ''}.`;
        default:
          break;
      }
    }

    if (original && !this.isGenericMessage(original)) {
      return original;
    }

    if (eventType === 'APPOINTMENT_CREATED_BY_DOCTOR') {
      const time = this.formatDateTime(this.notification.scheduledAt);
      return `Dr. ${actor} scheduled an appointment for you${time !== '\u2014' ? ` on ${time}` : ''}. Please confirm.`;
    }

    if (eventType === 'APPOINTMENT_REQUEST_ACCEPTED_BY_DOCTOR') {
      return `Your appointment request with Dr. ${actor} has been accepted.`;
    }

    if (eventType === 'APPOINTMENT_REQUEST_REJECTED_BY_DOCTOR') {
      return `Your appointment request with Dr. ${actor} was declined.`;
    }

    const current = this.formatDateTime(this.notification.scheduledAt);
    const proposed = this.formatDateTime(this.notification.pendingScheduledAt);

    switch (this.notification.actionType) {      case 'DOCTOR_APPOINTMENT_REQUEST':
        return actor ? `Dr. ${actor} \u00b7 appointment request` : 'Doctor appointment request';
      case 'PATIENT_APPOINTMENT_REQUEST':
        return `${actor} requested a new appointment${current !== '—' ? ` for ${current}` : ''}.`;

      case 'PATIENT_CANCEL_REQUEST':
        return `${actor} requested to cancel the appointment scheduled for ${current}. Please confirm.`;

      case 'DOCTOR_CANCEL_REQUEST':
        return `Dr. ${actor} requested to cancel your appointment scheduled for ${current}. Please confirm.`;

      case 'PATIENT_POSTPONE_REQUEST':
        return `${actor} requested to reschedule the appointment${proposed !== '—' ? ` to ${proposed}` : ''}.`;

      case 'DOCTOR_POSTPONE_REQUEST':
        return `Dr. ${actor} proposed to reschedule your appointment${proposed !== '—' ? ` to ${proposed}` : ''}.`;

      case 'DOCTOR_COUNTER_PROPOSAL':
        return `Dr. ${actor} rejected your original request${current !== '—' ? ` (${current})` : ''} and suggested${proposed !== '—' ? ` ${proposed}` : ' a new time'}.`;

      default:
        return this.getDefaultMessage();
    }
  }

  minDateTimeLocal(): string {
    return new Date().toISOString().slice(0, 16);
  }

  private canPatientDecidePostpone(): boolean {
    const hasAlternative = !!(this.notification.pendingScheduledAt || '').trim();

    const text = [
      this.notification.message || '',
      this.notification.eventType || '',
      this.notification.status || '',
      this.notification.pendingStatus || '',
    ]
      .join(' ')
      .toLowerCase();

    // If already confirmed/finalized, this should be informational only.
    const finalizedKeywords = ['confirmed', 'accepted', 'approved', 'finalized', 'done'];
    if (finalizedKeywords.some(k => text.includes(k)) && !hasAlternative) {
      return false;
    }

    // If rejected/declined, patient should decide only when an alternative exists.
    const rejectedKeywords = ['rejected', 'declined', 'denied'];
    if (rejectedKeywords.some(k => text.includes(k)) && !hasAlternative) {
      return false;
    }

    // Proposed/alternative time means patient can accept or decline.
    if (hasAlternative) {
      return true;
    }

    const proposalKeywords = ['proposed', 'proposal', 'alternative', 'new time', 'reschedule', 'postpone'];
    return proposalKeywords.some(k => text.includes(k));
  }

  private isGenericMessage(message: string): boolean {
    const msg = message.toLowerCase();

    // If backend text has no actionable context, auto-generate a clearer message.
    const genericPatterns = [
      'please confirm',
      'requested appointment cancellation',
      'requested cancellation',
      'requested postpone',
      'requested reschedule',
      'proposed to reschedule',
      'proposed a new time',
      'appointment update',
      'notification',
    ];

    const hasAny = genericPatterns.some(p => msg.includes(p));
    const hasTimeContext = /\d{1,2}:\d{2}|am|pm|scheduled|proposed|\d{4}-\d{2}-\d{2}/i.test(message);
    const hasActorContext = !!(this.notification.patientName || '').trim() || !!(this.notification.doctorName || '').trim();

    return hasAny && (!hasTimeContext || !hasActorContext);
  }

  private parseActorNameFromMessage(message: string): string {
    const text = String(message || '').trim();
    if (!text) return '';

    // Examples:
    // "Salma Ben Ali requested to cancel..."
    // "Dr. Chaima Fallahi proposed to reschedule..."
    const patterns = [
      /^([A-Za-z][A-Za-z .'-]{1,80})\s+requested\s+to\s+/i,
      /^([A-Za-z][A-Za-z .'-]{1,80})\s+has\s+requested\s+/i,
      /^([A-Za-z][A-Za-z .'-]{1,80})\s+requested\s+an?\s+/i,
      /^([A-Za-z][A-Za-z .'-]{1,80})\s+submitted\s+/i,
      /^new\s+appointment\s+request\s+from\s+([A-Za-z][A-Za-z .'-]{1,80})(?:\s|$)/i,
      /\bfrom\s+([A-Za-z][A-Za-z .'-]{1,80})(?:\s+(?:requested|submitted|wants))/i,
      /^([A-Za-z][A-Za-z .'-]{1,80})\s+proposed\s+to\s+/i,
      /^([A-Za-z][A-Za-z .'-]{1,80})\s+rejected\s+/i,
      /^([A-Za-z][A-Za-z .'-]{1,80})\s+confirmed\s+/i,
    ];

    for (const rx of patterns) {
      const match = text.match(rx);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (!/^unknown user$/i.test(candidate) && !/^patient$/i.test(candidate)) {
          return candidate;
        }
      }
    }

    return '';
  }

  private isInvalidDisplayName(value: string): boolean {
    const v = String(value || '').trim().toLowerCase();
    return !v || v === 'unknown user' || v === 'unknown' || v === 'n/a';
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  onItemClick(): void {
    if (!this.notification.read) {
      this.readRequest.emit(this.notification.id);
    }
  }

  onAction(action: string, event: MouseEvent): void {
    event.stopPropagation();

    const appointmentId = this.notification.appointmentId;
    if (!appointmentId) {
      this.actionError = 'No appointment linked to this notification.';
      return;
    }

    let obs$: Observable<any>;
    let targetStatus: NotificationWorkflowStatus = 'PENDING';

    switch (action) {
      case 'CONFIRM_DOCTOR_APPOINTMENT':
        obs$ = this.appointmentService.patientConfirmAppointment(appointmentId);
        targetStatus = 'ACCEPTED';
        break;
      case 'DECLINE_DOCTOR_APPOINTMENT':
        obs$ = this.appointmentService.patientDeclineAppointment(appointmentId);
        targetStatus = 'REJECTED';
        break;
      case 'ACCEPT_APPOINTMENT_REQUEST':
        obs$ = this.appointmentService.doctorAcceptRequest(appointmentId);
        targetStatus = 'ACCEPTED';
        break;
      case 'REJECT_APPOINTMENT_REQUEST':
        obs$ = this.appointmentService.doctorRefuseRequest(appointmentId);
        targetStatus = 'REJECTED';
        break;
      case 'ACCEPT_CANCEL': // Patient accepts doctor's cancel
        obs$ = this.appointmentService.confirmCancelByPatient(appointmentId);
        targetStatus = 'ACCEPTED';
        break;
      case 'REJECT_CANCEL': // Patient keeps the appointment instead of accepting doctor's cancel
        obs$ = this.appointmentService.rejectDoctorCancelByPatient(appointmentId);
        targetStatus = 'REJECTED';
        break;
      case 'ACCEPT_POSTPONE': // Patient accepts doctor's proposed time
        obs$ = this.appointmentService.confirmDoctorPostponeByPatient(appointmentId);
        targetStatus = 'ACCEPTED';
        break;
      case 'REJECT_POSTPONE': // Patient declines doctor's proposed time
        obs$ = this.appointmentService.rejectDoctorPostponeByPatient(appointmentId);
        targetStatus = 'REJECTED';
        break;
      case 'CONFIRM_PATIENT_POSTPONE': // Doctor confirms patient's postpone request
        obs$ = this.appointmentService.doctorConfirmPostpone(appointmentId);
        targetStatus = 'ACCEPTED';
        break;
      case 'CONFIRM_PATIENT_CANCEL': // Doctor confirms patient's cancel request
        obs$ = this.appointmentService.confirmCancelByDoctor(appointmentId);
        targetStatus = 'ACCEPTED';
        break;
      default:
        return;
    }

    this.executeObs(obs$, targetStatus);
  }

  onShowCounterForm(event: MouseEvent): void {
    event.stopPropagation();
    this.showCounterForm = true;
    if (this.notification.pendingScheduledAt) {
      const d = new Date(this.notification.pendingScheduledAt);
      if (!isNaN(d.getTime())) {
        this.counterDateTime = d.toISOString().slice(0, 16);
      }
    }
  }

  cancelCounter(event: MouseEvent): void {
    event.stopPropagation();
    this.showCounterForm = false;
    this.counterDateTime = '';
    this.actionError = '';
  }

  submitCounter(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.counterDateTime) {
      this.actionError = 'Please select a date and time.';
      return;
    }
    const appointmentId = this.notification.appointmentId;
    if (!appointmentId) {
      this.actionError = 'No appointment linked to this notification.';
      return;
    }

    const isoDate = new Date(this.counterDateTime).toISOString();
    const obs$ = this.appointmentService.requestPostponeByDoctor(appointmentId, isoDate);
    this.showCounterForm = false;
    this.executeObs(obs$, 'COUNTER_PROPOSED');
  }

  // ── Formatting ────────────────────────────────────────────────────────────

  formatRelativeTime(iso: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'Yesterday';
    if (diffD < 7) return `${diffD}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatDateTime(iso: string): string {
    if (!iso) return '—';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private executeObs(
    obs$: Observable<any>,
    targetStatus: NotificationWorkflowStatus,
  ): void {
    this.actionLoading = true;
    this.actionError = '';

    obs$.subscribe({
      next: () => {
        this.actionLoading = false;
        this.notificationService.updateNotificationStatus(this.notification.id, targetStatus);
        this.notification = {
          ...this.notification,
          workflowStatus: targetStatus,
          isFinal: true,
          status: targetStatus,
          read: true,
        };
        this.readRequest.emit(this.notification.id);
        this.actionDone.emit(this.notification.id);
      },
      error: (err: any) => {
        this.actionLoading = false;
        const requestUrl = String(err?.url || '').toLowerCase();
        const isMissingRejectRoute =
          err?.status === 404 &&
          (requestUrl.includes('/reject-postpone/patient') || requestUrl.includes('/reject-cancel/patient'));

        if (isMissingRejectRoute) {
          this.actionError = 'Reject endpoint is not available on the running backend instance. Please restart/update backend deployment.';
          return;
        }

        this.actionError =
          err?.error?.message || err?.error?.error || 'Action failed. Please try again.';
      },
    });
  }

}
