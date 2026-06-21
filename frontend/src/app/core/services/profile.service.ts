import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  // 🔥 Centralized profile state
  private profileSubject = new BehaviorSubject<any>(null);
  public profile$ = this.profileSubject.asObservable();

  constructor(private authService: AuthService) {}

  // 📥 GET CURRENT PROFILE FROM MEMORY
  getCurrentProfile(): any {
    return this.profileSubject.getValue();
  }

  // 🔄 LOAD PROFILE FROM API
  loadProfile(): Observable<any> {
    return this.authService.getProfile().pipe(
      tap((profile: any) => {
        // 🔥 Update the subject with fresh data
        this.profileSubject.next(profile);
        
        // 🔥 Save to localStorage
        const dataToStore = profile?.user || profile;
        this.authService.setUserInfo(dataToStore);
        
        console.log('Profile loaded and cached:', dataToStore);
      })
    );
  }

  // 💾 UPDATE PROFILE
  updateProfile(profileData: any): Observable<any> {
    return this.authService.updateProfile(profileData).pipe(
      tap((response: any) => {
        // 🔥 After update, reload fresh profile from API
        this.loadProfile().subscribe();
      })
    );
  }

  // 🔄 REFRESH PROFILE (Force reload from API)
  refreshProfile(): Observable<any> {
    return this.loadProfile();
  }

  // 🔀 RESET PROFILE (Clear cache on logout)
  resetProfile(): void {
    this.profileSubject.next(null);
  }

  // 📋 GET PROFILE FIELD
  getProfileField(fieldName: string): any {
    const profile = this.getCurrentProfile();
    const data = profile?.user || profile;
    return data?.[fieldName];
  }

  // 🔍 GET FULL NAME
  getFullName(): string {
    const profile = this.getCurrentProfile();
    const data = profile?.user || profile;
    const firstName = data?.firstName || data?.firstname || '';
    const lastName = data?.lastName || data?.lastname || '';
    return `${firstName} ${lastName}`.trim() || 'Pharmacien';
  }

  // 📧 GET EMAIL
  getEmail(): string {
    const profile = this.getCurrentProfile();
    const data = profile?.user || profile;
    return data?.email || '';
  }

  // 🏥 GET LICENSE
  getLicense(): string {
    const profile = this.getCurrentProfile();
    const data = profile?.user || profile;
    return data?.licenseLicense || data?.license || '';
  }
}
