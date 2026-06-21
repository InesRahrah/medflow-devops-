import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: false,
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  links = {
    company: ['About Us', 'Our Team', 'Careers', 'News & Blog'],
    services: ['Cardiology', 'Neurology', 'Dental Care', 'Orthopedics', 'Ophthalmology'],
    support: ['Patient Portal', 'Insurance', 'FAQ', 'Contact Us', 'Privacy Policy'],
  };
}
