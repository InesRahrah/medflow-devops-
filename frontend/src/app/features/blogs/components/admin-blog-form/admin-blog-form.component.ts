import { Component, OnInit } from '@angular/core';
import { BlogService } from '../../services/blog.service';

@Component({
  selector: 'app-admin-blog-form',
  templateUrl: './admin-blog-form.component.html',
  styleUrls: ['./admin-blog-form.component.css']
})
export class AdminBlogFormComponent implements OnInit {

  blogs: any[] = [];
  filteredBlogs: any[] = [];
  searchTerm = '';
  selectedStatus = 'ALL';

  showDeleteConfirm = false;
  blogToDeleteId: number | null = null;

  showViewModal = false;
  selectedBlog: any = null;

  constructor(private blogService: BlogService) {}

  ngOnInit(): void {
    this.loadBlogs();
  }

  loadBlogs(): void {
    this.blogService.getAll().subscribe(data => {
      this.blogs = data || [];
      this.applyFilters();
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase();

    this.filteredBlogs = this.blogs.filter(blog =>
      (!term ||
        blog.title?.toLowerCase().includes(term) ||
        blog.authorName?.toLowerCase().includes(term) ||
        blog.summary?.toLowerCase().includes(term) ||
        blog.content?.toLowerCase().includes(term)
      ) &&
      (this.selectedStatus === 'ALL' ||
        blog.status === this.selectedStatus)
    );
  }

  filterStatus(status: string): void {
    this.selectedStatus = status;
    this.applyFilters();
  }

  getStatusCount(status: string): number {
    return this.blogs.filter(b => b.status === status).length;
  }

  viewBlog(blog: any): void {
    this.selectedBlog = blog;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
  }

  updateStatus(blog: any, status: string): void {
    if (blog.status === status) return;

    this.blogService.update(blog.id, { ...blog, status })
      .subscribe(() => this.loadBlogs());
  }

  confirmDeleteBlog(id: number): void {
    this.blogToDeleteId = id;
    this.showDeleteConfirm = true;
  }

  cancelDeleteBlog(): void {
    this.showDeleteConfirm = false;
  }

  deleteBlogConfirmed(): void {
    if (!this.blogToDeleteId) return;

    this.blogService.delete(this.blogToDeleteId)
      .subscribe(() => {
        this.showDeleteConfirm = false;
        this.loadBlogs();
      });
  }
}