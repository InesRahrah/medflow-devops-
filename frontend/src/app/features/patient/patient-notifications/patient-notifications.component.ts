import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { EnrichedNotification } from '../../../core/models/notification.model';
import { AuthService } from '../../../core/services/auth.service';

interface NotificationGroup {
  label: string;
  notifications: EnrichedNotification[];
}

@Component({
  selector: 'app-patient-notifications',
  standalone: false,
  templateUrl: './patient-notifications.component.html',
  styleUrls: ['./patient-notifications.component.css'],
})
export class PatientNotificationsComponent implements OnInit, OnDestroy {
  groups: NotificationGroup[] = [];
  isLoading = true;
  unreadCount = 0;

  private subs = new Subscription();

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.notificationService.enrichedNotifications$.subscribe(list => {
        this.groups = this.groupByDate(list);
        this.isLoading = false;
      }),
    );
    this.subs.add(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      }),
    );
    const userId = this.authService.getUserId();
    if (userId) {
      this.notificationService.startPolling(userId);
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  trackById(_: number, item: EnrichedNotification): number {
    return item.id;
  }

  onMarkRead(id: number): void {
    this.notificationService.markAsRead(id);
  }

  onActionDone(_id: number): void {
    window.setTimeout(() => this.notificationService.refreshNow(), 2000);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  get totalCount(): number {
    return this.groups.reduce((sum, g) => sum + g.notifications.length, 0);
  }

  private groupByDate(items: EnrichedNotification[]): NotificationGroup[] {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: Record<string, EnrichedNotification[]> = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Earlier': [],
    };

    for (const item of items) {
      const d = new Date(item.createdAt ?? ''); d.setHours(0, 0, 0, 0);
      if (d.getTime() === today.getTime())     { groups['Today'].push(item); }
      else if (d.getTime() === yesterday.getTime()) { groups['Yesterday'].push(item); }
      else if (d >= weekAgo)                   { groups['This Week'].push(item); }
      else                                     { groups['Earlier'].push(item); }
    }

    return Object.entries(groups)
      .filter(([, notifs]) => notifs.length > 0)
      .map(([label, notifications]) => ({ label, notifications }));
  }
}
