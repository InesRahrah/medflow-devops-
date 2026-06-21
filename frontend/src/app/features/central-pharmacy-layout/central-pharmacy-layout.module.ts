import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { CentralPharmacyLayoutComponent } from './central-pharmacy-layout.component';

@NgModule({
  declarations: [CentralPharmacyLayoutComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, SharedModule],
  exports: [CentralPharmacyLayoutComponent],
})
export class CentralPharmacyLayoutModule {}
