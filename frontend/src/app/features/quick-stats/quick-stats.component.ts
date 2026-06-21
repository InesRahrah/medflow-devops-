import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-quick-stats',
  standalone: false,
  templateUrl: './quick-stats.component.html',
  styleUrls: ['./quick-stats.component.css'],
})
export class QuickStatsComponent {
  items = [
    {
      icon: 'M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      title: 'Opening Hours',
      lines: ['Mon–Fri: 8am – 9pm', 'Sat–Sun: 9am – 6pm'],
    },
    {
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      title: 'Appointment',
      lines: ['Easy online booking', 'Same-day slots available'],
    },
    {
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0 M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      title: 'Find Doctors',
      lines: ['200+ specialist doctors', 'Verified & experienced'],
    },
    {
      icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
      title: 'Find Locations',
      lines: ['35+ clinic locations', 'Nationwide coverage'],
    },
  ];
}
