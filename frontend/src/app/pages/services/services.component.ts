import { Component } from '@angular/core';

@Component({
  selector: 'app-services',
  standalone: false,
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css']
})
export class ServicesComponent {
  services = [
    {
      slug: 'cardiology',
      name: 'Cardiology',
      desc: 'Advanced cardiac care with state-of-the-art diagnostics and treatment plans for all heart conditions.',
      color: '#FF6B6B',
      // Heart icon
      svgPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
    },
    {
      slug: 'dental',
      name: 'Dental Care',
      desc: 'Comprehensive dental services from routine check-ups to complex restorative and cosmetic procedures.',
      color: '#009CE8',
      // Smile / dental icon
      svgPath: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      slug: 'orthopedics',
      name: 'Orthopedics',
      desc: 'Expert treatment for bone, joint, and muscle conditions with minimally invasive procedures.',
      color: '#10B981',
      // Body / person icon
      svgPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    },
    {
      slug: 'eye-care',
      name: 'Eye Care',
      desc: 'Complete ophthalmology services including vision correction, cataract surgery, and retinal care.',
      color: '#8B5CF6',
      // Eye icon
      svgPath: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
    },
    {
      slug: 'neurology',
      name: 'Neurology',
      desc: 'Specialized care for brain and nervous system disorders with cutting-edge neurological treatments.',
      color: '#F59E0B',
      // Lightning / brain themed icon
      svgPath: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
    },
    {
      slug: 'pediatrics',
      name: 'Pediatrics',
      desc: 'Compassionate and specialized healthcare for infants, children, and adolescents.',
      color: '#EC4899',
      // Star / child icon
      svgPath: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
    },
  ];

  activeService = this.services[1]; // Dental
}
