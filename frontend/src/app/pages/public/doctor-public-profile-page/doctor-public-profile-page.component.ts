import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  DoctorDirectoryResponse,
  UserService,
} from '../../../core/services/user.service';

@Component({
  selector: 'app-doctor-public-profile-page',
  templateUrl: './doctor-public-profile-page.component.html',
  styleUrls: ['./doctor-public-profile-page.component.css'],
})
export class DoctorPublicProfilePageComponent implements OnInit {
  loading = false;
  errorMessage = '';
  doctor: DoctorDirectoryResponse | null = null;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const doctorId = params.get('id');
      if (!doctorId) {
        this.errorMessage = 'Doctor not found.';
        this.doctor = null;
        return;
      }
      this.loadDoctor(doctorId);
    });
  }

  get doctorName(): string {
    if (!this.doctor) {
      return 'Doctor Profile';
    }

    const fullName = [this.doctor.firstName, this.doctor.lastName]
      .map((value) => (value || '').trim())
      .filter((value) => !!value)
      .join(' ');

    if (!fullName) {
      return 'Doctor Profile';
    }

    return fullName.toLowerCase().startsWith('dr.')
      ? fullName
      : `Dr. ${fullName}`;
  }

  get doctorSpecialty(): string {
    return (this.doctor?.specialization || 'General Medicine').trim();
  }

  get doctorExperience(): string {
    const value = this.doctor?.yearsOfExperience;
    return typeof value === 'number' ? `${value}+ years` : 'Not specified';
  }

  get doctorFeeAmount(): string {
    const value = this.doctor?.consultationFee;
    return typeof value === 'number' ? String(value) : 'N/A';
  }

  get doctorFeeCurrency(): string {
    return 'TND';
  }

  get doctorEmail(): string {
    const value = (this.doctor?.email || '').trim();
    return value || 'Not provided';
  }

  get doctorPhone(): string {
    const value = (this.doctor?.phoneNumber || '').trim();
    return value ? this.formatPhone(value) : 'Not provided';
  }

  get doctorClinicAddress(): string {
    return this.getDoctorLocationText() || 'Not provided';
  }

  get doctorMapUrl(): SafeResourceUrl | null {
    const location = this.getDoctorLocationText();
    if (!location) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${encodeURIComponent(location)}&z=15&output=embed`,
    );
  }

  get doctorPhoneHref(): string {
    const raw = (this.doctor?.phoneNumber || '').trim();
    const normalized = raw.replace(/\s+/g, '');
    return normalized ? `tel:${normalized}` : '';
  }

  get doctorEmailHref(): string {
    const email = (this.doctor?.email || '').trim();
    return email ? `mailto:${email}` : '';
  }

  get doctorWhatsAppReady(): boolean {
    const raw = (this.doctor?.phoneNumber || '').trim();
    return !!raw.replace(/[^\d]/g, '');
  }

  get doctorAboutLabel(): string {
    const fallback = 'Doctor';
    const lastName = (this.doctor?.lastName || '').trim();
    if (lastName) {
      return `About Dr. ${lastName}`;
    }

    const name = this.doctorName.replace(/^Dr\.\s*/i, '').trim();
    const parts = name.split(/\s+/).filter((part) => !!part);
    return `About Dr. ${parts[parts.length - 1] || fallback}`;
  }

  get doctorAvailabilityChips(): string[] {
    const value = (this.doctor?.availabilitySchedule || '').trim();
    if (!value) {
      return [];
    }

    const parsed = this.parseAvailability(value);
    return parsed.length > 0 ? parsed : [value];
  }

  get doctorBio(): string {
    const text = (this.doctor?.biography || '').trim();
    if (text) {
      return text;
    }

    const name = this.doctorName.replace(/^Dr\.\s*/i, '').trim();
    return name
      ? `Dr. ${name} will add a short bio soon.`
      : 'About section coming soon.';
  }

  get hasDirections(): boolean {
    const location = this.getDoctorLocationText();
    return !!location;
  }

  openBookAppointment(): void {
    if (!this.doctor) {
      return;
    }

    this.router.navigate(['/appointments'], {
      state: {
        preSelectedDoctor: {
          id: this.doctor.id,
          name: this.doctorName,
          specialty: this.doctorSpecialty,
        },
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/doctors']);
  }

  openWhatsApp(): void {
    const raw = (this.doctor?.phoneNumber || '').trim();
    if (!raw) {
      return;
    }

    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) {
      return;
    }

    window.open(`https://wa.me/${digits}`, '_blank', 'noopener');
  }

  openEmailMessage(): void {
    const email = (this.doctor?.email || '').trim();
    if (!email) {
      return;
    }

    window.location.href = `mailto:${email}`;
  }

  openWhatsAppCall(): void {
    const raw = (this.doctor?.phoneNumber || '').trim();
    if (!raw) {
      return;
    }

    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) {
      return;
    }

    const appUrl = `whatsapp://send?phone=${digits}`;
    const webUrl = `https://wa.me/${digits}`;

    window.location.href = appUrl;
    setTimeout(() => {
      window.open(webUrl, '_blank', 'noopener');
    }, 600);
  }

  openDirections(): void {
    const location = this.getDoctorLocationText();
    if (!location) {
      return;
    }

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`,
      '_blank',
      'noopener',
    );
  }

  private loadDoctor(doctorId: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.userService.getDoctorById(doctorId).subscribe({
      next: (doctor) => {
        this.doctor = doctor;
        this.loading = false;
      },
      error: () => {
        this.doctor = null;
        this.loading = false;
        this.errorMessage = 'Unable to load this doctor profile.';
      },
    });
  }

  private addMinutes(value: string, amount: number): string | null {
    const parts = value.split(':');
    if (parts.length !== 2) return null;

    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

    const total = hour * 60 + minute + amount;
    const nextHour = Math.floor(total / 60);
    const nextMinute = total % 60;
    return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
  }

  private parseAvailability(value: string): string[] {
    try {
      const parsed = JSON.parse(value) as Record<string, string[]>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return [];
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

      return dayOrder
        .filter((day) => Array.isArray(parsed[day]) && parsed[day].length > 0)
        .map((day) => {
          const slots = [...parsed[day]].sort();
          const start = slots[0];
          const end = this.addMinutes(slots[slots.length - 1], 30);
          if (!end) {
            return '';
          }

          return `${this.getDayLabel(day)} ${start}-${end}`;
        })
        .filter((item) => !!item);
    } catch {
      return [];
    }
  }

  private getDayLabel(day: string): string {
    const labels: Record<string, string> = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    };

    return labels[day] || day;
  }

  private formatPhone(raw: string): string {
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) {
      return raw;
    }

    if (digits.length === 11 && digits.startsWith('216')) {
      const local = digits.slice(3);
      return `+216 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 8)}`;
    }

    if (digits.length === 8) {
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)}`;
    }

    return raw;
  }

  private getDoctorLocationText(): string {
    const source = this.doctor as (DoctorDirectoryResponse & {
      clinicAddress?: string;
      address?: string;
      location?: string;
      city?: string;
    }) | null;

    if (!source) {
      return '';
    }

    return (
      source.clinicAddress || source.address || source.location || source.city || ''
    ).trim();
  }
}
