import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlogListComponent } from './components/blog-list/blog-list.component';
import { BlogDetailsComponent } from './components/blog-details/blog-details.component';
import { AdminBlogFormComponent } from './components/admin-blog-form/admin-blog-form.component';
import { BlogDetailComponent } from './blog-detail/blog-detail.component';

const routes: Routes = [
  {
    path: '',
    component: BlogListComponent
  },
  {
    path: 'details/:id',
    component: BlogDetailsComponent
  },

  { path: ':id', component: BlogDetailComponent }  ,
  
  {
    path: ':id',                           // ← ADD THIS → /blogs/1
    loadComponent: () =>
      import('./blog-detail/blog-detail.component')
        .then(m => m.BlogDetailComponent)
  },

  {
    path: 'admin/new',
    component: AdminBlogFormComponent
  }
];



@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BlogsRoutingModule {}