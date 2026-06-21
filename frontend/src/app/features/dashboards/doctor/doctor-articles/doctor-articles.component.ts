//  import { Component, OnInit } from '@angular/core';
//  import { BlogService } from '../../../blogs/services/blog.service';
//  import { BlogPost } from '../../../blogs/models/blog-post.model';

// @Component({
//   selector: 'app-doctor-articles',
//   templateUrl: './doctor-articles.component.html',
//   styleUrl: './doctor-articles.component.css'
//  })
//  export class DoctorArticlesComponent implements OnInit {

//    articles: BlogPost[] = [];
// loading = false;
//    showForm = false;
//   editingId: number | null = null;

//    form = {
//      authorId: 1 ,
//      title: '',
//     content: '',
//      tags: '',
//      status: 'DRAFT' as 'DRAFT' | 'PUBLISHED'
//    };

//   constructor(private blogService: BlogService) {}
//    ngOnInit(): void {
//      this.loadArticles();
//    }

//    loadArticles(): void {
//      this.loading = true;
//      this.blogService.getByAuthor(this.form.authorId).subscribe({
//        next: (data) => { this.articles = data; this.loading = false; },
//        error: () => { this.loading = false; }
//      });
//    }
//    openCreateForm(): void {
//      this.editingId = null;     this.form = { authorId: 1, title: '', content: '', tags: '', status: 'DRAFT' };
//      this.showForm = true;
//    }

//   openEditForm(article: BlogPost): void {
//     this.editingId = article.id!;
//     this.form = {
//       authorId: article.authorId,
//       title: article.title,
//       content: article.content,
//       tags: article.tags || '',
//       status: article.status
//     };
//     this.showForm = true;
//   }
//    saveArticle(): void {
//     if (this.editingId) {
//        this.blogService.update(this.editingId, this.form).subscribe({
//          next: () => { this.showForm = false; this.loadArticles(); }
//        });
//      } else {
//        this.blogService.create(this.form).subscribe({
//         next: () => { this.showForm = false; this.loadArticles(); }
//       });
//     }
//   }

//   cancelForm(): void {
//     this.showForm = false;
//   }
// }
