import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { AuthComponent } from './auth/auth.component';
import { SetupAccountComponent } from './setup-account/setup-account.component';
import { FaceLoginComponent } from './face-login/face-login.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [LoginComponent, RegisterComponent, AuthComponent, SetupAccountComponent, FaceLoginComponent],
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, 
    AuthRoutingModule,
    SharedModule
  ],
})
export class AuthModule {}
