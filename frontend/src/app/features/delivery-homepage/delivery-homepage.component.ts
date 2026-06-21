import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-delivery-homepage',
  templateUrl: './delivery-homepage.component.html',
  styleUrls: ['./delivery-homepage.component.css']
})
export class DeliveryHomepageComponent implements OnInit {

  name = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.name = this.authService.getUserFirstName() || 'Delivery Agent';
  }

}