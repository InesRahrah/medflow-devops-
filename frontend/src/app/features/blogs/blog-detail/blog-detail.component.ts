import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BlogService } from '../services/blog.service';
import { AuthService } from '../../../core/services/auth.service';
import { BlogPost } from '../models/blog-post.model';
import { ReactionService, ReactionSummary } from '../services/reaction.service';

@Component({
  selector: 'app-blog-detail',
  templateUrl: './blog-detail.component.html',
  styleUrl: './blog-detail.component.css'
})
export class BlogDetailComponent implements OnInit {

  

  blog: BlogPost | null = null;
  loading = true;
  blogId = 0;
  heroGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  heroBgSize = 'auto';
  heroBgPosition = 'center';

  // Comments
  comments: any[] = [];
  newComment = '';
  commentLoading = false;
  showDeleteConfirm = false;
  commentToDelete: number | null = null;

  // AI Chat
  aiQuestion = '';
  aiLoading = false;
  aiError = '';
  chatHistory: { question: string; answer: string }[] = [];

  // User
  currentUser: { id: string | null; firstName: string; lastName: string } = {
    id: null, firstName: '', lastName: ''
  };

  categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
    'DIABETES':      { bg: '#fff0f3', text: '#c9184a', dot: '#ff4d6d' },
    'CARDIOLOGY':    { bg: '#fff1e6', text: '#cc5803', dot: '#f4845f' },
    'NUTRITION':     { bg: '#f0fdf4', text: '#166534', dot: '#4ade80' },
    'MENTAL HEALTH': { bg: '#faf5ff', text: '#7c3aed', dot: '#a78bfa' },
    'PEDIATRICS':    { bg: '#eff6ff', text: '#1d4ed8', dot: '#60a5fa' },
    'DERMATOLOGY':   { bg: '#fdf4ff', text: '#a21caf', dot: '#e879f9' },
    'DEFAULT':       { bg: '#f0f9ff', text: '#0369a1', dot: '#38bdf8' }
  };

  private gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
  ];

  reactionList = [
    { type: 'LIKE',  emoji: '👍', label: 'Like'  },
    { type: 'LOVE',  emoji: '❤️',  label: 'Love'  },
    { type: 'HAHA',  emoji: '😂', label: 'Haha'  },
    { type: 'WOW',   emoji: '😮', label: 'Wow'   },
    { type: 'SAD',   emoji: '😢', label: 'Sad'   },
    { type: 'ANGRY', emoji: '😡', label: 'Angry' },
  ];

  reactionCounts: { [key: string]: number } = {};
  userReaction: string | null = null;
  totalReactions = 0;
  reactionLoading = false;

  lightboxImg = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private blogService: BlogService,
    private authService: AuthService,
    private reactionService: ReactionService
  ) {}

  ngOnInit(): void {
    this.blogId = Number(this.route.snapshot.paramMap.get('id'));
    this.heroGradient = this.gradients[this.blogId % this.gradients.length];

    this.currentUser = {
      id:        this.authService.getUserId(),
      firstName: this.authService.getUserFirstName(),
      lastName:  this.authService.getUserLastName()
    };

    this.loadBlog();
    this.loadComments();
  }

  loadBlog(): void {
    this.loading = true;
    this.blogService.getById(this.blogId).subscribe({
      next: (data) => {
        this.blog = data;
        if (data.coverImageUrl) {
          this.heroGradient = `url('${data.coverImageUrl}')`;
          this.heroBgSize = 'cover';
          this.heroBgPosition = 'center';
        }
        this.loadReactions();
        this.loading = false;
        this.blogService.incrementView(this.blogId).subscribe();
      },
      error: (err) => {
        console.error('Blog load error:', err);
        this.loading = false;
      }
    });
  }

  loadComments(): void {
    this.blogService.getComments(this.blogId).subscribe({
      next: (data) => { this.comments = data ?? []; },
      error: ()    => { this.comments = []; }
    });
  }

  submitComment(): void {
    if (!this.newComment.trim() || !this.currentUser.id) return;
    this.commentLoading = true;

    const content      = this.newComment.trim();
    const userFullName = `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim();
    const userId       = this.currentUser.id;

    this.blogService.addComment(this.blogId, content, userFullName, userId).subscribe({
      next: (c) => {
        this.comments = [c, ...this.comments];
        this.newComment = '';
        this.commentLoading = false;
      },
      error: () => { this.commentLoading = false; }
    });
  }

  confirmDelete(commentId: number): void {
    this.commentToDelete = commentId;
    this.showDeleteConfirm = true;
  }

  deleteComment(): void {
    if (!this.commentToDelete) return;
    const userId = this.currentUser?.id ?? '';
    this.blogService.deleteComment(this.commentToDelete, userId).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== this.commentToDelete);
        this.showDeleteConfirm = false;
        this.commentToDelete = null;
      },
      error: () => {}
    });
  }

  askAi(): void {
    if (!this.aiQuestion.trim()) return;
    const q = this.aiQuestion.trim();
    this.aiQuestion = '';
    this.aiLoading = true;
    this.aiError = '';

    this.blogService.chatWithAi(this.blogId, q).subscribe({
      next: (res: any) => {
        const answer = res?.answer ?? res?.response ?? res?.message ?? JSON.stringify(res);
        this.chatHistory.push({ question: q, answer });
        this.aiLoading = false;
      },
      error: () => {
        this.aiError = 'AI service is unavailable. Please try again later.';
        this.aiLoading = false;
      }
    });
  }

  // ── Reactions ────────────────────────────────────

  loadReactions(): void {
    const userId = this.authService.getUserId() || '';
    if (!this.blog) return;
    this.reactionService.getReactions(this.blog.id, userId).subscribe({
      next: (data) => this.applyReactionData(data),
      error: () => {}
    });
  }

  applyReactionData(data: ReactionSummary): void {
    this.reactionCounts = data.counts || {};
    this.userReaction   = data.userReaction || null;
    this.totalReactions = Object.values(this.reactionCounts)
      .reduce((sum, v) => sum + v, 0);
  }

  getCount(type: string): number {
    return this.reactionCounts[type] || 0;
  }

  getReactionEmoji(type: string): string {
    return this.reactionList.find(r => r.type === type)?.emoji || '';
  }

  getReactionLabel(type: string): string {
    return this.reactionList.find(r => r.type === type)?.label || type;
  }

  onReact(type: string): void {
    if (this.reactionLoading) return;
    const userId = this.authService.getUserId();
    if (!userId || !this.blog) return;

    if (this.userReaction === type) {
      this.onRemoveReaction();
      return;
    }

    this.reactionLoading = true;
    this.reactionService.react(this.blog.id, userId, type).subscribe({
      next: (data) => { this.applyReactionData(data); this.reactionLoading = false; },
      error: () => { this.reactionLoading = false; }
    });
  }

  onRemoveReaction(): void {
    if (this.reactionLoading) return;
    const userId = this.authService.getUserId();
    if (!userId || !this.blog) return;

    this.reactionLoading = true;
    this.reactionService.removeReaction(this.blog.id, userId).subscribe({
      next: (data) => { this.applyReactionData(data); this.reactionLoading = false; },
      error: () => { this.reactionLoading = false; }
    });
  }

  // ── Helpers ──────────────────────────────────────

  getCategoryStyle(category: string): { bg: string; text: string; dot: string } {
    const key = (category || 'DEFAULT').toUpperCase();
    return this.categoryColors[key] ?? this.categoryColors['DEFAULT'];
  }

  getStatusClass(status: string): string {
    return (status || 'published').toLowerCase();
  }

  getFirstLetter(name: string | null | undefined): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  getReadTime(content: string): number {
    return Math.max(1, Math.ceil((content?.length || 0) / 1000));
  }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  goBack(): void { this.router.navigate(['/blogs']); }

linkCopied = false;

copyLink(): void {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    this.linkCopied = true;
    setTimeout(() => this.linkCopied = false, 2000); // reset after 2s
  }).catch(() => {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = url;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    this.linkCopied = true;
    setTimeout(() => this.linkCopied = false, 2000);
  });
}
  share(platform: string): void {
    const url   = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(this.blog?.title ?? '');
    const links: Record<string, string> = {
      twitter:  `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`
    };
    if (links[platform]) window.open(links[platform], '_blank');
  }

  openImage(url: string): void {
    this.lightboxImg = url;
  }

  getYoutubeThumbnail(url: string): string {
    const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : '';
  }

  getFileName(url: string): string {
    return url.split('/').pop() || url;
  }
  
}