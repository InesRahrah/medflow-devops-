import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiBaseUrl = '/api/v1';
  private authBaseUrl = `${this.apiBaseUrl}/auth`;
  private meUrl = `${this.apiBaseUrl}/users/me`;
  private userInfoSubject$ = new BehaviorSubject<any>(this.getStoredUserInfo());
  public userInfo$ = this.userInfoSubject$.asObservable();

  constructor(private http: HttpClient) {
    // Initialize with stored user info if available
    const stored = this.getStoredUserInfo();
    if (stored && Object.keys(stored).length > 0) {
      this.userInfoSubject$.next(stored);
    }
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.authBaseUrl}/register`, userData).pipe(
      tap((response: any) => {
        if (response && response.token) {
          // clear old state before we save new
          localStorage.removeItem('user_info');
          localStorage.removeItem('medflow_wizard_draft');
          this.setToken(response.token);
          // Store user info from request just in case token is sparse
          if (userData.role) {
            localStorage.setItem('user_info', JSON.stringify(userData));
          }
          // this.getProfile().subscribe();
        }
      }),
    );
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.authBaseUrl}/authenticate`, credentials).pipe(
      tap((response: any) => {
        if (response && response.token) {
          this.setToken(response.token);
          if (response.user) {
            this.setUserInfo(response.user);
          }
        }
      }),
    );
  }

  googleLogin(token: string): Observable<any> {
    return this.http.post(`${this.authBaseUrl}/google`, { token }).pipe(
      tap((response: any) => {
        if (response && response.token) {
          this.setToken(response.token);
          if (response.user) {
            this.setUserInfo(response.user);
          }
        }
      }),
    );
  }

  setupGoogle(setupData: any): Observable<any> {
    return this.http.post(`${this.authBaseUrl}/google/setup`, setupData).pipe(
      tap((response: any) => {
        if (response && response.token) {
          this.setToken(response.token);
          if (response.user) {
            this.setUserInfo(response.user);
          }
        }
      }),
    );
  }

  getProfile(): Observable<any> {
    return this.http.get(this.meUrl).pipe(
      tap((profile: any) => {
        if (profile) {
          this.setUserInfo(profile);
        }
      }),
    );
  }

  updateProfile(profileData: any): Observable<any> {
    return this.http.put(this.meUrl, profileData).pipe(
      tap((updatedProfile: any) => {
        if (updatedProfile) {
          // Merge with existing info to avoid losing data if backend returns partial object
          const currentInfo = this.getStoredUserInfo();
          const mergedData = { ...currentInfo, ...updatedProfile };

          // 🔥 Explicitly set all profile data
          this.setUserInfo(mergedData);

          // 🔥 Log for debugging
          console.log('Profile updated in localStorage:', mergedData);
        }
      }),
    );
  }

  uploadProfileImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.meUrl}/profile-image`, formData).pipe(
      tap((updatedProfile: any) => {
        if (updatedProfile) {
          const currentInfo = this.getStoredUserInfo();
          this.setUserInfo({ ...currentInfo, ...updatedProfile });
        }
      }),
    );
  }

  getMyAccessCode(): Observable<any> {
    return this.http.get(`${this.meUrl}/access-code`);
  }

  regenerateMyAccessCode(): Observable<any> {
    return this.http.post(`${this.meUrl}/access-code/regenerate`, {});
  }

  getStoredUserInfo(): any {
    return JSON.parse(localStorage.getItem('user_info') || '{}');
  }

  setUserInfo(userInfo: any): void {
    const dataToStore = userInfo || {};
    localStorage.setItem('user_info', JSON.stringify(dataToStore));
      this.userInfoSubject$.next(dataToStore);
    // 🔥 Verify it was saved correctly
    console.log(
      'User info saved to localStorage:',
      JSON.parse(localStorage.getItem('user_info') || '{}'),
    );
  }

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getTokenPayload(): any {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        '=',
      );
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  getStaffRole(): 'DOCTOR' | 'NURSE' | 'STAFF_ADMIN' | null {
    const payload = this.getTokenPayload();
    const rawRole = payload?.staffRole;

    if (!rawRole) return null;

    const normalized = String(rawRole).toUpperCase().trim();
    if (
      normalized === 'DOCTOR' ||
      normalized === 'NURSE' ||
      normalized === 'STAFF_ADMIN'
    ) {
      return normalized;
    }

    return null;
  }

  getSystemRole(): string | null {
    const payload = this.getTokenPayload();
    const rawRole = payload?.role;
    return rawRole ? String(rawRole).toUpperCase().trim() : null;
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('medflow_wizard_draft');
  }

  decodeToken(): any {
    return this.getTokenPayload();
  }

  isGoogleUser(): boolean {
    const info = this.getStoredUserInfo();
    const provider = info?.provider || info?.user?.provider;
    return provider === 'GOOGLE';
  }

  isSetupCompleted(): boolean {
    const info = this.getStoredUserInfo();
    return !!(info?.setupCompleted || info?.user?.setupCompleted);
  }

  isSetupRequired(): boolean {
    return this.isGoogleUser() && !this.isSetupCompleted();
  }

  hasRoleInStoredProfile(): boolean {
    const info = this.getStoredUserInfo();
    return !!(
      info?.role ||
      info?.roles ||
      info?.authorities ||
      info?.user?.role
    );
  }

  getUserFirstName(): string {
    const localInfo = this.getStoredUserInfo();
    const token = this.decodeToken();

    // Priority: Get the person's actual firstName first
    const firstName =
      localInfo?.firstName ||
      localInfo?.firstname ||
      token?.firstName ||
      token?.firstname ||
      token?.given_name ||
      localInfo?.user?.firstName ||
      localInfo?.user?.firstname ||
      // Only use organization names if no personal name found
      localInfo?.labName ||
      localInfo?.pharmacyName ||
      localInfo?.name ||
      localInfo?.companyName ||
      localInfo?.hospitalName ||
      localInfo?.user?.labName ||
      localInfo?.user?.pharmacyName ||
      localInfo?.user?.name ||
      token?.name ||
      '';

    return this.capitalizeName(firstName);
  }

  getUserLastName(): string {
    const localInfo = this.getStoredUserInfo();
    const token = this.decodeToken();

    const lastName =
      localInfo?.lastName ||
      localInfo?.lastname ||
      localInfo?.user?.lastName ||
      localInfo?.user?.lastname ||
      token?.lastName ||
      token?.lastname ||
      token?.family_name ||
      '';

    return this.capitalizeName(lastName);
  }

  getUserId(): string | null {
    const storedInfo = this.getStoredUserInfo();
    const token = this.decodeToken();

    const userId =
      storedInfo?.id ||
      storedInfo?.userId ||
      storedInfo?.user?.id ||
      storedInfo?.user?.userId ||
      token?.userId ||
      token?.id ||
      token?.user_id ||
      token?.sub ||
      token?.user?.id ||
      token?.user?.userId;

    if (userId === null || userId === undefined) {
      return null;
    }

    const normalized = String(userId).trim();
    return normalized || null;
  }

  getUserIdAsString(): string | null {
    const storedInfo = this.getStoredUserInfo();
    const token = this.decodeToken();

    const userId =
      storedInfo?.id ||
      storedInfo?.userId ||
      storedInfo?.user?.id ||
      storedInfo?.user?.userId ||
      token?.userId ||
      token?.id ||
      token?.user_id ||
      token?.sub ||
      token?.user?.id ||
      token?.user?.userId;

    if (userId === null || userId === undefined) {
      return null;
    }

    return String(userId);
  }

  getPatientEntityId(): string | null {
    return this.getPatientEntityIdCandidates()[0] ?? null;
  }

  getPatientEntityIdAsString(): string | null {
    return this.getPatientEntityId();
  }

  getPatientEntityIdCandidates(): string[] {
    const storedInfo = this.getStoredUserInfo();
    const token = this.decodeToken();

    return this.extractPatientEntityIdCandidates(
      storedInfo,
      storedInfo?.user,
      storedInfo?.profile,
      storedInfo?.patient,
      token,
      token?.user,
      token?.profile,
      token?.patient,
    );
  }

  private normalizePatientEntityId(candidate: any): string | null {
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

  private extractPatientEntityIdCandidates(...sources: any[]): string[] {
    const candidates: string[] = [];
    const pushCandidate = (candidate: any) => {
      const normalized = this.normalizePatientEntityId(candidate);
      if (normalized && !candidates.includes(normalized)) {
        candidates.push(normalized);
      }
    };

    const collectFromSource = (source: any) => {
      if (source == null) {
        return;
      }

      if (typeof source !== 'object') {
        return;
      }

      pushCandidate(source.patientId);
      pushCandidate(source.idPatient);
      pushCandidate(source.patient_id);
      pushCandidate(source.entityId);
      pushCandidate(source.profileId);
      pushCandidate(source.patient?.id);
      pushCandidate(source.patient?.patientId);
      pushCandidate(source.patient?.idPatient);
      pushCandidate(source.patient?.entityId);
      pushCandidate(source.user?.patientId);
      pushCandidate(source.user?.idPatient);
      pushCandidate(source.profile?.patientId);
      pushCandidate(source.profile?.idPatient);
      pushCandidate(source.data?.patientId);
      pushCandidate(source.data?.idPatient);
      pushCandidate(source.data?.patient?.id);
      pushCandidate(source.data?.patient?.patientId);
      pushCandidate(source.id);
    };

    sources.forEach((source) => collectFromSource(source));
    return candidates;
  }

  private capitalizeName(name: string): string {
    const trimmed = String(name || '').trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  private normalizeRole(rawRole: any): string {
    if (!rawRole) return 'UNKNOWN';

    let normalized = String(rawRole).toUpperCase().replace('ROLE_', '').trim();

    if (normalized.includes('HOSPITAL') || normalized.includes('MANAGER')) {
      return 'HOSPITAL';
    }
    if (normalized.includes('DOCTOR')) {
      return 'DOCTOR';
    }
    if (normalized.includes('NURSE')) {
      return 'NURSE';
    }
    if (normalized.includes('LAB')) {
      return 'LABO';
    }
    if (normalized.includes('INSURANCE')) {
      return 'INSURANCE';
    }
    if (normalized.includes('ADMIN')) {
      return 'ADMIN';
    }
    if (normalized.includes('PATIENT')) {
      return 'PATIENT';
    }
    if (normalized.includes('PHARMACIST')) {
      return 'PHARMACIST';
    }
    if (normalized.includes('DELIVERY_AGENT')) {
      return 'DELIVERY_AGENT';
    }
    if (normalized.includes('CENTRAL_PHARMACY')) {
  return 'CENTRAL_PHARMACY';
}

    return normalized || 'UNKNOWN';
  }

  private firstAuthority(authorities: any): any {
    if (!authorities) return null;
    if (Array.isArray(authorities) && authorities.length > 0) {
      const item = authorities[0];
      if (typeof item === 'object') {
        return item.authority || item.role || item.name || null;
      }
      return item;
    }
    return authorities;
  }

  getUserRole(): string {
    const decodedToken = this.decodeToken();
    const localInfo = this.getStoredUserInfo();

    const roleCandidates = [
      decodedToken?.role,
      decodedToken?.roles,
      this.firstAuthority(decodedToken?.authorities),
      decodedToken?.user?.role,
      decodedToken?.user?.roles,
      this.firstAuthority(decodedToken?.user?.authorities),
      localInfo?.role,
      localInfo?.roles,
      this.firstAuthority(localInfo?.authorities),
      localInfo?.user?.role,
      localInfo?.user?.roles,
      this.firstAuthority(localInfo?.user?.authorities),
    ];

    for (const candidate of roleCandidates) {
      if (Array.isArray(candidate) && candidate.length > 0) {
        const first =
          typeof candidate[0] === 'object'
            ? candidate[0].authority || candidate[0].role || candidate[0].name
            : candidate[0];
        if (first) return this.normalizeRole(first);
      }

      if (candidate && typeof candidate !== 'object') {
        return this.normalizeRole(candidate);
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Helper to extract validation errors from backend 400 response
   */
  getValidationErrors(error: any): Record<string, string> {
    if (error?.status === 400 && error.error?.errors) {
      return error.error.errors;
    }
    return {};
  }
  







  

  getFriendlyErrorMessage(
    error: any,
    fallbackMessage = 'An error occurred. Please try again.',
  ): string {
    if (!error) {
      return fallbackMessage;
    }

    const payload = error.error;

    if (typeof payload === 'string' && payload.trim()) {
      return this.cleanErrorText(payload);
    }

    const backendErrors = payload?.errors;
    if (backendErrors && typeof backendErrors === 'object') {
      if (Array.isArray(backendErrors)) {
        const messages = backendErrors
          .map((entry: any) => this.extractBackendFieldError(entry))
          .filter((value: string) => !!value);
        if (messages.length > 0) {
          return messages.join(' ');
        }
      } else {
        const messages = Object.entries(backendErrors)
          .map(
            ([field, message]) =>
              `${this.prettyFieldName(field)}: ${String(message)}`,
          )
          .filter((value) => !!value);
        if (messages.length > 0) {
          return messages.join(' ');
        }
      }
    }

    const candidates = [
      payload?.message,
      payload?.error,
      payload?.details,
      payload?.title,
      error?.message,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return this.cleanErrorText(candidate);
      }
    }

    return fallbackMessage;
  }

  private cleanErrorText(errorMessage: string): string {
    const quoteMatch = errorMessage.match(/"([^"]+)"/);
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1];
    }

    return errorMessage.replace(/^\d+\s+\w+\s+/, '').trim();
  }

  private extractBackendFieldError(entry: any): string {
    if (!entry) {
      return '';
    }

    if (typeof entry === 'string') {
      return this.cleanErrorText(entry);
    }

    const fieldName = entry.field || entry.name || entry.property || entry.key;
    const message =
      entry.defaultMessage || entry.message || entry.error || entry.reason;

    if (fieldName && message) {
      return `${this.prettyFieldName(String(fieldName))}: ${String(message)}`;
    }

    return message ? String(message) : '';
  }

  private prettyFieldName(field: string): string {
    return String(field || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/^./, (char) => char.toUpperCase());
  }
}
