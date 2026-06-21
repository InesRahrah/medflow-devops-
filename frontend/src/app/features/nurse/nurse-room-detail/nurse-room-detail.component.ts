import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HospitalStructureService } from '../../../core/services/hospital-structure.service';
import { Bed } from '../../hospital-structure/models/hospital-structure.model';
import { NurseService, NurseRoom } from '../nurse.service';

@Component({
  selector: 'app-nurse-room-detail',
  templateUrl: './nurse-room-detail.component.html',
  styleUrls: ['./nurse-room-detail.component.css']
})
export class NurseRoomDetailComponent implements OnInit {
  roomId!: string;
  room!: NurseRoom;          // ← changed from NurseRoom | null = null
  beds: Bed[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hospitalService: HospitalStructureService,
    private nurseService: NurseService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.roomId = params.get('roomId') as string;
      this.loadData();
    });
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.nurseService.getMyRooms().subscribe({
      next: (rooms) => {
        const found = rooms.find(r => r.id === this.roomId);
        if (!found) {
          this.error = 'Room not found or not assigned to you.';
          this.loading = false;
          return;
        }
        this.room = found;   // ← only assign when confirmed non-null
        this.loadBeds();
      },
      error: () => {
        this.error = 'Failed to load room information.';
        this.loading = false;
      }
    });
  }

  private loadBeds(): void {
    this.hospitalService.getBedsByRoom(this.roomId).subscribe({
      next: (beds) => {
        this.beds = beds;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load bed data.';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/nurse/my-rooms']);
  }

  get freeBeds(): number {
    return this.beds.filter(b => b.status === 'FREE').length;
  }

  get occupiedBeds(): number {
    return this.beds.filter(b => b.status === 'OCCUPIED').length;
  }

  get reservedBeds(): number {
    return this.beds.filter(b => b.status === 'RESERVED').length;
  }

  get outOfServiceBeds(): number {
    return this.beds.filter(b => b.status === 'OUT_OF_SERVICE').length;
  }

  getBedStatusClass(status: string): string {
    return (status || '').toLowerCase().replace(/_/g, '_');
  }

  getBedIconClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'FREE':           return 'icon-free';
      case 'OCCUPIED':       return 'icon-occupied';
      case 'RESERVED':       return 'icon-reserved';
      case 'OUT_OF_SERVICE': return 'icon-out-of-service';
      default:               return 'icon-free';
    }
  }
}