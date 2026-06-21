import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private apiUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  getComments(blogId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/blogs/${blogId}/comments`);
  }

  addComment(blogId: string, content: string, userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/blogs/${blogId}/comments`, {
      content,
      userId
    });
  }

  deleteComment(commentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/comments/${commentId}`);
  }

  updateComment(commentId: number, content: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/comments/${commentId}`, { content });
  }
}