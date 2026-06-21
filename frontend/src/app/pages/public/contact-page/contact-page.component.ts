import { Component } from '@angular/core';

@Component({
  selector: 'app-contact-page',
  standalone: false,
  templateUrl: './contact-page.component.html',
  styleUrls: ['./contact-page.component.css']
})
export class ContactPageComponent {
  contactData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  submitted = false;
  isSending = false;

  onSubmit() {
    if (this.contactData.name && this.contactData.email && this.contactData.message) {
      this.isSending = true;

      // Simulate API call
      setTimeout(() => {
        this.isSending = false;
        this.submitted = true;

        // Reset form after 3 seconds or keep success message
        setTimeout(() => {
          this.resetForm();
        }, 5000);
      }, 1500);
    }
  }

  resetForm() {
    this.contactData = {
      name: '',
      email: '',
      subject: '',
      message: ''
    };
    this.submitted = false;
  }
}
