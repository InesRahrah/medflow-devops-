import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BlogsRoutingModule } from './blogs-routing.module';
import { BlogListComponent } from './components/blog-list/blog-list.component';
import { BlogDetailsComponent } from './components/blog-details/blog-details.component';
import { AdminBlogFormComponent } from './components/admin-blog-form/admin-blog-form.component';
import { BlogDetailComponent } from './blog-detail/blog-detail.component';

@NgModule({
  declarations: [
    BlogListComponent,
    BlogDetailsComponent,
    AdminBlogFormComponent,
    BlogDetailComponent,
       
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BlogsRoutingModule
  ]
})
export class BlogsModule {}