export interface Notification {
  id: number;
  serverId?: string;
  recipientId: string;
  recipientRole: string;
  actorId?: string;
  actorRole?: string;
  actorName?: string;
  eventType: string;
  message: string;
  appointmentId: number;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  scheduledAt: string;
  pendingScheduledAt: string;
  status: string;
  pendingStatus: string;
  createdAt: string;
}

export type NotificationWorkflowStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'COUNTER_PROPOSED';

/**
 * Classifies what action set should be shown for the notification.
 * Determined by eventType + recipientRole.
 */
export type NotificationActionType =
  | 'DOCTOR_APPOINTMENT_REQUEST' // Doctor scheduled appointment for patient → Patient: Confirm | Decline
  | 'DOCTOR_CANCEL_REQUEST'    // Doctor wants to cancel  → Patient: Accept | Dismiss
  | 'DOCTOR_POSTPONE_REQUEST'  // Doctor proposes new time → Patient: Accept | Decline
  | 'DOCTOR_COUNTER_PROPOSAL'  // Doctor rejected patient request & proposes alternative → Patient: Accept | Decline
  | 'PATIENT_APPOINTMENT_REQUEST' // Patient created new appointment request → Doctor: Accept | Refuse
  | 'PATIENT_POSTPONE_REQUEST' // Patient wants to postpone → Doctor: Confirm | Reject & Propose
  | 'PATIENT_CANCEL_REQUEST'   // Patient wants to cancel   → Doctor: Confirm | Dismiss
  | 'INFO';                    // Informational only

/** Notification enriched with doctor info, action type, and read state. */
export interface EnrichedNotification extends Notification {
  doctorName: string;
  doctorSpecialty: string;
  actionType: NotificationActionType;
  workflowStatus: NotificationWorkflowStatus;
  isFinal: boolean;
  read: boolean;
}
