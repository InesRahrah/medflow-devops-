import { Component, OnInit } from '@angular/core';
import { NurseService, NurseRoom } from '../nurse.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-nurse-my-rooms',
  templateUrl: './nurse-my-rooms.component.html',
  styleUrls: ['./nurse-my-rooms.component.css']
})
export class NurseMyRoomsComponent implements OnInit {
  assignedRooms: NurseRoom[] = [];
  loading = true;
  error: string | null = null;

  constructor(private nurseService: NurseService) {}

  ngOnInit(): void {
    this.loadMyRooms();
  }

  loadMyRooms(): void {
    this.loading = true;
    this.error = null;

    this.nurseService.getMyRooms()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (rooms: NurseRoom[]) => {
          console.log('My Rooms Response:', rooms);
          this.assignedRooms = rooms;
        },
        error: (err: any) => {
          console.error('Error fetching assigned rooms:', err);
          this.error = 'Unable to load room assignments. Please try again.';
        }
      });
  }

  getStatusClass(status: string): string {
    return (status || '').toLowerCase();
  }

  getRoomTypeIcon(roomNumber: string): string {
    const nr = String(roomNumber).toUpperCase();
    if (nr.includes('ICU')) return 'fa-heart-pulse';
    if (nr.includes('OR')) return 'fa-user-nurse';
    if (nr.includes('ED')) return 'fa-truck-medical';
    return 'fa-bed';
  }
}
