import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Patient } from './appointment.service.spec';

export interface Appointment {
  id: number;
  patientId: number | string;
  patientName: string;
  doctorId: number | string;
  doctorName: string;
  date: string; // ISO date string
  time: string; // HH:MM format
  status:
    | 'scheduled'
    | 'completed'
    | 'attended'
    | 'cancelled'
    | 'pending_doctor_confirmation'
    | 'pending_patient_confirmation'
    | 'rejected_by_doctor';
  notes?: string;
  visitType?: string;
  meetingUrl?: string;
  pendingStatus?: string;
  pendingScheduledAt?: string;
  awaitingPatientConfirmation?: boolean;
  awaitingDoctorConfirmation?: boolean;
  createdAt: string;
}

export interface AdminDashboardMetrics {
  from: string;
  to: string;
  summary: {
    totalAppointments: number;
    patientsAssisted: number;
    scheduledAppointments: number;
    cancelledAppointments: number;
    pendingDoctorConfirmations: number;
    pendingPatientConfirmations: number;
    bookingSuccessRate: number;
    cancellationRate: number;
    lateCancelledAppointments?: number;
    noShowAppointments?: number;
    lateCancellationRate?: number;
    noShowRate?: number;
  };
  topSymptoms: Array<{ symptom: string; count: number }>;
}

export interface WaivablePenaltyEvent {
  eventId: number;
  eventType: string;
  appointmentId?: number | null;
  occurredAt: string;
  scoreDelta: number;
  notes?: string;
}

export interface PenaltyProfileEvent {
  eventId?: number;
  eventType: string;
  appointmentId?: number | null;
  occurredAt: string;
  scoreDelta: number;
  notes?: string;
}

export interface PenaltyProfile {
  riskScore: number;
  tier: string;
  offenseCountLast90Days: number;
  temporaryLocked: boolean;
  lockUntil?: string | null;
  activeRestrictions: string[];
  recentEvents: PenaltyProfileEvent[];
}

export interface FlaggedPatient {
  patientId: string;
  patientName: string;
  tier: string;
  riskScore: number;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly proxyApi = '/api/v1/appointments';
  private readonly doctorsApi = '/api/v1/doctors';
  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  public appointments$ = this.appointmentsSubject.asObservable();
  private refreshDoctorAppointmentsSubject = new Subject<void>();
  readonly refreshDoctorAppointments$ = this.refreshDoctorAppointmentsSubject.asObservable();

  private patientsSubject = new BehaviorSubject<Patient[]>([]);
  public patients$ = this.patientsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Submit a penalty appeal for a patient.
   * @param patientId Patient's ID
   * @param eventId Penalty event ID
   * @param explanation Appeal explanation text
   * @param file Optional file proof
   */
  submitAppeal(
    patientId: string | number,
    eventId: number | string,
    explanation: string
  ): Observable<any> {
    const url = `/api/v1/patients/${encodeURIComponent(String(patientId))}/penalties/${encodeURIComponent(String(eventId))}/appeals`;
    const formData = new FormData();
    formData.append('explanation', explanation);
    return this.http.post(url, formData);
  }

  /**
   * Get all pending penalty appeals for admin review.
   */
  getPendingAppeals(): Observable<any[]> {
    const url = `/api/v1/admin/penalties/appeals/pending`;
    return this.http.get<any[]>(url);
  }

  /**
   * Approve a penalty appeal.
   * @param appealId Appeal ID
   * @param note Optional admin note
   */
  approveAppeal(appealId: number | string, note?: string): Observable<any> {
    const url = `/api/v1/admin/penalties/appeals/${encodeURIComponent(String(appealId))}/approve`;
    const payload = note ? { note } : {};
    return this.http.post(url, payload);
  }

  /**
   * Reject a penalty appeal.
   * @param appealId Appeal ID
   * @param note Required admin note for rejection
   */
  rejectAppeal(appealId: number | string, note: string): Observable<any> {
    const url = `/api/v1/admin/penalties/appeals/${encodeURIComponent(String(appealId))}/reject`;
    return this.http.post(url, { note });
  }

  getAppointments(): Observable<Appointment[]> {
    return this.appointments$;
  }

  getDoctorScheduledAppointments(doctorId: number | string): Observable<Appointment[]> {
    return this.http
      .get<any>(`${this.doctorsApi}/${encodeURIComponent(String(doctorId))}/appointments`)
      .pipe(map((response) => this.extractBackendAppointments(response)));
  }

  getDoctorAvailableSlots(doctorId: number | string, date: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.doctorsApi}/${encodeURIComponent(String(doctorId))}/available-slots`, {
      params: { date }
    });
  }

  getPatients(): Observable<Patient[]> {
    return this.patients$;
  }

  getPatientAppointments(patientId: number): Observable<Appointment[]> {
    const appointments = this.appointmentsSubject.value.filter(
      appointment => appointment.patientId === patientId
    );
    return of(appointments);
  }

  createAppointment(appointment: Omit<Appointment, 'id' | 'createdAt'>): Observable<Appointment> {
    const normalizedVisitType = this.normalizeVisitTypeFromBackend(
      appointment.visitType ?? 'IN_PERSON',
    );
    const isTelemedicine = normalizedVisitType === 'TELEMEDICINE';

    const payload = {
      visitType: normalizedVisitType,
      visit_mode: normalizedVisitType,
      mode: normalizedVisitType,
      consultationMode: normalizedVisitType,
      isTelemedicine,
      appointment: {
        idPatient: appointment.patientId,
        idDoctor: appointment.doctorId,
        type: this.toBackendAppointmentType(appointment.notes || ''),
        visitType: normalizedVisitType,
        visit_mode: normalizedVisitType,
        mode: normalizedVisitType,
        consultationMode: normalizedVisitType,
        isTelemedicine,
        status: 'PENDING_PATIENT_CONFIRMATION',
        scheduledAt: this.buildScheduledAt(appointment.date, appointment.time),
      },
    };

    return this.http.post<any>(this.proxyApi, payload).pipe(
      map((response) => {
        const normalized = this.normalizeBackendAppointment(response?.appointment ?? response?.data ?? response);
        if (normalized) {
          const next = [...this.appointmentsSubject.value.filter((item) => item.id !== normalized.id), normalized];
          this.appointmentsSubject.next(next);
          this.refreshDoctorAppointmentsSubject.next();
          return normalized;
        }

        const local = this.buildLocalCreatedAppointment(appointment);
        const next = [...this.appointmentsSubject.value, local];
        this.appointmentsSubject.next(next);
        this.refreshDoctorAppointmentsSubject.next();
        return local;
      }),
      catchError(() => {
        const local = this.buildLocalCreatedAppointment(appointment);
        const next = [...this.appointmentsSubject.value, local];
        this.appointmentsSubject.next(next);
        this.refreshDoctorAppointmentsSubject.next();
        return of(local);
      }),
    );
  }

  private buildScheduledAt(date: string, time: string): string {
    const iso = new Date(`${date}T${time}:00`).toISOString();
    return iso;
  }

  private toBackendAppointmentType(value: string): string {
    const normalized = String(value || '').toLowerCase();
    if (normalized.includes('follow-up') || normalized.includes('follow up') || normalized.includes('follow_up')) {
      return 'FOLLOW_UP';
    }
    if (normalized.includes('emergency')) {
      return 'EMERGENCY';
    }
    return 'CONSULTATION';
  }

  private buildLocalCreatedAppointment(appointment: Omit<Appointment, 'id' | 'createdAt'>): Appointment {
    const currentIds = this.appointmentsSubject.value.map((item) => Number(item.id)).filter((id) => Number.isFinite(id));
    const nextId = currentIds.length > 0 ? Math.max(...currentIds) + 1 : Date.now();
    return {
      ...appointment,
      id: nextId,
      createdAt: new Date().toISOString(),
      status: 'scheduled',
    };
  }

  checkTimeSlotAvailability(doctorId: number, date: string, time: string, excludeAppointmentId?: number): Observable<boolean> {
    const isAvailable = !this.appointmentsSubject.value.some(appointment =>
      appointment.doctorId === doctorId &&
      appointment.date === date &&
      appointment.time === time &&
      appointment.status !== 'cancelled' &&
      appointment.id !== excludeAppointmentId
    );

    return of(isAvailable);
  }

  updateAppointment(id: number, updates: Partial<Appointment>): Observable<Appointment> {
    const appointments = this.appointmentsSubject.value;
    const index = appointments.findIndex(a => a.id === id);

    if (index === -1) {
      throw new Error('Appointment not found');
    }

    const updatedAppointment = { ...appointments[index], ...updates };
    appointments[index] = updatedAppointment;
    this.appointmentsSubject.next([...appointments]);

    return of(updatedAppointment);
  }

  patientPostpone(id: number | string, newDateIso: string): Observable<Appointment | null> {
    const payload = { newScheduledAt: newDateIso };

    return this.http
      .patch<any>(`${this.proxyApi}/${id}/patient-postpone`, payload)
      .pipe(
      map((response) => {
        const source = response?.appointment ?? response?.data ?? response;
        if (!source) {
          return null;
        }

        const normalizedDateTime = source?.scheduledAt ?? source?.newScheduledAt;
        const nextDate = source?.date ?? this.toDatePart(normalizedDateTime);
        const nextTime = source?.time ?? this.toTimePart(normalizedDateTime);

        const existing = this.appointmentsSubject.value;
        const index = existing.findIndex((appointment) => String(appointment.id) === String(id));
        if (index !== -1 && nextDate && nextTime) {
          const updated = {
            ...existing[index],
            date: nextDate,
            time: nextTime,
          };
          const next = [...existing];
          next[index] = updated;
          this.appointmentsSubject.next(next);
          return updated;
        }

        return null;
      })
    );
  }

  requestCancel(id: number | string, requestedBy: 'PATIENT' | 'DOCTOR'): Observable<any> {
    return this.http.patch(`${this.proxyApi}/${id}/cancel-request`, { requestedBy });
  }

  confirmCancelByPatient(id: number | string): Observable<any> {
    return this.http.post(`${this.proxyApi}/${id}/confirm-cancel/patient`, {});
  }

  confirmCancelByDoctor(id: number | string): Observable<any> {
    return this.http.post(`${this.proxyApi}/${id}/confirm-cancel/doctor`, {});
  }

  doctorConfirmPostpone(id: number | string): Observable<any> {
    return this.http.post(`${this.proxyApi}/${id}/doctor-confirm`, {});
  }

  requestPostponeByDoctor(id: number | string, newDateIso: string): Observable<any> {
    return this.http.patch(`${this.proxyApi}/${id}/postpone`, { newScheduledAt: newDateIso });
  }

  confirmDoctorPostponeByPatient(id: number | string): Observable<any> {
    return this.http.post(`${this.proxyApi}/${id}/confirm`, {});
  }

  rejectDoctorPostponeByPatient(id: number | string): Observable<any> {
    // Fallback keeps decline usable when backend route changes are not yet deployed.
    return this.http.post(`${this.proxyApi}/${id}/reject-postpone/patient`, {}).pipe(
      catchError((error) => {
        if (error?.status === 404) {
          return this.patientDeclineAppointment(id);
        }
        return throwError(() => error);
      }),
    );
  }

  rejectDoctorCancelByPatient(id: number | string): Observable<any> {
    // Fallback keeps decline usable when backend route changes are not yet deployed.
    return this.http.post(`${this.proxyApi}/${id}/reject-cancel/patient`, {}).pipe(
      catchError((error) => {
        if (error?.status === 404) {
          return this.patientDeclineAppointment(id);
        }
        return throwError(() => error);
      }),
    );
  }

  patientConfirmAppointment(id: number | string): Observable<any> {
    return this.http.post(`${this.proxyApi}/${id}/patient-confirm`, {});
  }

  patientDeclineAppointment(id: number | string): Observable<any> {
    return this.http.post(`${this.proxyApi}/${id}/patient-decline`, {});
  }

  doctorAcceptRequest(id: number | string): Observable<any> {
    return this.http.post(`${this.proxyApi}/${id}/doctor-accept-request`, {}).pipe(
      map((response) => {
        this.refreshDoctorAppointmentsSubject.next();
        return response;
      }),
    );
  }

  doctorRefuseRequest(id: number | string): Observable<any> {
    return this.http.post(`${this.proxyApi}/${id}/doctor-refuse-request`, {});
  }

  getAdminAppointmentsDashboard(from?: string, to?: string, symptomLimit?: number): Observable<AdminDashboardMetrics> {
    let params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (symptomLimit) params.append('symptomLimit', String(symptomLimit));
    
    const queryString = params.toString();
    const url = `/api/v1/admin/appointments/dashboard${queryString ? '?' + queryString : ''}`;
    
    return this.http.get<AdminDashboardMetrics>(url);
  }


  getPatientPenaltyProfile(patientId: string | number): Observable<PenaltyProfile> {
    const encodedPatientId = encodeURIComponent(String(patientId));
    const url = `/api/v1/patients/${encodedPatientId}/penalty-profile`;

    return this.http.get<any>(url).pipe(
      map((response) => {
        const source = response?.data ?? response;
        return {
          riskScore: Number(source?.riskScore ?? 0),
          tier: String(source?.tier ?? 'UNKNOWN'),
          offenseCountLast90Days: Number(source?.offenseCountLast90Days ?? 0),
          temporaryLocked: Boolean(source?.temporaryLocked),
          lockUntil: source?.lockUntil ?? null,
          activeRestrictions: Array.isArray(source?.activeRestrictions)
            ? source.activeRestrictions.map((item: any) => String(item))
            : [],
          recentEvents: Array.isArray(source?.recentEvents)
            ? source.recentEvents.map((event: any) => ({
                eventId: event?.eventId ?? event?.id,
                eventType: String(event?.eventType ?? event?.type ?? 'UNKNOWN'),
                appointmentId: event?.appointmentId ?? event?.appointment?.id ?? null,
                occurredAt: String(event?.occurredAt ?? event?.createdAt ?? ''),
                scoreDelta: Number(event?.scoreDelta ?? event?.delta ?? 0),
                notes: String(event?.notes ?? event?.reason ?? '').trim() || undefined,
              }))
            : [],
        };
      }),
    );
  }

  getFlaggedPatients(): Observable<FlaggedPatient[]> {
    const url = `/api/v1/admin/patients/penalties/flagged`;
    return this.http.get<any>(url).pipe(
      map((response) => {
        const source = Array.isArray(response)
          ? response
          : response?.data ?? response?.patients ?? response?.content ?? [];
        return (source as any[]).map((item) => ({
          patientId: String(item?.patientId ?? item?.id ?? ''),
          patientName: String(item?.patientName ?? item?.name ?? item?.fullName ?? 'Unknown'),
          tier: String(item?.tier ?? 'UNKNOWN'),
          riskScore: Number(item?.riskScore ?? 0),
        })).filter((p) => p.patientId);
      }),
    );
  }

  doctorConfirmAttendance(appointmentId: number | string, doctorUserId: string): Observable<any> {
    const encodedAppointmentId = encodeURIComponent(String(appointmentId));
    const url = `${this.proxyApi}/${encodedAppointmentId}/doctor-confirm-attendance`;
    const headers = new HttpHeaders({ 'X-User-Id': doctorUserId });
    return this.http.post(url, {}, { headers });
  }

  private extractBackendAppointments(response: any): Appointment[] {
    const source: any[] = Array.isArray(response)
      ? response
      : response?.data ?? response?.appointments ?? response?.content ?? [];

    return source
      .map((item) => this.normalizeBackendAppointment(item))
      .filter((appointment): appointment is Appointment => !!appointment);
  }

  private normalizeBackendAppointment(raw: any): Appointment | null {
    const base = raw?.appointment ?? raw;
    const scheduledAt = String(base?.scheduledAt ?? base?.dateTime ?? base?.appointmentDate ?? '').trim();
    const parsedDate = scheduledAt ? new Date(scheduledAt) : null;
    const hasValidScheduledAt = !!parsedDate && !Number.isNaN(parsedDate.getTime());
    const date = String(base?.date ?? (hasValidScheduledAt ? this.toDatePart(scheduledAt) : '')).trim();
    const time = String(base?.time ?? (hasValidScheduledAt ? this.toTimePart(scheduledAt) : '')).trim();
    const patientFirstName = String(base?.patient?.firstName ?? base?.patientFirstName ?? base?.patient?.prenom ?? base?.prenom ?? '').trim();
    const patientLastName = String(base?.patient?.lastName ?? base?.patientLastName ?? base?.patient?.nom ?? base?.nom ?? '').trim();
    const patientFullFromParts = patientFirstName || patientLastName
      ? `${patientFirstName} ${patientLastName}`.trim()
      : '';
    const patientName = String(
      base?.patientName ??
      base?.patientFullName ??
      base?.patient?.name ??
      base?.patient?.fullName ??
      base?.patient?.username ??
      base?.patientUsername ??
      patientFullFromParts ??
      'Patient'
    ).trim() || 'Patient';
    const doctorName = String(
      base?.doctorName ??
      base?.doctor?.name ??
      base?.doctorFullName ??
      'Assigned doctor'
    ).trim();
    const status = String(base?.status ?? '').toLowerCase();
    const rawId = base?.id ?? base?.idAp ?? base?.appointmentId;
    const rawType = String(
      base?.notes ??
      base?.reason ??
      base?.type ??
      base?.appointmentType ??
      base?.appointment?.type ??
      base?.appointment?.appointmentType ??
      ''
    ).trim();
    const visitType = this.normalizeVisitTypeFromBackend(
      base?.visitType ??
      base?.visit_mode ??
      base?.visitMode ??
      base?.mode ??
      base?.consultationMode ??
      base?.appointment?.visitType ??
      base?.appointment?.visit_mode ??
      base?.appointment?.mode ??
      (base?.isTelemedicine === true ? 'TELEMEDICINE' : ''),
    );

    if (!rawId || !date || !time) {
      return null;
    }

    return {
      id: Number(rawId),
      patientId: String(base?.idPatient ?? base?.patientId ?? base?.patient?.id ?? ''),
      patientName,
      doctorId: String(base?.idDoctor ?? base?.doctorId ?? base?.doctor?.id ?? ''),
      doctorName,
      date,
      time,
      status: this.normalizeAppointmentStatus(status),
      notes: this.formatAppointmentTypeLabel(rawType || 'consultation'),
      visitType,
      pendingStatus: String(base?.pendingStatus ?? '').trim(),
      pendingScheduledAt: String(base?.pendingScheduledAt ?? '').trim(),
      awaitingPatientConfirmation: Boolean(base?.awaitingPatientConfirmation),
      awaitingDoctorConfirmation: Boolean(base?.awaitingDoctorConfirmation),
      meetingUrl: String(base?.meetingUrl ?? base?.meetingLink ?? base?.joinUrl ?? base?.videoUrl ?? base?.zoomUrl ?? '').trim() || undefined,
      createdAt: String(base?.createdAt ?? new Date().toISOString()),
    };
  }

  private formatAppointmentTypeLabel(value: string): string {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return 'Consultation';

    if (normalized.includes('follow') && normalized.includes('up')) {
      return 'Follow-up';
    }
    if (normalized.includes('emergency')) {
      return 'Emergency';
    }
    if (normalized.includes('consult')) {
      return 'Consultation';
    }

    return normalized
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private toDatePart(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }

  private toTimePart(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private normalizeAppointmentStatus(raw: string): Appointment['status'] {
    const s = String(raw || '').toLowerCase();
    if (s === 'scheduled') return 'scheduled';
    if (s === 'completed') return 'completed';
    if (s === 'attended') return 'attended';
    if (s === 'cancelled') return 'cancelled';
    if (s === 'rejected_by_doctor' || s === 'rejected') return 'rejected_by_doctor';
    if (s === 'pending_doctor_confirmation') return 'pending_doctor_confirmation';
    // PENDING / PENDING_PATIENT_CONFIRMATION → awaiting patient confirmation
    return 'pending_patient_confirmation';
  }

  private normalizeVisitTypeFromBackend(raw: any): string {
    const normalized = String(raw ?? '').trim().toUpperCase();
    if (!normalized) {
      return 'IN_PERSON';
    }

    if (['TELEMEDICINE', 'ONLINE', 'VIRTUAL'].includes(normalized)) {
      return 'TELEMEDICINE';
    }

    if (['IN_PERSON', 'IN-PERSON', 'IN PERSON', 'OFFLINE'].includes(normalized)) {
      return 'IN_PERSON';
    }

    return normalized;
  }
}
