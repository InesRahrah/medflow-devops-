import { Component } from '@angular/core';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  template: `
    <section style="padding: 3rem; text-align: center;">
      <h1>Unauthorized</h1>
      <p>You do not have permission to access this page.</p>
    </section>
  `,
})
export class UnauthorizedComponent {}
