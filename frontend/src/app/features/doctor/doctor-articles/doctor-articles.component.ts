import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-doctor-articles',
  templateUrl: './doctor-articles.component.html',
  styleUrls: ['./doctor-articles.component.scss']
})
export class DoctorArticlesComponent implements OnInit {

  showForm = false;
  editingId: number | null = null;
  isEditMode = false;
  blogs: any[] = [];
  coverPreview = '';

  blog = {
    title: '',
    content: '',
    summary: '',
    category: '',
    authorId: '' as any,
    authorName: '',
    status: 'PUBLISHED',
    coverImageUrl: '',
    imageUrls: [] as string[],
    videoUrls: [] as string[],
    attachmentUrls: [] as string[],
    referenceLinks: [] as string[]
  };

  newImageUrl = '';
  newVideoUrl = '';
  newAttachmentUrl = '';
  newReferenceLink = '';

  imageMode: 'url' | 'file' = 'url';
  videoMode: 'url' | 'file' = 'url';
  attachmentMode: 'url' | 'file' = 'url';

  errors = {
    image: '',
    video: '',
    attachment: '',
    reference: ''
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadDoctorInfo();
    this.loadMyBlogs();
  }

  loadDoctorInfo(): void {
    const raw = localStorage.getItem('user_info') || '{}';
    const user = JSON.parse(raw);
    this.blog.authorId = user.id || user.userId || user.sub || null;
    this.blog.authorName = (user.firstName || user.firstname || '')
                         + ' ' + (user.lastName || user.lastname || '');
  }

  loadMyBlogs(): void {
    const raw = localStorage.getItem('user_info') || '{}';
    const user = JSON.parse(raw);
    const authorId = user.id || user.userId || user.sub;
    if (!authorId) return;
    this.http.get<any[]>('/api/v1/blogs/author/' + authorId).subscribe({
      next: (data) => this.blogs = data,
      error: (err) => console.error('Error loading blogs', err)
    });
  }

  onCoverUrlChange(): void {
    this.coverPreview = this.blog.coverImageUrl;
  }

  private isValidUrl(url: string): boolean {
    try { new URL(url); return true; }
    catch { return false; }
  }

  addItem(list: string[], value: string, clear: () => void): void {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      list.push(trimmed);
      clear();
    }
  }

  removeItem(list: string[], index: number): void {
    list.splice(index, 1);
  }

  addImage(): void {
    if (!this.isValidUrl(this.newImageUrl)) {
      this.errors.image = 'Please enter a valid URL (https://...)';
      return;
    }
    this.errors.image = '';
    this.addItem(this.blog.imageUrls, this.newImageUrl, () => this.newImageUrl = '');
  }

  addVideo(): void {
    if (!this.isValidUrl(this.newVideoUrl)) {
      this.errors.video = 'Please enter a valid URL (https://youtube.com/...)';
      return;
    }
    this.errors.video = '';
    this.addItem(this.blog.videoUrls, this.newVideoUrl, () => this.newVideoUrl = '');
  }

  addAttachment(): void {
    if (!this.isValidUrl(this.newAttachmentUrl)) {
      this.errors.attachment = 'Please enter a valid URL (https://...pdf)';
      return;
    }
    this.errors.attachment = '';
    this.addItem(this.blog.attachmentUrls, this.newAttachmentUrl, () => this.newAttachmentUrl = '');
  }

  addReference(): void {
    if (!this.isValidUrl(this.newReferenceLink)) {
      this.errors.reference = 'Please enter a valid URL (https://...)';
      return;
    }
    this.errors.reference = '';
    this.addItem(this.blog.referenceLinks, this.newReferenceLink, () => this.newReferenceLink = '');
  }

  onFileSelected(event: Event, type: 'image' | 'video' | 'attachment'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    if (type === 'image')      this.blog.imageUrls.push(objectUrl);
    if (type === 'video')      this.blog.videoUrls.push(objectUrl);
    if (type === 'attachment') this.blog.attachmentUrls.push(objectUrl);
    input.value = '';
  }

  submitBlog(): void { this.blog.status = 'PUBLISHED'; this.saveBlog(); }
  saveDraft(): void  { this.blog.status = 'DRAFT';     this.saveBlog(); }

  saveBlog(): void {
    if (this.isEditMode && this.editingId) {
      this.http.put('/api/v1/blogs/' + this.editingId, this.blog).subscribe({
        next: () => {
          this.showForm = false;
          this.isEditMode = false;
          this.editingId = null;
          this.resetForm();
          this.loadMyBlogs();
        },
        error: (err) => console.error('Error updating blog', err)
      });
    } else {
      this.http.post('/api/v1/blogs', this.blog).subscribe({
        next: () => {
          this.showForm = false;
          this.resetForm();
          this.loadMyBlogs();
        },
        error: (err) => console.error('Error saving blog', err)
      });
    }
  }

  deleteBlog(id: number): void {
    this.http.delete('/api/v1/blogs/' + id).subscribe({
      next: () => this.loadMyBlogs(),
      error: (err) => console.error('Error deleting blog', err)
    });
  }

  startEdit(b: any): void {
    this.isEditMode = true;
    this.editingId = b.id;
    this.blog = {
      title:          b.title || '',
      content:        b.content || '',
      summary:        b.summary || '',
      category:       b.category || '',
      authorId:       b.authorId,
      authorName:     b.authorName,
      status:         b.status || 'PUBLISHED',
      coverImageUrl:  b.coverImageUrl || '',
      imageUrls:      [...(b.imageUrls || [])],
      videoUrls:      [...(b.videoUrls || [])],
      attachmentUrls: [...(b.attachmentUrls || [])],
      referenceLinks: [...(b.referenceLinks || [])]
    };
    this.coverPreview = b.coverImageUrl || '';
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetForm(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.blog = {
      ...this.blog,
      title: '', content: '', summary: '', category: '',
      coverImageUrl: '',
      imageUrls: [], videoUrls: [], attachmentUrls: [], referenceLinks: []
    };
    this.coverPreview = '';
    this.newImageUrl = '';
    this.newVideoUrl = '';
    this.newAttachmentUrl = '';
    this.newReferenceLink = '';
    this.errors = { image: '', video: '', attachment: '', reference: '' };
    this.imageMode = 'url';
    this.videoMode = 'url';
    this.attachmentMode = 'url';
  }

  getYoutubeThumbnail(url: string): string {
    const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : '';
  }

  getFileName(url: string): string {
    return url.split('/').pop() || url;
  }

  
  
quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'font': [] }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ]
};



  
  
  
  
}