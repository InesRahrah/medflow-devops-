import { Component, HostListener, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import {
  DmrService,
  MedicineItemResponse,
} from '../../core/services/dmr.service';
import {
  UserService,
  PrescriptionWithDosages,
} from '../../core/services/user.service';

type TreatmentPeriod = 'Morning' | 'Afternoon' | 'Night';

type DoseStatus = 'taken' | 'not-taken' | 'missed';

interface DoseStatusMeta {
  status: DoseStatus;
  label: string;
  value: -1 | 0 | 1;
  canToggle: boolean;
}

interface CalendarDay {
  date: Date;
  dateString: string;
  isCurrentMonth: boolean;
  totalCount: number;
  completedCount: number;
  periodCounts: Record<TreatmentPeriod, number>;
}

interface DosageItem {
  id: string;
  medicineId: string;
  medicineName: string;
  period: TreatmentPeriod;
  time: string;
  dateString: string;
  quantity: string;
  isCompleted: boolean;
  doseNotes?: string;
  medicineDescription?: string;
}

interface DayTreatmentGroup {
  date: Date;
  dateString: string;
  periods: Record<TreatmentPeriod, DosageItem[]>;
  totalCount: number;
  completedCount: number;
}

@Component({
  selector: 'app-patient-treatment',
  templateUrl: './patient-treatment.component.html',
  styleUrls: ['./patient-treatment.component.css'],
})
export class PatientTreatmentComponent implements OnInit {
  readonly periods: TreatmentPeriod[] = ['Morning', 'Afternoon', 'Night'];
  loading = false;
  errorMessage = '';
  patientId = '';
  currentMonth = new Date();
  calendarDays: CalendarDay[] = [];
  prescriptions: PrescriptionWithDosages[] = [];
  listDayGroups: DayTreatmentGroup[] = [];
  selectedDateString: string | null = null;
  selectedDayGroup: DayTreatmentGroup | null = null;
  showDayPopup = false;
  showOlderListGroups = false;
  viewMode: 'calendar' | 'list' = 'calendar';
  private dayGroupsByDate = new Map<string, DayTreatmentGroup>();
  private medicineNameById = new Map<string, string>();

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private dmrService: DmrService,
  ) {}

  ngOnInit(): void {
    this.patientId = this.authService.getPatientEntityIdAsString() || '';
    if (!this.patientId) {
      this.errorMessage = 'Unable to detect patient id from your account.';
      return;
    }
    this.loadTreatments();
  }

  loadTreatments(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      prescriptions: this.userService.getPatientPrescriptions(this.patientId),
      medicines: this.dmrService
        .getMedicines()
        .pipe(catchError(() => of([] as MedicineItemResponse[]))),
    }).subscribe({
      next: ({ prescriptions, medicines }) => {
        this.prescriptions = prescriptions;
        this.medicineNameById = new Map(
          medicines.map((medicine) => [
            medicine.id,
            (medicine.name || '').trim(),
          ]),
        );
        this.rebuildTreatmentViews();
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load prescriptions.';
        console.error('Error loading prescriptions:', error);
        this.loading = false;
      },
    });
  }

  private rebuildTreatmentViews(): void {
    this.buildDayGroups();
    this.generateCalendar();
    this.ensureSelectedDay();
  }

  private buildDayGroups(): void {
    const grouped = new Map<string, DayTreatmentGroup>();

    for (const prescription of this.prescriptions) {
      for (const dosage of prescription.dosages || []) {
        const parsedTime = new Date(dosage.time);
        if (Number.isNaN(parsedTime.getTime())) {
          continue;
        }

        const dateString = this.formatDateKey(parsedTime);
        const period = this.getPeriodFromTime(parsedTime);
        const dayGroup =
          grouped.get(dateString) ||
          ({
            date: new Date(
              parsedTime.getFullYear(),
              parsedTime.getMonth(),
              parsedTime.getDate(),
            ),
            dateString,
            periods: this.createEmptyPeriods(),
            totalCount: 0,
            completedCount: 0,
          } as DayTreatmentGroup);

        const item: DosageItem = {
          id: dosage.id,
          medicineId: dosage.medicineId,
          medicineName: this.resolveMedicineName(
            dosage.medicineId,
            dosage.medicineName,
          ),
          period,
          time: dosage.time,
          dateString,
          quantity: dosage.quantity,
          isCompleted: dosage.taken,
          doseNotes: dosage.doseNotes,
          medicineDescription: dosage.medicineDescription,
        };

        dayGroup.periods[period].push(item);
        grouped.set(dateString, dayGroup);
      }
    }

    const groups = Array.from(grouped.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    for (const group of groups) {
      for (const period of this.periods) {
        group.periods[period].sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
        );
      }
      this.recalculateGroupCounts(group);
    }

    this.listDayGroups = groups;
    this.dayGroupsByDate = new Map(
      groups.map((group) => [group.dateString, group]),
    );
  }

  private generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    this.calendarDays = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateString = this.formatDateKey(current);
      const dayGroup = this.dayGroupsByDate.get(dateString);

      this.calendarDays.push({
        date: new Date(current),
        dateString,
        isCurrentMonth: current.getMonth() === month,
        totalCount: dayGroup?.totalCount || 0,
        completedCount: dayGroup?.completedCount || 0,
        periodCounts: {
          Morning: dayGroup?.periods.Morning.length || 0,
          Afternoon: dayGroup?.periods.Afternoon.length || 0,
          Night: dayGroup?.periods.Night.length || 0,
        },
      });

      current.setDate(current.getDate() + 1);
    }
  }

  private ensureSelectedDay(): void {
    const currentMonthDays = this.calendarDays.filter(
      (day) => day.isCurrentMonth,
    );
    const currentMonthKeys = new Set(
      currentMonthDays.map((day) => day.dateString),
    );

    if (
      !this.selectedDateString ||
      !currentMonthKeys.has(this.selectedDateString)
    ) {
      const todayKey = this.formatDateKey(new Date());
      const firstWithTreatments = currentMonthDays.find(
        (day) => day.totalCount > 0,
      );

      if (currentMonthKeys.has(todayKey)) {
        this.selectedDateString = todayKey;
      } else if (firstWithTreatments) {
        this.selectedDateString = firstWithTreatments.dateString;
      } else {
        this.selectedDateString = currentMonthDays[0]?.dateString || null;
      }
    }

    this.selectedDayGroup = this.resolveDayGroup(this.selectedDateString);
  }

  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDateKey(dateKey: string): Date {
    const [year, month, day] = dateKey.split('-').map((value) => Number(value));
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private getPeriodFromTime(time: Date): TreatmentPeriod {
    const hour = time.getHours();

    if (hour < 12) {
      return 'Morning';
    }

    if (hour < 18) {
      return 'Afternoon';
    }

    return 'Night';
  }

  private createEmptyPeriods(): Record<TreatmentPeriod, DosageItem[]> {
    return {
      Morning: [],
      Afternoon: [],
      Night: [],
    };
  }

  private resolveMedicineName(
    medicineId: string,
    fallbackName?: string,
  ): string {
    const mappedName = (this.medicineNameById.get(medicineId) || '').trim();
    if (mappedName) {
      return mappedName;
    }

    const provided = (fallbackName || '').trim();
    if (provided) {
      return provided;
    }

    return `Medicine ${medicineId?.slice(0, 6) || ''}`.trim();
  }

  private resolveDayGroup(dateString: string | null): DayTreatmentGroup | null {
    if (!dateString) {
      return null;
    }

    const existing = this.dayGroupsByDate.get(dateString);
    if (existing) {
      return existing;
    }

    return {
      date: this.parseDateKey(dateString),
      dateString,
      periods: this.createEmptyPeriods(),
      totalCount: 0,
      completedCount: 0,
    };
  }

  private recalculateGroupCounts(group: DayTreatmentGroup): void {
    const total = this.periods.reduce(
      (sum, period) => sum + group.periods[period].length,
      0,
    );
    const completed = this.periods.reduce(
      (sum, period) =>
        sum + group.periods[period].filter((item) => item.isCompleted).length,
      0,
    );

    group.totalCount = total;
    group.completedCount = completed;
  }

  previousMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
    );
    this.generateCalendar();
    this.ensureSelectedDay();
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
    );
    this.generateCalendar();
    this.ensureSelectedDay();
  }

  selectCalendarDay(day: CalendarDay): void {
    if (!day.isCurrentMonth) {
      return;
    }
    this.selectedDateString = day.dateString;
    this.selectedDayGroup = this.resolveDayGroup(day.dateString);
    this.showDayPopup = true;
  }

  isSelectedCalendarDay(day: CalendarDay): boolean {
    return this.selectedDateString === day.dateString;
  }

  isTodayCalendarDay(day: CalendarDay): boolean {
    return day.dateString === this.getTodayDateKey();
  }

  getItemsForPeriod(
    group: DayTreatmentGroup | null,
    period: TreatmentPeriod,
  ): DosageItem[] {
    if (!group) {
      return [];
    }
    return group.periods[period];
  }

  private refreshCompletionState(): void {
    for (const dayGroup of this.listDayGroups) {
      this.recalculateGroupCounts(dayGroup);
    }

    this.generateCalendar();

    this.selectedDayGroup = this.resolveDayGroup(this.selectedDateString);
  }

  closeDayPopup(): void {
    this.showDayPopup = false;
  }

  onDayPopupBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDayPopup();
    }
  }

  goToAdjacentDay(step: number): void {
    if (!this.selectedDateString) {
      return;
    }

    const nextDate = this.parseDateKey(this.selectedDateString);
    nextDate.setDate(nextDate.getDate() + step);

    this.currentMonth = new Date(
      nextDate.getFullYear(),
      nextDate.getMonth(),
      1,
    );
    this.generateCalendar();

    this.selectedDateString = this.formatDateKey(nextDate);
    this.selectedDayGroup = this.resolveDayGroup(this.selectedDateString);
    this.showDayPopup = true;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showDayPopup) {
      this.closeDayPopup();
    }
  }

  getWeekDays(): string[] {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }

  getMonthYear(): string {
    return this.currentMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  switchViewMode(mode: 'calendar' | 'list'): void {
    this.viewMode = mode;
    if (mode !== 'calendar') {
      this.showDayPopup = false;
    }
  }

  get currentAndUpcomingListGroups(): DayTreatmentGroup[] {
    const todayKey = this.getTodayDateKey();
    const todayGroup = this.listDayGroups.find(
      (group) => group.dateString === todayKey,
    );
    const futureGroups = this.listDayGroups.filter(
      (group) => group.dateString > todayKey,
    );

    return todayGroup ? [todayGroup, ...futureGroups] : futureGroups;
  }

  get olderListGroups(): DayTreatmentGroup[] {
    const todayKey = this.getTodayDateKey();
    return this.listDayGroups
      .filter((group) => group.dateString < todayKey)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  isTodayListGroup(group: DayTreatmentGroup): boolean {
    return group.dateString === this.getTodayDateKey();
  }

  toggleOlderListGroups(): void {
    this.showOlderListGroups = !this.showOlderListGroups;
  }

  canToggleDose(dosage: DosageItem): boolean {
    return this.getDoseStatusMeta(dosage).canToggle;
  }

  getDoseStatusLabel(dosage: DosageItem): string {
    return this.getDoseStatusMeta(dosage).label;
  }

  getDoseStatusClass(dosage: DosageItem): DoseStatus {
    return this.getDoseStatusMeta(dosage).status;
  }

  getDoseStatusValue(dosage: DosageItem): -1 | 0 | 1 {
    return this.getDoseStatusMeta(dosage).value;
  }

  private getDoseStatusMeta(dosage: DosageItem): DoseStatusMeta {
    const todayKey = this.formatDateKey(new Date());
    const isToday = dosage.dateString === todayKey;
    const isPast = dosage.dateString < todayKey;
    const isFuture = dosage.dateString > todayKey;

    if (dosage.isCompleted) {
      return {
        status: 'taken',
        label: 'Taken',
        value: 1,
        canToggle: !isFuture,
      };
    }

    if (isPast) {
      return {
        status: 'missed',
        label: 'Missed',
        value: -1,
        canToggle: true,
      };
    }

    return {
      status: 'not-taken',
      label: 'Not Taken',
      value: 0,
      canToggle: isToday,
    };
  }

  toggleMedicineIntake(dosage: DosageItem): void {
    if (!this.canToggleDose(dosage)) {
      return;
    }

    const previousValue = dosage.isCompleted;
    dosage.isCompleted = !dosage.isCompleted;

    this.refreshCompletionState();

    this.userService
      .markMedicineIntake(this.patientId, dosage.id, dosage.isCompleted)
      .subscribe({
        next: () => {
          // Success, state already updated in the component
        },
        error: () => {
          dosage.isCompleted = previousValue;
          this.refreshCompletionState();
          this.errorMessage = 'Failed to update medicine intake status.';
        },
      });
  }

  private getTodayDateKey(): string {
    return this.formatDateKey(new Date());
  }
}
