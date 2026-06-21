import { Component, OnInit, OnDestroy } from '@angular/core';
import { BlogService } from '../../services/blog.service';
import { BlogPost } from '../../models/blog-post.model';
import { BlogRepostService } from '../../services/blog-repost.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Location } from '@angular/common';




@Component({
  selector: 'app-blog-list',
  templateUrl: './blog-list.component.html',
  styleUrl: './blog-list.component.css'
})
export class BlogListComponent implements OnInit, OnDestroy {

  blogs: BlogPost[] = [];
  featuredBlogs: BlogPost[] = [];
  regularBlogs: BlogPost[] = [];
  searchTerm = '';
  loading = false;
  currentSlide = 0;
  private slideInterval: any;
  isSearching = false;

  // ── Repost state ──────────────────────────────────────
  isRepostedMap:    { [id: number]: boolean } = {};
  repostCountMap:   { [id: number]: number  } = {};
  repostLoadingMap: { [id: number]: boolean } = {};

  categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
    'DIABETES':      { bg: '#fff0f3', text: '#c9184a', dot: '#ff4d6d' },
    'CARDIOLOGY':    { bg: '#fff1e6', text: '#cc5803', dot: '#f4845f' },
    'NUTRITION':     { bg: '#f0fdf4', text: '#166534', dot: '#4ade80' },
    'MENTAL HEALTH': { bg: '#faf5ff', text: '#7c3aed', dot: '#a78bfa' },
    'PEDIATRICS':    { bg: '#eff6ff', text: '#1d4ed8', dot: '#60a5fa' },
    'DERMATOLOGY':   { bg: '#fdf4ff', text: '#a21caf', dot: '#e879f9' },
    'ORTHOPEDICS':   { bg: '#fff7ed', text: '#c2410c', dot: '#fb923c' },
    'TEST':          { bg: '#f8fafc', text: '#64748b', dot: '#94a3b8' },
    'TEST1':         { bg: '#f8fafc', text: '#64748b', dot: '#94a3b8' },
    'DEFAULT':       { bg: '#f0f9ff', text: '#0369a1', dot: '#38bdf8' }
  };

  gradients: string[] = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
  ];

  constructor(
    private blogService: BlogService,
    private repostService: BlogRepostService,
    private authService: AuthService,
    private location: Location 
  ) {}

  ngOnInit(): void {
    this.loadBlogs();
  }

  ngOnDestroy(): void {
    this.stopSlider();
  }

  // ── Get userId from token ─────────────────────────────
private getUserId(): string | null {
  return this.authService.getUserId();
}
  // ── Load blogs ────────────────────────────────────────
  loadBlogs(): void {
    this.loading = true;
    this.isSearching = false;
    this.blogService.getByStatus('PUBLISHED').subscribe({
      next: (data) => {
        this.blogs         = data;
        this.featuredBlogs = data.slice(0, 3);
        this.regularBlogs  = data;
        this.loading = false;
        this.startSlider();
        this.loadRepostStatuses(data);
      },
      error: () => { this.loading = false; }
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) { this.loadBlogs(); return; }
    this.loading = true;
    this.isSearching = true;
    this.stopSlider();
    this.blogService.search(this.searchTerm).subscribe({
      next: (data) => {
        this.blogs         = data;
        this.featuredBlogs = [];
        this.regularBlogs  = data;
        this.loading = false;
        this.loadRepostStatuses(data);
      },
      error: () => { this.loading = false; }
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.loadBlogs();
  }

  // ── Repost ────────────────────────────────────────────
loadRepostStatuses(blogs: BlogPost[]): void {
  const userId = this.getUserId();
  if (!userId) return;

  // initialize maps first so UI doesn't flash
  blogs.forEach(blog => {
    this.isRepostedMap[blog.id]  = this.isRepostedMap[blog.id]  ?? false;
    this.repostCountMap[blog.id] = this.repostCountMap[blog.id] ?? 0;
  });

  blogs.forEach(blog => {
    this.repostService.getStatus(blog.id, userId).subscribe({
      next: (res) => {
        this.isRepostedMap[blog.id]  = res.reposted;
        this.repostCountMap[blog.id] = res.count;
      }
    });
  });
}
onRepost(blog: BlogPost, event: Event): void {
  event.preventDefault();
  event.stopPropagation();

  const userId = this.getUserId();
  console.log('userId:', userId);
  console.log('blogId:', blog.id);
  console.log('already reposted:', this.isRepostedMap[blog.id]);
  console.log('loading:', this.repostLoadingMap[blog.id]);
  if (!userId || this.repostLoadingMap[blog.id]) return;

  this.repostLoadingMap[blog.id] = true;
  const alreadyReposted = this.isRepostedMap[blog.id];

  this.repostService.toggleRepost(blog.id, userId).subscribe({
    next: (res) => {
      if (alreadyReposted) {
        // was reposted → now removed (backend returns null or empty)
        this.isRepostedMap[blog.id]  = false;
        this.repostCountMap[blog.id] = Math.max(0, (this.repostCountMap[blog.id] || 1) - 1);
      } else {
        // was not reposted → now reposted (backend returns RepostResponseDTO)
        this.isRepostedMap[blog.id]  = true;
        this.repostCountMap[blog.id] = (this.repostCountMap[blog.id] || 0) + 1;
      }
      this.repostLoadingMap[blog.id] = false;
    },
    error: () => { this.repostLoadingMap[blog.id] = false; }
  });
}
  // ── Slider ────────────────────────────────────────────
  startSlider(): void {
    this.stopSlider();
    if (this.featuredBlogs.length > 1) {
      this.slideInterval = setInterval(() => this.nextSlide(), 5000);
    }
  }

  stopSlider(): void {
    if (this.slideInterval) clearInterval(this.slideInterval);
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.featuredBlogs.length;
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.featuredBlogs.length) % this.featuredBlogs.length;
  }

  goToSlide(i: number): void {
    this.currentSlide = i;
    this.startSlider();
  }

  // ── Helpers ───────────────────────────────────────────
  getCategoryStyle(cat: string) {
    const key = (cat || 'DEFAULT').toUpperCase();
    return this.categoryColors[key] || this.categoryColors['DEFAULT'];
  }

  getGradient(i: number): string {
    return this.gradients[i % this.gradients.length];
  }

  getReadTime(content: string): number {
    return Math.max(1, Math.ceil((content?.length || 0) / 1000));
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US',
      { month: 'short', day: 'numeric', year: 'numeric' });
  }
  stripHtml(html: string): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const text = tmp.textContent || tmp.innerText || '';
  return text.length > 120 ? text.substring(0, 120) + '...' : text;
}
goBack(): void {
  this.location.back();
}

}