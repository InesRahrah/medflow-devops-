import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { SetupAccountComponent } from './setup-account/setup-account.component';

const routes: Routes = [
  {
    path: 'login',
    component: AuthComponent,
    data: { animation: 'AuthPage' },
  },
  {
    path: 'register',
    component: AuthComponent,
    data: { animation: 'AuthPage' },
  },
  {
    path: 'setup-account',
    component: SetupAccountComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
