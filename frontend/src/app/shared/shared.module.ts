import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Dashboard shared layout elements
import { QuickStatsComponent } from '../features/quick-stats/quick-stats.component';

// Public generic layout elements
import { NavbarComponent } from '../shared/components/navbar/navbar.component';
import { HeroComponent } from '../shared/components/hero/hero.component';
import { FooterComponent } from '../shared/components/footer/footer.component';
import { NotificationBellComponent } from '../shared/components/notification-bell/notification-bell.component';

// Components required by multiple modules (Patient Dashboard, Public Pages, etc)
import { ServicesComponent } from '../pages/services/services.component';
import { DoctorsComponent } from '../features/doctors/doctors.component';
import { DepartmentsComponent } from '../features/departments/departments.component';
import { AppointmentComponent } from '../features/appointments/appointment.component';
import { AppointmentModalComponent } from './components/appointment-modal/appointment-modal.component';
import { ProfileBannerComponent } from './components/profile-banner/profile-banner.component';
import { ProfileWizardComponent } from './components/profile-wizard/profile-wizard.component';
import { PreconsultationSetupBannerComponent } from './components/preconsultation-setup-banner/preconsultation-setup-banner.component';
import { CustomDropdownComponent } from './components/custom-dropdown/custom-dropdown.component';
import { CustomMultiDropdownComponent } from './components/custom-multi-dropdown/custom-multi-dropdown.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { SidebarTopBarComponent } from './components/sidebar-top-bar/sidebar-top-bar.component';
import { PatientChatWidgetComponent } from './components/patient-chat-widget/patient-chat-widget.component';
import { NotificationItemComponent } from './components/notification-item/notification-item.component';
import { UserLayoutComponent } from './layouts/user-layout/user-layout.component';
import { BodyScanSelectorComponent } from './components/body-scan-selector/body-scan-selector.component';
import { AssignTaskModalComponent } from './components/assign-task-modal/assign-task-modal.component';

@NgModule({
  declarations: [
    NotificationItemComponent,
    QuickStatsComponent,
    NavbarComponent,
    HeroComponent,
    FooterComponent,
    ServicesComponent,
    DoctorsComponent,
    DepartmentsComponent,
    AppointmentComponent,
    AppointmentModalComponent,
    ProfileBannerComponent,
    ProfileWizardComponent,
    PreconsultationSetupBannerComponent,
    CustomDropdownComponent,
    CustomMultiDropdownComponent,
    SidebarComponent,
    SidebarTopBarComponent,
    UserLayoutComponent,
    BodyScanSelectorComponent,
    AssignTaskModalComponent,
    PatientChatWidgetComponent,
  ],
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, NotificationBellComponent],
  exports: [
    NotificationItemComponent,
    NotificationBellComponent,
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    QuickStatsComponent,
    NavbarComponent,
    HeroComponent,
    FooterComponent,
    ServicesComponent,
    DoctorsComponent,
    DepartmentsComponent,
    AppointmentComponent,
    AppointmentModalComponent,
    ProfileBannerComponent,
    ProfileWizardComponent,
    PreconsultationSetupBannerComponent,
    CustomDropdownComponent,
    CustomMultiDropdownComponent,
    SidebarComponent,
    SidebarTopBarComponent,
    UserLayoutComponent,
    BodyScanSelectorComponent,
    AssignTaskModalComponent,
    PatientChatWidgetComponent,
  ],
})
export class SharedModule {}
