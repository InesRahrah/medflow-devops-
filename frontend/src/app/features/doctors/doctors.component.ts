import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DoctorService, Doctor } from '../../core/services/doctor.service';

@Component({
  selector: 'app-doctors',
  standalone: false,
  templateUrl: './doctors.component.html',
  styleUrls: ['./doctors.component.css'],
})
export class DoctorsComponent implements OnInit {
  searchTerm: string = '';
  selectedSpecialty = 'all';
  selectedLocation = 'all';
  selectedAvailability = 'all';
  doctors: Doctor[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private doctorService: DoctorService
  ) {}

  ngOnInit(): void {
    this.loadDoctors();
  }

  loadDoctors(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.doctorService.getDoctors().subscribe({
      next: (doctors) => {
        this.doctors = doctors;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading doctors:', error);
        this.errorMessage = 'Failed to load doctors. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  get specialtyOptions(): string[] {
    return this.uniqueValues(this.doctors.map((doctor) => doctor.specialty));
  }

  get locationOptions(): string[] {
    return this.uniqueValues(this.doctors.map((doctor) => doctor.location ?? 'Tunis'));
  }

  get hasActiveFilters(): boolean {
    return (
      !!this.searchTerm.trim() ||
      this.selectedSpecialty !== 'all' ||
      this.selectedLocation !== 'all' ||
      this.selectedAvailability !== 'all'
    );
  }

  get filteredDoctors(): Doctor[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.doctors.filter((doctor) => {
      const specialty = (doctor.specialty || '').trim();
      const location = (doctor.location || 'Tunis').trim();
      const doctorName = (doctor.name || '').trim();
      const availabilityState = doctor.availabilityState || 'unknown';

      const matchesSearch =
        !term ||
        doctorName.toLowerCase().includes(term) ||
        specialty.toLowerCase().includes(term) ||
        location.toLowerCase().includes(term);

      const matchesSpecialty = this.selectedSpecialty === 'all' || specialty === this.selectedSpecialty;
      const matchesLocation = this.selectedLocation === 'all' || location === this.selectedLocation;
      const matchesAvailability =
        this.selectedAvailability === 'all' ||
        (this.selectedAvailability === 'available' && availabilityState === 'today') ||
        (this.selectedAvailability === 'upcoming' && availabilityState === 'upcoming');

      return matchesSearch && matchesSpecialty && matchesLocation && matchesAvailability;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedSpecialty = 'all';
    this.selectedLocation = 'all';
    this.selectedAvailability = 'all';
  }

  viewDoctorProfile(doctor: Doctor): void {
    if (!doctor?.id) {
      return;
    }

    this.router.navigate(['/doctors', String(doctor.id)]);
  }

  bookAppointment(doctor: Doctor, event?: Event): void {
    event?.stopPropagation();

    this.router.navigate(['/appointments'], {
      state: { preSelectedDoctor: doctor }
    });
  }
  private uniqueValues(values: string[]): string[] {
    return Array.from(
      new Set(values.map((value) => (value || '').trim()).filter((value) => !!value))
    ).sort((a, b) => a.localeCompare(b));
  }
}
