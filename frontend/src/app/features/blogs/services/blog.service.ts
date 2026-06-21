import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BlogPost } from '../models/blog-post.model';

@Injectable({ providedIn: 'root' })
export class BlogService {
  private apiUrl = 'http://localhost:8084/api/v1/blogs';
  private interactionUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  // ── Existing blog CRUD ────────────────────────────
  getAll(): Observable<BlogPost[]> {
    return this.http.get<BlogPost[]>(this.apiUrl);
  }

  getById(id: number): Observable<BlogPost> {
    return this.http.get<BlogPost>(`${this.apiUrl}/${id}`);
  }

  getByAuthor(authorId: any): Observable<BlogPost[]> {
    return this.http.get<BlogPost[]>(`${this.apiUrl}/author/${authorId}`);
  }

  getByStatus(status: string): Observable<BlogPost[]> {
    return this.http.get<BlogPost[]>(`${this.apiUrl}/status/${status}`);
  }

  search(keyword: string): Observable<BlogPost[]> {
    return this.http.get<BlogPost[]>(`${this.apiUrl}/search?keyword=${keyword}`);
  }

  create(blog: any): Observable<BlogPost> {
    return this.http.post<BlogPost>(this.apiUrl, blog);
  }

  update(id: number, blog: any): Observable<BlogPost> {
    return this.http.put<BlogPost>(`${this.apiUrl}/${id}`, blog);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ── Reactions ─────────────────────────────────────
  getReactions(blogId: number, userId: string): Observable<any> {
    return this.http.get(
      `${this.interactionUrl}/blogs/${blogId}/reactions`,
      { headers: { 'X-User-Id': userId } }
    );
  }

  addReaction(blogId: number, type: string, userId: string): Observable<any> {
    return this.http.post(
      `${this.interactionUrl}/blogs/${blogId}/reactions`,
      { type },
      { headers: { 'X-User-Id': userId } }
    );
  }

  removeReaction(blogId: number, userId: string): Observable<any> {
    return this.http.delete(
      `${this.interactionUrl}/blogs/${blogId}/reactions`,
      { headers: { 'X-User-Id': userId } }
    );
  }

  // ── Comments ──────────────────────────────────────
  getComments(blogId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.interactionUrl}/blogs/${blogId}/comments`
    );
  }

  addComment(
    blogId: number,
    content: string,
    userFullName: string,
    userId: string
  ): Observable<any> {
    return this.http.post(
      `${this.interactionUrl}/blogs/${blogId}/comments`,
      { content, userFullName },
      { headers: { 'X-User-Id': userId } }
    );
  }

  deleteComment(commentId: number, userId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.interactionUrl}/comments/${commentId}`,
      { headers: { 'X-User-Id': userId } }
    );
  }

  // ── Reposts ───────────────────────────────────────
  repost(blogId: number, visibility: string, patientId: string): Observable<any> {
    return this.http.post(
      `${this.interactionUrl}/blogs/${blogId}/repost`,
      { visibility },
      { headers: { 'X-User-Id': patientId } }
    );
  }

  removeRepost(blogId: number, patientId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.interactionUrl}/blogs/${blogId}/repost`,
      { headers: { 'X-User-Id': patientId } }
    );
  }

  updateRepostVisibility(repostId: number, visibility: string): Observable<any> {
    return this.http.patch(
      `${this.interactionUrl}/reposts/${repostId}/visibility`,
      { visibility }
    );
  }

  getPatientReposts(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.interactionUrl}/patients/${patientId}/reposts`
    );
  }

  getBlogById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
  // ── AI ────────────────────────────────────────────
getAiRecommendations(request: any): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/ai/recommend`, request);
}

chatWithAi(blogId: number, question: string): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/ai/chat`, { blogId, question });
}

incrementView(id: number)   { return this.http.post(`${this.apiUrl}/${id}/view`, {}); }



}