import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleAccessGuard } from './core/guards/role-access.guard';
import { SetupGuard } from './core/guards/setup.guard';
import { UnauthorizedComponent } from './pages/unauthorized/unauthorized.component';
import { ComingSoonComponent } from './pages/coming-soon/coming-soon.component';
import { DrugDetailsComponent } from './features/drug-details/drug-details.component';
import { UserLayoutComponent } from './shared/layouts/user-layout/user-layout.component';

const routes: Routes = [
  // Drug Details Route (Standalone - accessible via QR code)
  { path: 'drug/:id', component: DrugDetailsComponent },


  // Public Pages with Layout
  {
    path: '',
    component: UserLayoutComponent,
    canActivate: [RoleAccessGuard],
    data: { layout: 'navbar', allowGuest: true },
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./pages/public/public.module').then((m) => m.PublicModule),
      },
    ],
  },

  // Auth
  {
    path: '',
    loadChildren: () =>
      import('./features/auth/auth.module').then((m) => m.AuthModule),
  },

  // Blogs (public, no role restriction)
  {
    path: 'blogs',
    loadChildren: () =>
      import('./features/blogs/blogs.module').then((m) => m.BlogsModule),
  },

  // Admin Module (Isolated Layout)
  {
    path: 'admin',
    canActivate: [SetupGuard, RoleAccessGuard],
    canMatch: [RoleAccessGuard],
    data: { roles: ['ADMIN'], layout: 'sidebar' },
    loadChildren: () =>
      import('./features/admin/admin.module').then((m) => m.AdminModule),
  },

  // Central Pharmacy Module (Isolated Layout - Independent)
  {
    path: 'central-pharmacy',
    canActivate: [SetupGuard, RoleAccessGuard],
    canMatch: [RoleAccessGuard],
    data: { roles: ['CENTRAL_PHARMACY'], layout: 'sidebar' },
    loadChildren: () =>
      import('./features/central-pharmacy/central-pharmacy.module').then(
        (m) => m.CentralPharmacyModule,
      ),
  },

  // User Application Module (Shared User Layout)
  {
    path: '',
    component: UserLayoutComponent,
    canActivate: [SetupGuard],
    canMatch: [RoleAccessGuard],
    children: [
      {
        path: 'dashboard',
        redirectTo: 'patient/dashboard',
        pathMatch: 'full',
      },
      {
        path: 'patient',
        canActivate: [SetupGuard],
        canMatch: [RoleAccessGuard],
        data: { roles: ['PATIENT'], layout: 'navbar' },
        loadChildren: () =>
          import('./features/patient/patient.module').then((m) => m.PatientModule),
      },
      {
        path: 'doctor',
        canActivate: [SetupGuard],
        canMatch: [RoleAccessGuard],
        data: { roles: ['DOCTOR'], source: 'staff', layout: 'sidebar' },
        loadChildren: () =>
          import('./features/doctor/doctor.module').then((m) => m.DoctorModule),
      },
      {
        path: 'nurse',
        canActivate: [SetupGuard],
        canMatch: [RoleAccessGuard],
        data: { roles: ['NURSE'], source: 'staff', layout: 'sidebar' },
        loadChildren: () =>
          import('./features/nurse/nurse.module').then((m) => m.NurseModule),
      },
      {
        path: 'hospital',
        canActivate: [SetupGuard],
        canMatch: [RoleAccessGuard],
        data: { roles: ['STAFF_ADMIN', 'HOSPITAL'], layout: 'sidebar' },
        loadChildren: () =>
          import('./features/hospital/hospital.module').then((m) => m.HospitalModule),
      },
      {
        path: 'lab',
        canActivate: [SetupGuard],
        canMatch: [RoleAccessGuard],
        data: { roles: ['LABO'], layout: 'sidebar' },
        loadChildren: () =>
          import('./features/lab/lab.module').then((m) => m.LabModule),
      },
      {
        path: 'insurance',
        canActivate: [SetupGuard],
        canMatch: [RoleAccessGuard],
        data: { roles: ['INSURANCE'], layout: 'sidebar' },
        loadChildren: () =>
          import('./features/insurance/insurance.module').then((m) => m.InsuranceModule),
      },
      {
        path: 'pharmacist',
        canActivate: [SetupGuard],
        canMatch: [RoleAccessGuard],
        data: { roles: ['PHARMACIST'], layout: 'sidebar' },
        loadChildren: () =>
          import('./features/pharmacist/pharmacist.module').then((m) => m.PharmacistModule),
      },
      {
        path: 'delivery',
        canActivate: [SetupGuard],
        canMatch: [RoleAccessGuard],
        data: { roles: ['DELIVERY_AGENT'], layout: 'sidebar' },
        loadChildren: () =>
          import('./features/delivery/delivery.module').then((m) => m.DeliveryModule),
      },
      {
        path: 'coming-soon',
        canActivate: [SetupGuard],
        canMatch: [RoleAccessGuard],
        component: ComingSoonComponent,
      },
    ],
  },

  // Legacy Redirects
  { path: 'patient-dashboard',          redirectTo: 'patient/dashboard',      pathMatch: 'full' },
  { path: 'doctor-dashboard',           redirectTo: 'doctor',                 pathMatch: 'full' },
  { path: 'lab-specialist-dashboard',   redirectTo: 'lab/dashboard',          pathMatch: 'full' },
  { path: 'manager-dashboard',          redirectTo: 'hospital/dashboard',     pathMatch: 'full' },
  { path: 'admin-dashboard',            redirectTo: 'admin/dashboard',        pathMatch: 'full' },
  { path: 'insurance-dashboard',        redirectTo: 'insurance/dashboard',    pathMatch: 'full' },
  { path: 'pharmacist-dashboard',       redirectTo: 'pharmacist/dashboard',   pathMatch: 'full' },
  { path: 'delivery-dashboard',         redirectTo: 'delivery/dashboard',     pathMatch: 'full' },
  { path: 'central-pharmacy-dashboard', redirectTo: 'central-pharmacy/dashboard', pathMatch: 'full' },

  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}