import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReactionSummary {
  counts: { [key: string]: number };
  userReaction: string | null;
  
}


@Injectable({ providedIn: 'root' })
export class ReactionService {
private apiUrl = 'http://localhost:8084/api/v1/blogs';

  constructor(private http: HttpClient) {}

  private headers(userId: string): HttpHeaders {
    return new HttpHeaders({ 'X-User-Id': userId });
  }

  getReactions(blogId: number, userId: string): Observable<ReactionSummary> {
    return this.http.get<ReactionSummary>(
      `${this.apiUrl}/${blogId}/reactions`,
      { headers: this.headers(userId) }
    );
  }

  react(blogId: number, userId: string, type: string): Observable<ReactionSummary> {
    return this.http.post<ReactionSummary>(
      `${this.apiUrl}/${blogId}/reactions`,
      { type },
      { headers: this.headers(userId) }
    );
  }

  removeReaction(blogId: number, userId: string): Observable<ReactionSummary> {
    return this.http.delete<ReactionSummary>(
      `${this.apiUrl}/${blogId}/reactions`,
      { headers: this.headers(userId) }
    );
  }
}