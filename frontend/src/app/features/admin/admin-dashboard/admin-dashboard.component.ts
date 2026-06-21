import { Component, OnInit } from '@angular/core';
import { BlogService } from '../../blogs/services/blog.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  adminName = 'System Admin';

  stats = [
    { label: 'Total Users', value: '1,284', change: '+12.5%', icon: 'fas fa-users', color: '#6366f1' },
    { label: 'Active Staff', value: '156', change: '+5.2%', icon: 'fas fa-user-md', color: '#a855f7' },
    { label: 'Departments', value: '24', change: '0%', icon: 'fas fa-hospital', color: '#ec4899' },
    { label: 'System Load', value: '42%', change: '-2.4%', icon: 'fas fa-microchip', color: '#10b981' }
  ];

  recentUsers = [
    { name: 'Dr. Sarah Wilson', email: 'sarah.w@medflow.com', role: 'DOCTOR', status: 'Active', date: '2 hours ago' },
    { name: 'John Doe', email: 'john.doe@gmail.com', role: 'PATIENT', status: 'Pending', date: '5 hours ago' },
    { name: 'Marc Evans', email: 'm.evans@pharma.com', role: 'PHARMACIST', status: 'Active', date: '1 day ago' },
    { name: 'Elena Rodriguez', email: 'elena.r@hosp.com', role: 'NURSE', status: 'Inactive', date: '2 days ago' }
  ];

  blogStats = { published: 0, draft: 0 };

  constructor(private blogService: BlogService) {}

  ngOnInit(): void {
    this.loadBlogStats();
  }

  loadBlogStats(): void {
    this.blogService.getAll().subscribe({
      next: (blogs: any[]) => {
        this.blogStats.published = blogs.filter(b => b.status === 'PUBLISHED').length;
        this.blogStats.draft = blogs.filter(b => b.status === 'DRAFT').length;
      },
      error: (err) => {
        console.error('Error loading blog stats', err);
      }
    });
  }
}


