import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-drug-details',
  templateUrl: './drug-details.component.html',
  styleUrls: ['./drug-details.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class DrugDetailsComponent implements OnInit {
  drugId: string | null = null;
  drugName: string = '';
  aiNotice: SafeHtml = '';
  aiNoticeText: string = ''; // Keep original text for clipboard
  isLoading: boolean = true;
  errorMessage: string = '';
  environment = environment;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.drugId = this.route.snapshot.paramMap.get('id');
    if (this.drugId) {
      this.loadDrugDetails();
    } else {
      this.errorMessage = 'Invalid drug ID';
      this.isLoading = false;
    }
  }

  loadDrugDetails(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // First, get the drug details to retrieve the name
    const apiUrl = this.getApiUrl();
    this.http.get<any>(`${apiUrl}/drugs/${this.drugId}`)
      .subscribe({
        next: (drug) => {
          this.drugName = drug.productName || 'Unknown Drug';
          this.fetchAINotice();
        },
        error: (err) => {
          console.error('Error fetching drug details:', err);
          this.errorMessage = 'Failed to load drug information. Please check your connection and try again.';
          this.isLoading = false;
        }
      });
  }

  fetchAINotice(): void {
    const apiUrl = this.getApiUrl();
    this.http.get(`${apiUrl}/drugs/${this.drugId}/ai-notice`, {
      responseType: 'text'
    }).subscribe({
      next: (notice) => {
        // Store original text for clipboard
        this.aiNoticeText = notice;
        // Sanitize HTML content for safe rendering
        this.aiNotice = this.sanitizer.bypassSecurityTrustHtml(notice);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching AI notice:', err);
        this.errorMessage = 'Failed to load drug notice. Please check your connection and try again.';
        this.isLoading = false;
      }
    });
  }

  private getApiUrl(): string {
  return 'http://192.168.0.156:8086/api';
}

  goBack(): void {
    this.router.navigate(['/pharmacist/stock']);
  }

  copyToClipboard(): void {
    if (!this.aiNoticeText) return;
    
    navigator.clipboard.writeText(this.aiNoticeText).then(() => {
      alert('✓ Drug notice copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    });
  }
}
