import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BlogRepostService {

  private api = '/api/v1';

  constructor(private http: HttpClient) {}

toggleRepost(blogId: number, patientId: string): Observable<any> {
  return this.http.post<any>(
    `${this.api}/blogs/${blogId}/repost`,
    { patientId },
    { headers: { 'X-User-Id': patientId } }
  );
}

removeRepost(blogId: number, userId: string): Observable<any> {
  return this.http.delete(`${this.api}/blogs/${blogId}/repost`, {
    headers: { 'X-User-Id': userId }
  });
}

getPatientReposts(patientId: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.api}/reposts/patient/${patientId}`, {
    headers: { 'X-User-Id': patientId }
  });
}

updateRepostVisibility(repostId: number, visibility: string, userId: string): Observable<any> {
  return this.http.patch(
    `${this.api}/reposts/${repostId}/visibility`,
    { visibility },
    { headers: { 'X-User-Id': userId } }
  );
}

getStatus(blogId: number, patientId: string): Observable<{ reposted: boolean; count: number }> {
  return this.http.get<any>(
    `${this.api}/blogs/${blogId}/repost/status`,
    { headers: { 'X-User-Id': patientId } }
  );
}
}