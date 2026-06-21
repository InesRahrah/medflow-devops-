import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
})
export class AuthComponent implements OnInit {
  isRegister = false;
  isTransitioning = false;
  private transitionTimeout: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
  ) {}

  ngOnInit() {
    this.isRegister = this.router.url.includes('register');
  }

  toggleMode() {
    this.isRegister = !this.isRegister;
    const newPath = this.isRegister ? '/register' : '/login';
    this.location.replaceState(newPath);

    this.isTransitioning = false;
    setTimeout(() => {
      this.isTransitioning = true;
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = setTimeout(() => {
        this.isTransitioning = false;
      }, 1200);
    }, 10);
  }
}
