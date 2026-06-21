import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero',
  standalone: false,
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.css']
})
export class HeroComponent {
  stats = [
    { value: '15K+', label: 'Happy Patients' },
    { value: '200+', label: 'Expert Doctors' },
    { value: '25+', label: 'Departments' },
    { value: '98%', label: 'Success Rate' },
  ];
}
