import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-doctors-page',
  templateUrl: './doctors-page.component.html',
})
export class DoctorsPageComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const doctorId = this.route.snapshot.queryParamMap.get('doctorId');
    if (doctorId) {
      this.router.navigate(['/doctors', doctorId], { replaceUrl: true });
    }
  }
}
