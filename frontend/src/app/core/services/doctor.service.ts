import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Doctor {
  id?: number | string;
  name: string;
  specialty: string;
  fee?: string;
  rating?: number;
  reviews?: number;
  experience?: string;
  initials?: string;
  color?: string;
  location?: string;
  availability?: string;
  availabilityState?: 'today' | 'upcoming' | 'unknown';
  workingDays?: string;
  workingHours?: string;
  profileImageUrl?: string;
  patients?: number;
}

export interface DoctorPatient {
  id: number | string;
  name: string;
  condition?: string;
  lastVisit?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private apiBaseUrl = '/api/v1';
  private usersByRoleUrl = `${this.apiBaseUrl}/users?role=DOCTOR`;
  private doctorsSubject = new BehaviorSubject<Doctor[]>([]);
  public doctors$ = this.doctorsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  getDoctors(): Observable<Doctor[]> {
    return this.http.get<any>(this.usersByRoleUrl).pipe(
      map((response) => this.extractDoctors(response)),
      map((doctors) => doctors.map((doctor) => this.normalizeDoctor(doctor))),
      tap((doctors) => {
        this.doctorsSubject.next(doctors);
      }),
      catchError((error) => throwError(() => error))
    );
  }

  getDoctorById(id: number | string): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.apiBaseUrl}/doctors/${id}`);
  }

  /** Try GET /api/v1/doctors/me — returns the numeric doctor entity ID or null */
  getMyDoctorId(): Observable<string | null> {
    return this.http.get<any>(`${this.apiBaseUrl}/doctors/me`).pipe(
      map((response) => this.getFirstDoctorEntityId(response?.doctor ?? response?.data ?? response)),
      catchError(() => of(this.getStoredDoctorEntityIdCandidates()[0] ?? null)),
    );
  }

  getStoredDoctorEntityIdCandidates(): string[] {
    const storedInfo = this.authService.getStoredUserInfo();
    const token = this.authService.decodeToken();

    return this.extractDoctorEntityIdCandidates(
      storedInfo,
      storedInfo?.user,
      storedInfo?.profile,
      storedInfo?.doctor,
      token,
      token?.user,
      token?.profile,
      token?.doctor,
    );
  }

  getDoctorEntityIdCandidatesFromProfile(profile: any): string[] {
    return this.extractDoctorEntityIdCandidates(profile, profile?.user, profile?.profile, profile?.doctor);
  }

  prependDoctorEntityIdCandidates(currentCandidates: string[], ...sources: any[]): string[] {
    return Array.from(new Set([
      ...this.extractDoctorEntityIdCandidates(...sources),
      ...currentCandidates.filter((candidate) => !!candidate),
    ]));
  }

  normalizeDoctorEntityId(candidate: any): string | null {
    const normalized = String(candidate ?? '').trim();
    if (!normalized) {
      return null;
    }

    const lower = normalized.toLowerCase();
    if (
      normalized.includes('@') ||
      normalized.includes('/') ||
      normalized.includes('?') ||
      normalized.includes('#') ||
      lower === 'null' ||
      lower === 'undefined' ||
      lower === 'unknown' ||
      lower === 'me' ||
      lower === '[object object]'
    ) {
      return null;
    }

    return normalized;
  }

  getDoctorPatients(doctorId: number | string): Observable<DoctorPatient[]> {
    return this.http.get<any>(`${this.apiBaseUrl}/doctors/${encodeURIComponent(String(doctorId))}/patients`).pipe(
      map((response) => this.extractDoctorPatients(response)),
      map((patients) => patients.map((patient) => this.normalizeDoctorPatient(patient))),
      catchError((error) => throwError(() => error))
    );
  }

  createDoctor(doctor: Doctor): Observable<Doctor> {
    return this.http.post<Doctor>(`${this.apiBaseUrl}/doctors`, doctor).pipe(
      tap(newDoctor => {
        const currentDoctors = this.doctorsSubject.value;
        this.doctorsSubject.next([...currentDoctors, newDoctor]);
      })
    );
  }

  updateDoctor(id: number | string, doctor: Doctor): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.apiBaseUrl}/doctors/${id}`, doctor).pipe(
      tap(updatedDoctor => {
        const currentDoctors = this.doctorsSubject.value;
        const index = currentDoctors.findIndex(d => d.id === id);
        if (index !== -1) {
          currentDoctors[index] = updatedDoctor;
          this.doctorsSubject.next([...currentDoctors]);
        }
      })
    );
  }

  deleteDoctor(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/doctors/${id}`).pipe(
      tap(() => {
        const currentDoctors = this.doctorsSubject.value.filter(d => d.id !== id);
        this.doctorsSubject.next(currentDoctors);
      })
    );
  }

  private getFirstDoctorEntityId(...sources: any[]): string | null {
    return this.extractDoctorEntityIdCandidates(...sources)[0] ?? null;
  }

  private extractDoctorEntityIdCandidates(...sources: any[]): string[] {
    const candidates: string[] = [];
    const pushCandidate = (candidate: any) => {
      const normalized = this.normalizeDoctorEntityId(candidate);
      if (normalized && !candidates.includes(normalized)) {
        candidates.push(normalized);
      }
    };

    const collectFromSource = (source: any) => {
      if (source == null) {
        return;
      }

      if (typeof source !== 'object') {
        pushCandidate(source);
        return;
      }

      pushCandidate(source.id);
      pushCandidate(source.doctorId);
      pushCandidate(source.idDoctor);
      pushCandidate(source.doctor_id);
      pushCandidate(source.entityId);
      pushCandidate(source.doctor?.id);
      pushCandidate(source.doctor?.doctorId);
      pushCandidate(source.doctor?.idDoctor);
      pushCandidate(source.user?.doctorId);
      pushCandidate(source.user?.idDoctor);
      pushCandidate(source.profile?.doctorId);
      pushCandidate(source.profile?.idDoctor);
      pushCandidate(source.data?.doctorId);
      pushCandidate(source.data?.idDoctor);
      pushCandidate(source.data?.doctor?.id);
      pushCandidate(source.data?.doctor?.doctorId);
    };

    sources.forEach((source) => collectFromSource(source));
    return candidates;
  }

  private extractDoctors(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.content)) {
      return response.content;
    }

    if (Array.isArray(response?.doctors)) {
      return response.doctors;
    }

    if (Array.isArray(response?.users)) {
      return response.users;
    }

    return [];
  }

  private extractDoctorPatients(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.content)) {
      return response.content;
    }

    if (Array.isArray(response?.patients)) {
      return response.patients;
    }

    return [];
  }

  private normalizeDoctor(rawDoctor: any): Doctor {
    const firstName = String(
      rawDoctor?.firstName || rawDoctor?.firstname || rawDoctor?.name || ''
    ).trim();
    const lastName = String(
      rawDoctor?.lastName || rawDoctor?.lastname || ''
    ).trim();

    const fullName =
      `${firstName} ${lastName}`.trim() ||
      String(rawDoctor?.displayName || rawDoctor?.fullName || 'Doctor').trim();

    const specialty =
      String(
        rawDoctor?.specialty ||
        rawDoctor?.specialization ||
        rawDoctor?.speciality ||
        rawDoctor?.department ||
        'General Practitioner'
      ).trim() || 'General Practitioner';

    const initials = fullName
      .split(' ')
      .filter((part) => !!part)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();

    const normalizedId = rawDoctor?.id ?? rawDoctor?.userId ?? rawDoctor?.doctorId;
    const profileImageUrl = String(
      rawDoctor?.profilePictureUrl ?? rawDoctor?.profileImageUrl ?? rawDoctor?.avatarUrl ?? ''
    ).trim();

    const location = String(
      rawDoctor?.location ?? rawDoctor?.city ?? rawDoctor?.clinicAddress ?? rawDoctor?.address ?? 'Tunis'
    ).trim() || 'Tunis';

    const availabilitySource = String(
      rawDoctor?.availability ?? rawDoctor?.availabilitySchedule ?? rawDoctor?.nextAvailability ?? 'Available today'
    ).trim() || 'Available today';
    const availabilitySummary = this.parseAvailabilitySummary(availabilitySource);

    const patients = Number(rawDoctor?.patients ?? rawDoctor?.patientCount ?? rawDoctor?.totalPatients ?? 0);

    return {
      id: normalizedId,
      name: fullName,
      specialty,
      fee: String(rawDoctor?.fee ?? rawDoctor?.consultationFee ?? 'N/A'),
      rating: Number(rawDoctor?.rating ?? 4.8),
      reviews: Number(rawDoctor?.reviews ?? 0),
      experience: rawDoctor?.experience || rawDoctor?.yearsOfExperience || 'N/A',
      initials: initials || 'DR',
      color: rawDoctor?.color || '#009CE8',
      location,
      availability: availabilitySummary.status,
      availabilityState: availabilitySummary.state,
      workingDays: availabilitySummary.days,
      workingHours: availabilitySummary.hours,
      profileImageUrl,
      patients: Number.isFinite(patients) && patients > 0 ? patients : undefined,
    };
  }

  private parseAvailabilitySummary(value: string): {
    status: string;
    state: 'today' | 'upcoming' | 'unknown';
    days?: string;
    hours?: string;
  } {
    const fallback = (value || '').trim() || 'Available today';

    try {
      const parsed = JSON.parse(fallback) as Record<string, string[]>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { status: fallback, state: 'unknown' };
      }

      const dayOrder = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ];

      const activeDays = dayOrder.filter((day) => Array.isArray(parsed[day]) && parsed[day].length > 0);
      if (activeDays.length === 0) {
        return { status: 'Availability not set', state: 'unknown' };
      }

      const activeDayIndexes = activeDays
        .map((day) => this.getDayIndex(day))
        .filter((index) => index !== -1);
      const rangeByDayIndex = new Map<number, string>();
      activeDays.forEach((day) => {
        const index = this.getDayIndex(day);
        const range = this.getDayRange(parsed[day]);
        if (index !== -1 && range) {
          rangeByDayIndex.set(index, range);
        }
      });

      const ranges = activeDays
        .map((day) => this.getDayRange(parsed[day]))
        .filter((range): range is string => !!range);

      const uniqueRanges = Array.from(new Set(ranges));
      const availabilityStatus = this.buildAvailabilityStatus(activeDayIndexes, rangeByDayIndex);

      return {
        status: availabilityStatus.label,
        state: availabilityStatus.state,
        days: this.formatWorkingDays(activeDays),
        hours: uniqueRanges.length === 1 ? uniqueRanges[0] : 'Varies by day',
      };
    } catch {
      const plainRange = this.parsePlainTimeRange(fallback);
      if (plainRange) {
        const defaultDayIndexes = [0, 1, 2, 3, 4];
        const rangeByDayIndex = new Map(defaultDayIndexes.map((index) => [index, plainRange]));
        const availabilityStatus = this.buildAvailabilityStatus(defaultDayIndexes, rangeByDayIndex);
        return {
          status: availabilityStatus.label,
          state: availabilityStatus.state,
          days: 'Mon-Fri',
          hours: plainRange,
        };
      }

      const textualDays = this.parseTextualWorkingDays(fallback);
      const textualRange = this.parsePlainTimeRange(fallback);
      if (textualDays.length > 0 || textualRange) {
        const resolvedDayIndexes = textualDays.length > 0 ? textualDays : [0, 1, 2, 3, 4];
        const rangeByDayIndex = new Map<string | number, string>();
        if (textualRange) {
          resolvedDayIndexes.forEach((index) => rangeByDayIndex.set(index, textualRange));
        }
        const availabilityStatus = this.buildAvailabilityStatus(
          resolvedDayIndexes,
          rangeByDayIndex as Map<number, string>,
        );
        return {
          status: availabilityStatus.label,
          state: availabilityStatus.state,
          days: textualDays.length > 0 ? this.formatWorkingDaysFromIndexes(textualDays) : 'Mon-Fri',
          hours: textualRange ?? undefined,
        };
      }

      return { status: fallback, state: 'unknown' };
    }
  }

  private parsePlainTimeRange(value: string): string | null {
    const match = String(value || '').match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (!match) {
      return null;
    }

    const start = this.normalizeClockValue(match[1]);
    const end = this.normalizeClockValue(match[2]);
    return start && end ? `${start}-${end}` : null;
  }

  private normalizeClockValue(value: string): string | null {
    const parts = String(value || '').split(':');
    if (parts.length !== 2) {
      return null;
    }

    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return null;
    }

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  private parseTextualWorkingDays(value: string): number[] {
    const normalized = String(value || '').toLowerCase();
    if (!normalized) {
      return [];
    }

    if (normalized.includes('weekdays') || normalized.includes('weekday')) {
      return [0, 1, 2, 3, 4];
    }

    if (normalized.includes('weekends') || normalized.includes('weekend')) {
      return [5, 6];
    }

    const aliases: Array<{ labels: string[]; index: number }> = [
      { labels: ['monday', 'mon'], index: 0 },
      { labels: ['tuesday', 'tue', 'tues'], index: 1 },
      { labels: ['wednesday', 'wed'], index: 2 },
      { labels: ['thursday', 'thu', 'thur', 'thurs'], index: 3 },
      { labels: ['friday', 'fri'], index: 4 },
      { labels: ['saturday', 'sat'], index: 5 },
      { labels: ['sunday', 'sun'], index: 6 },
    ];

    const foundIndexes = aliases
      .filter((item) => item.labels.some((label) => new RegExp(`\\b${label}\\b`).test(normalized)))
      .map((item) => item.index);

    if (foundIndexes.length === 0) {
      return [];
    }

    if (foundIndexes.length === 2 && foundIndexes[0] < foundIndexes[1] && normalized.includes('-')) {
      return Array.from(
        { length: foundIndexes[1] - foundIndexes[0] + 1 },
        (_, offset) => foundIndexes[0] + offset,
      );
    }

    return Array.from(new Set(foundIndexes)).sort((a, b) => a - b);
  }

  private buildAvailabilityStatus(
    dayIndexes: number[],
    rangeByDayIndex: Map<number, string>,
  ): { label: string; state: 'today' | 'upcoming' | 'unknown' } {
    const normalizedDayIndexes = Array.from(new Set(dayIndexes)).sort((a, b) => a - b);
    if (normalizedDayIndexes.length === 0) {
      return { label: 'Schedule available', state: 'unknown' };
    }

    const today = new Date().getDay();
    const normalizedToday = today === 0 ? 6 : today - 1;

    if (normalizedDayIndexes.includes(normalizedToday)) {
      const todayRange = rangeByDayIndex.get(normalizedToday);
      return {
        label: todayRange ? `Today ${todayRange}` : 'Available today',
        state: 'today',
      };
    }

    const nextDayIndex = normalizedDayIndexes.find((index) => index > normalizedToday) ?? normalizedDayIndexes[0];
    const nextDayRange = rangeByDayIndex.get(nextDayIndex);
    const nextDayLabel = this.getDayShortLabel(nextDayIndex);

    return {
      label: nextDayRange ? `Next: ${nextDayLabel} ${nextDayRange}` : `Next: ${nextDayLabel}`,
      state: 'upcoming',
    };
  }

  private getDayRange(slots: string[]): string | null {
    if (!Array.isArray(slots) || slots.length === 0) {
      return null;
    }

    const ordered = [...slots].map((slot) => String(slot).trim()).filter((slot) => !!slot).sort();
    if (ordered.length === 0) {
      return null;
    }

    const start = ordered[0];
    const end = this.addMinutes(ordered[ordered.length - 1], 30);
    return end ? `${start}-${end}` : null;
  }

  private addMinutes(value: string, amount: number): string | null {
    const parts = value.split(':');
    if (parts.length !== 2) {
      return null;
    }

    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return null;
    }

    const total = hour * 60 + minute + amount;
    const nextHour = Math.floor(total / 60);
    const nextMinute = total % 60;
    return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
  }

  private formatWorkingDays(days: string[]): string {
    return this.formatWorkingDaysFromIndexes(
      days
        .map((day) => this.getDayIndex(day))
        .filter((index) => index !== -1),
    );
  }

  private formatWorkingDaysFromIndexes(dayIndexes: number[]): string {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const ranges: string[] = [];
    let startIndex = -1;
    let previousIndex = -1;

    for (const index of Array.from(new Set(dayIndexes)).sort((a, b) => a - b)) {

      if (startIndex === -1) {
        startIndex = index;
        previousIndex = index;
        continue;
      }

      if (index === previousIndex + 1) {
        previousIndex = index;
        continue;
      }

      ranges.push(startIndex === previousIndex ? labels[startIndex] : `${labels[startIndex]}-${labels[previousIndex]}`);
      startIndex = index;
      previousIndex = index;
    }

    if (startIndex !== -1) {
      ranges.push(startIndex === previousIndex ? labels[startIndex] : `${labels[startIndex]}-${labels[previousIndex]}`);
    }

    return ranges.join(', ');
  }

  private getDayShortLabel(index: number): string {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return labels[index] || 'Day';
  }

  private getDayIndex(day: string): number {
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return dayOrder.indexOf(String(day || '').toLowerCase());
  }

  private normalizeDoctorPatient(rawPatient: any): DoctorPatient {
    const firstName = String(
      rawPatient?.firstName ?? rawPatient?.firstname ?? rawPatient?.patientFirstName ?? ''
    ).trim();
    const lastName = String(
      rawPatient?.lastName ?? rawPatient?.lastname ?? rawPatient?.patientLastName ?? ''
    ).trim();

    const fullName =
      `${firstName} ${lastName}`.trim() ||
      String(
        rawPatient?.name ??
        rawPatient?.fullName ??
        rawPatient?.patientName ??
        rawPatient?.displayName ??
        'Patient'
      ).trim();

    return {
      id: rawPatient?.id ?? rawPatient?.patientId ?? rawPatient?.userId ?? fullName,
      name: fullName,
      condition: String(
        rawPatient?.condition ??
        rawPatient?.diagnosis ??
        rawPatient?.notes ??
        rawPatient?.reason ??
        rawPatient?.latestCondition ??
        ''
      ).trim(),
      lastVisit: String(
        rawPatient?.lastVisit ??
        rawPatient?.lastVisitDate ??
        rawPatient?.lastAppointmentDate ??
        rawPatient?.updatedAt ??
        rawPatient?.createdAt ??
        ''
      ).trim(),
      status: String(
        rawPatient?.status ??
        rawPatient?.patientStatus ??
        rawPatient?.followUpStatus ??
        ''
      ).trim(),
    };
  }
}
