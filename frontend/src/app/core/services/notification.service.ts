import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

import {
  Notification,
  EnrichedNotification,
  NotificationActionType,
  NotificationWorkflowStatus,
} from '../models/notification.model';

/** Kept for backward compatibility with older consumers. */
export type NotificationType = 'appointment' | 'reminder' | 'system' | 'info';

/** @deprecated Use EnrichedNotification instead. */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {

  private readonly apiUrl = '/api/v1/notifications';
  private readonly POLL_INTERVAL_MS = 30_000;
  private readonly READ_STORAGE_PREFIX = 'medflow_read_notifications_';
  private readonly STATUS_STORAGE_PREFIX = 'medflow_notification_status_overrides_';

  // ── Primary enriched stream ──────────────────────────────────────────────
  private enrichedSubject = new BehaviorSubject<EnrichedNotification[]>([]);
  readonly enrichedNotifications$ = this.enrichedSubject.asObservable();

  readonly unreadCount$: Observable<number> = this.enrichedNotifications$.pipe(
    map(list => list.filter(n => !n.read).length),
  );

  // ── Read state ────────────────────────────────────────────────────────────
  private readIds = new Set<number>();
  private statusOverrides = new Map<number, NotificationWorkflowStatus>();
  private appointmentStatusOverrides = new Map<number, NotificationWorkflowStatus>();
  private activeUserId: string | null = null;

  // ── Polling ───────────────────────────────────────────────────────────────
  private pollSub?: Subscription;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  startPolling(userId: string, intervalMs = this.POLL_INTERVAL_MS): void {
    this.stopPolling();
    this.initReadState(userId);

    this.pollSub = timer(0, intervalMs).pipe(
      switchMap(() => this.fetchAndEnrich(userId)),
    ).subscribe({
      next: items => this.enrichedSubject.next(items),
      error: () => { },
    });
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  markAsRead(notificationId: number): void {
    if (this.readIds.has(notificationId)) return;

    this.readIds.add(notificationId);
    this.persistReadIds();

    const updated = this.enrichedSubject.value.map(n =>
      n.id === notificationId ? { ...n, read: true } : n,
    );
    this.enrichedSubject.next(updated);

    const target = updated.find(n => n.id === notificationId);
    const readId = target?.serverId || String(notificationId);

    this.http.patch(`${this.apiUrl}/${encodeURIComponent(readId)}/read`, {})
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  markAllAsRead(): void {
    this.enrichedSubject.value.forEach(n => this.readIds.add(n.id));
    this.persistReadIds();

    const updated = this.enrichedSubject.value.map(n => ({ ...n, read: true }));
    this.enrichedSubject.next(updated);

    this.http.patch(`${this.apiUrl}/read-all`, {})
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  updateNotificationStatus(notificationId: number, status: NotificationWorkflowStatus): void {
    const target = this.enrichedSubject.value.find(n => n.id === notificationId);
    this.statusOverrides.set(notificationId, status);
    if (target?.appointmentId) {
      this.appointmentStatusOverrides.set(target.appointmentId, status);
      this.persistAppointmentStatusOverrides();
    }

    const updated = this.enrichedSubject.value.map(n =>
      n.id === notificationId || (!!target?.appointmentId && n.appointmentId === target.appointmentId)
        ? {
            ...n,
            workflowStatus: status,
            isFinal: status !== 'PENDING',
            read: true,
            status: status,
          }
        : n,
    );
    this.enrichedSubject.next(updated);
    this.markAsRead(notificationId);
  }

  refreshNow(): void {
    if (!this.activeUserId) return;
    this.fetchAndEnrich(this.activeUserId).subscribe({
      next: items => this.enrichedSubject.next(items),
      error: () => { },
    });
  }

  removeNotification(id: number): void {
    const updated = this.enrichedSubject.value.filter(n => n.id !== id);
    this.enrichedSubject.next(updated);
  }

  isNotificationRead(id: number): boolean {
    return this.readIds.has(id);
  }

  refreshDoctorCache(): void {}

  // ── Private helpers ───────────────────────────────────────────────────────

  private initReadState(userId: string): void {
    const normalized = String(userId || '').trim();
    if (!normalized || this.activeUserId === normalized) return;
    this.activeUserId = normalized;
    this.readIds = this.loadReadIds(normalized);
    this.appointmentStatusOverrides = this.loadAppointmentStatusOverrides(normalized);
  }

  private fetchAndEnrich(userId: string): Observable<EnrichedNotification[]> {
    return this.fetchRaw(userId).pipe(
      map(notifications => notifications.map(n => this.enrich(n))),
      catchError(() => of(this.enrichedSubject.value)),
    );
  }

  private fetchRaw(userId: string): Observable<Notification[]> {
    const normalizedUserId = String(userId || '').trim();
    const params = new HttpParams()
      .set('userId', normalizedUserId)
      .set('recipientId', normalizedUserId)
      .set('page', '0')
      .set('size', '100');

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => this.normalizeAll(res)),
      map(list =>
        [...list].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      ),
      catchError(() => of([] as Notification[])),
    );
  }

  private enrich(notification: Notification): EnrichedNotification {
    const actionType = this.classifyActionType(notification);
    const backendStatus = this.classifyWorkflowStatus(notification, actionType);
    const hasSessionOverride = this.statusOverrides.has(notification.id);
    const persistedAppointmentOverride = this.appointmentStatusOverrides.get(notification.appointmentId);

    if (
      actionType !== 'INFO' &&
      backendStatus === 'PENDING' &&
      persistedAppointmentOverride &&
      !hasSessionOverride
    ) {
      this.appointmentStatusOverrides.delete(notification.appointmentId);
      this.persistAppointmentStatusOverrides();
    }

    const workflowStatus =
      this.statusOverrides.get(notification.id) ??
      this.appointmentStatusOverrides.get(notification.appointmentId) ??
      backendStatus;

    // Drop local override once backend catches up with a final status.
    if (
      this.statusOverrides.has(notification.id) &&
      backendStatus !== 'PENDING' &&
      backendStatus === this.statusOverrides.get(notification.id)
    ) {
      this.statusOverrides.delete(notification.id);
    }

    if (
      notification.appointmentId &&
      this.appointmentStatusOverrides.has(notification.appointmentId) &&
      backendStatus !== 'PENDING' &&
      backendStatus === this.appointmentStatusOverrides.get(notification.appointmentId)
    ) {
      this.appointmentStatusOverrides.delete(notification.appointmentId);
      this.persistAppointmentStatusOverrides();
    }

    const actorName = this.pickValidName(
      notification.actorName,
      notification.patientName,
      notification.doctorName,
    );

    const patientName = this.pickValidName(notification.patientName, actorName);
    const doctorName = this.pickValidName(notification.doctorName, 'Assigned Doctor');
    const doctorSpecialty = this.pickValidName(notification.doctorSpecialty, 'General Practitioner');

    return {
      ...notification,
      patientName,
      doctorName,
      doctorSpecialty,
      actorName,
      actorRole: String(notification.actorRole || '').trim(),
      actionType,
      workflowStatus,
      isFinal: workflowStatus !== 'PENDING',
      read: this.readIds.has(notification.id),
    };
  }

  private pickValidName(...candidates: Array<string | undefined>): string {
    for (const candidate of candidates) {
      const name = String(candidate || '').trim();
      if (!name) continue;
      const normalized = name.toLowerCase();
      if (normalized === 'unknown user' || normalized === 'unknown' || normalized === 'n/a') {
        continue;
      }
      return name;
    }
    return '';
  }

  private classifyWorkflowStatus(n: Notification, actionType: NotificationActionType): NotificationWorkflowStatus {
    const status = String(n.status || '').toUpperCase();
    const pendingStatus = String(n.pendingStatus || '').toUpperCase();
    const eventType = String(n.eventType || '').toUpperCase();
    const text = [
      n.eventType || '',
      n.message || '',
      n.status || '',
      n.pendingStatus || '',
    ]
      .join(' ')
      .toLowerCase();

    const isInitialAppointmentRequest = this.isInitialAppointmentRequest(actionType);

    const hasExplicitAcceptanceEvent =
      eventType.includes('ACCEPTED') ||
      eventType.includes('CONFIRMED') ||
      eventType.includes('APPROVED');

    const hasExplicitRejectionEvent =
      eventType.includes('REJECTED') ||
      eventType.includes('DECLINED') ||
      eventType.includes('DENIED');

    const containsPendingRequestPrompt =
      text.includes('please accept or refuse') ||
      text.includes('please confirm or decline') ||
      text.includes('requested a consultation appointment') ||
      text.includes('requested an appointment') ||
      text.includes('appointment request');

    if (
      status === 'PENDING' ||
      pendingStatus === 'PENDING' ||
      status === 'PENDING_DOCTOR_CONFIRMATION' ||
      pendingStatus === 'PENDING_DOCTOR_CONFIRMATION' ||
      status === 'PENDING_PATIENT_CONFIRMATION' ||
      pendingStatus === 'PENDING_PATIENT_CONFIRMATION'
    ) {
      return 'PENDING';
    }

    if (isInitialAppointmentRequest && !hasExplicitAcceptanceEvent && !hasExplicitRejectionEvent) {
      if (status === 'SCHEDULED' || pendingStatus === 'SCHEDULED' || containsPendingRequestPrompt) {
        return 'PENDING';
      }
    }

    if (status === 'SCHEDULED' || pendingStatus === 'SCHEDULED') return 'ACCEPTED';

    if (status === 'ACCEPTED' || pendingStatus === 'ACCEPTED') return 'ACCEPTED';
    if (
      status === 'REJECTED' ||
      pendingStatus === 'REJECTED' ||
      status === 'REJECTED_BY_DOCTOR' ||
      pendingStatus === 'REJECTED_BY_DOCTOR'
    ) {
      return 'REJECTED';
    }
    if (status === 'COUNTER_PROPOSED' || pendingStatus === 'COUNTER_PROPOSED') return 'COUNTER_PROPOSED';

    if (text.includes('counter') || text.includes('alternative') || text.includes('new time proposed')) {
      return 'COUNTER_PROPOSED';
    }

    if (isInitialAppointmentRequest && containsPendingRequestPrompt) {
      return 'PENDING';
    }

    if (text.includes('accepted') || text.includes('confirmed') || text.includes('approved')) {
      return 'ACCEPTED';
    }
    if (text.includes('rejected') || text.includes('declined') || text.includes('denied')) {
      return 'REJECTED';
    }

    return 'PENDING';
  }

  private classifyActionType(n: Notification): NotificationActionType {
    const rawEventType = String(n.eventType || '').trim().toUpperCase();
    const et = rawEventType.toLowerCase();
    const msg = String(n.message || '').toLowerCase();
    const role = String(n.recipientRole || '').toUpperCase();
    const combinedText = `${et} ${msg}`;
    const isRejectedEvent =
      combinedText.includes('reject') ||
      combinedText.includes('declin') ||
      combinedText.includes('denied') ||
      combinedText.includes('refus');
    const patientRejectedDoctorCancel =
      role === 'DOCTOR' &&
      isRejectedEvent &&
      (et.includes('cancel') || msg.includes('cancellation request') || msg.includes('requested to cancel'));
    const patientRejectedDoctorPostpone =
      role === 'DOCTOR' &&
      isRejectedEvent &&
      (et.includes('postpone') || et.includes('reschedul') || msg.includes('alternative time') || msg.includes('proposed a new time') || msg.includes('reschedule request'));

    if (rawEventType === 'APPOINTMENT_CREATED_BY_DOCTOR') return 'DOCTOR_APPOINTMENT_REQUEST';
    if (rawEventType === 'APPOINTMENT_REQUESTED_BY_PATIENT') return 'PATIENT_APPOINTMENT_REQUEST';
    if (rawEventType === 'DOCTOR_CANCEL_REQUEST') return 'DOCTOR_CANCEL_REQUEST';
    if (rawEventType === 'DOCTOR_POSTPONE_REQUEST') return 'DOCTOR_POSTPONE_REQUEST';
    if (rawEventType === 'DOCTOR_COUNTER_PROPOSAL') return 'DOCTOR_COUNTER_PROPOSAL';
    if (rawEventType === 'PATIENT_POSTPONE_REQUEST') return 'PATIENT_POSTPONE_REQUEST';
    if (rawEventType === 'PATIENT_CANCEL_REQUEST') return 'PATIENT_CANCEL_REQUEST';
    if (rawEventType === 'PATIENT_REJECTED_POSTPONE') return 'DOCTOR_POSTPONE_REQUEST';
    if (rawEventType === 'PATIENT_REJECTED_CANCELLATION') return 'DOCTOR_CANCEL_REQUEST';

    if (patientRejectedDoctorCancel) {
      return 'DOCTOR_CANCEL_REQUEST';
    }

    if (patientRejectedDoctorPostpone) {
      return msg.includes('alternative') || msg.includes('counter')
        ? 'DOCTOR_COUNTER_PROPOSAL'
        : 'DOCTOR_POSTPONE_REQUEST';
    }

    const isCancel = et.includes('cancel');
    const isPostpone = et.includes('postpone') || et.includes('reschedul');

    if (isCancel) {
      return role === 'PATIENT' ? 'DOCTOR_CANCEL_REQUEST' : 'PATIENT_CANCEL_REQUEST';
    }

    if (isPostpone && role === 'PATIENT') {
      // Counter-proposal: doctor rejected patient's request and proposes an alternative.
      // Detected by explicit "counter" in event type, or rejection keywords in the
      // message combined with an alternative time being present.
      const isCounter =
        et.includes('counter') ||
        (
          !!(n.pendingScheduledAt || '').trim() &&
          (
            msg.includes('reject') ||
            msg.includes('declin') ||
            msg.includes('denied') ||
            et.includes('reject') ||
            et.includes('declin') ||
            et.includes('denied') ||
            et.includes('counter')
          )
        );

      return isCounter ? 'DOCTOR_COUNTER_PROPOSAL' : 'DOCTOR_POSTPONE_REQUEST';
    }

    if (isPostpone) {
      return 'PATIENT_POSTPONE_REQUEST';
    }

    return 'INFO';
  }

  private isInitialAppointmentRequest(actionType: NotificationActionType): boolean {
    return actionType === 'PATIENT_APPOINTMENT_REQUEST' || actionType === 'DOCTOR_APPOINTMENT_REQUEST';
  }

  // ── Normalizers ───────────────────────────────────────────────────────────

  private normalizeAll(response: any): Notification[] {
    const source: any[] = Array.isArray(response)
      ? response
      : response?.data ?? response?.notifications ?? response?.content ?? [];

    return source
      .map(raw => this.normalizeOne(raw))
      .filter((n): n is Notification => !!n);
  }

  private normalizeOne(raw: any): Notification | null {
    if (!raw) return null;

    const serverId = String(raw.id ?? raw.notificationId ?? '').trim();
    if (!serverId) return null;

    const parsedNumericId = Number(serverId);
    const parsedId = Number.isFinite(parsedNumericId)
      ? parsedNumericId
      : this.stableHashToPositiveInt(serverId);

    const appointmentId = Number(raw.appointmentId ?? raw.idAp ?? raw.appointment?.id ?? 0);
    const normalizedActorId = String(raw.actorId ?? raw.senderId ?? raw.requestedById ?? '').trim();
    const normalizedPatientId = String(raw.patientId ?? normalizedActorId ?? '').trim();

    return {
      id: parsedId,
      serverId,
      recipientId: String(raw.recipientId ?? ''),
      recipientRole: String(raw.recipientRole ?? ''),
      actorId: normalizedActorId,
      actorRole: String(raw.actorRole ?? raw.senderRole ?? raw.requestedByRole ?? ''),
      actorName: String(raw.actorName ?? raw.senderName ?? raw.requesterName ?? raw.requestedByName ?? raw.fromName ?? raw.initiatorName ?? ''),
      eventType: String(raw.eventType ?? ''),
      message: String(raw.message ?? ''),
      appointmentId: Number.isFinite(appointmentId) ? appointmentId : 0,
      patientId: normalizedPatientId,
      patientName: String(
        raw.patientName ??
        raw.patientFullName ??
        raw.senderName ??
        raw.requesterName ??
        raw.requestedByName ??
        raw.fromName ??
        raw.initiatorName ??
        raw?.patient?.name ??
        raw?.patient?.fullName ??
        (((raw.patientFirstName ?? raw.firstName) && (raw.patientLastName ?? raw.lastName))
          ? `${raw.patientFirstName ?? raw.firstName} ${raw.patientLastName ?? raw.lastName}`.trim()
          : null) ??
        '',
      ),
      doctorId: String(raw.doctorId ?? ''),
      doctorName: String(raw.doctorName ?? raw?.doctor?.name ?? ''),
      doctorSpecialty: String(raw.doctorSpecialty ?? raw?.doctor?.specialty ?? ''),
      scheduledAt: String(raw.scheduledAt ?? ''),
      pendingScheduledAt: String(raw.pendingScheduledAt ?? ''),
      status: String(raw.status ?? ''),
      pendingStatus: String(raw.pendingStatus ?? ''),
      createdAt: String(raw.createdAt ?? new Date().toISOString()),
    };
  }

  // ── LocalStorage read-state ────────────────────────────────────────────────

  private loadReadIds(userId: string): Set<number> {
    try {
      const raw = localStorage.getItem(`${this.READ_STORAGE_PREFIX}${userId}`);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(
        parsed
          .map((v: unknown) => Number(v))
          .filter((v: number) => Number.isFinite(v)),
      );
    } catch {
      return new Set();
    }
  }

  private persistReadIds(): void {
    if (!this.activeUserId) return;
    try {
      localStorage.setItem(
        `${this.READ_STORAGE_PREFIX}${this.activeUserId}`,
        JSON.stringify(Array.from(this.readIds)),
      );
    } catch { /* ignore quota errors */ }
  }

  private loadAppointmentStatusOverrides(userId: string): Map<number, NotificationWorkflowStatus> {
    try {
      const raw = localStorage.getItem(`${this.STATUS_STORAGE_PREFIX}${userId}`);
      if (!raw) return new Map();

      const parsed = JSON.parse(raw) as Record<string, NotificationWorkflowStatus>;
      if (!parsed || typeof parsed !== 'object') return new Map();

      const entries = Object.entries(parsed)
        .map(([key, value]) => [Number(key), value] as const)
        .filter(([key, value]) => Number.isFinite(key) && this.isValidWorkflowStatus(value));

      return new Map(entries);
    } catch {
      return new Map();
    }
  }

  private persistAppointmentStatusOverrides(): void {
    if (!this.activeUserId) return;
    try {
      const payload = Object.fromEntries(this.appointmentStatusOverrides.entries());
      localStorage.setItem(
        `${this.STATUS_STORAGE_PREFIX}${this.activeUserId}`,
        JSON.stringify(payload),
      );
    } catch {
      // ignore quota errors
    }
  }

  private isValidWorkflowStatus(value: string): value is NotificationWorkflowStatus {
    return value === 'PENDING' || value === 'ACCEPTED' || value === 'REJECTED' || value === 'COUNTER_PROPOSED';
  }

  private stableHashToPositiveInt(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }

    const positive = Math.abs(hash);
    return positive === 0 ? 1 : positive;
  }

  // ── Backward-compatible shims ─────────────────────────────────────────────

  getNotifications(userId: string): Observable<Notification[]> {
    return this.fetchRaw(userId);
  }

  initializeReadState(userId: string): void {
    this.initReadState(userId);
  }

  markNotificationAsRead(notificationId: number, userId: string): void {
    this.initReadState(userId);
    this.markAsRead(notificationId);
  }

  getUnreadNotificationsCount(notifications: Notification[]): number {
    return notifications.filter(n => !this.readIds.has(n.id)).length;
  }

  load(): void {
    const userId = this.authService.getUserId();
    if (!userId) return;
    this.startPolling(userId);
  }

  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  readonly notifications$ = this.notificationsSubject.asObservable();
}
