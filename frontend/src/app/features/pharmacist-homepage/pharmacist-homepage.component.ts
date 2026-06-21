import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { RequestService } from '../../core/services/request.service';
import { StockService } from '../../core/services/stock.service';

@Component({
  selector: 'app-pharmacist',
  templateUrl: './pharmacist-homepage.component.html',
  styleUrls: ['./pharmacist-homepage.component.css'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class PharmacistHomepageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // User & Dashboard properties
  firstName = '';
  lastName = '';
  greeting = '';
  isChatbotOpen = false;
  
  // Stats data
  pendingRequests = 0;
  approvedRequests = 0;
  lowStockItems = 0;
  dispensedToday = 0;

  // Camera & Scan variables
  isCameraActive = false;
  capturedImage: string | null = null;
  isScanning = false;
  scanError = '';
  aiExplanation = '';
  mediaStream: MediaStream | null = null;

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private requestService: RequestService,
    private stockService: StockService
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadStats();
  }

  ngAfterViewInit(): void {
    console.log('PharmacistHomepageComponent view initialized');
  }

  loadUserInfo(): void {
    this.firstName = this.authService.getUserFirstName();
    this.lastName = this.authService.getUserLastName();
    this.greeting = this.getGreeting();
  }

  loadStats(): void {
    // Load pending requests
    this.requestService.getMyRequests().subscribe({
      next: (requests: any[]) => {
        this.pendingRequests = requests.filter(r => r.requestStatus === 'PENDING').length;
        this.approvedRequests = requests.filter(r => r.requestStatus === 'APPROVED').length;
      },
      error: (error: any) => console.error('Error loading requests:', error)
    });

    // Load low stock items
    this.stockService.getLowStock().subscribe({
      next: (items: any[]) => {
        this.lowStockItems = items.length;
      },
      error: (error: any) => console.error('Error loading stock:', error)
    });

    // Load dispensed today (placeholder)
    this.dispensedToday = Math.floor(Math.random() * 40) + 15;
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    const salutation = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return `${salutation}, ${this.firstName}!`;
  }

  onNewRequest(): void {
    this.router.navigate(['/pharmacist/requests']);
  }

  onCheckStock(): void {
    this.router.navigate(['/pharmacist/stock']);
  }

  onValidateDispense(): void {
    this.router.navigate(['/pharmacist/requests']);
  }

  toggleChatbot(): void {
    this.isChatbotOpen = !this.isChatbotOpen;
  }

  // ========== CAMERA & SCAN METHODS ==========

  /**
   * Start camera stream
   */
  startCamera(): void {
    this.scanError = '';
    console.log('Starting camera...');
    console.log('VideoElement available:', !!this.videoElement);

    if (!this.videoElement) {
      this.scanError = 'Video element not found. Please refresh the page.';
      console.error('VideoElement ViewChild is not initialized');
      return;
    }

    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    navigator.mediaDevices.getUserMedia(constraints as any)
      .then((stream: MediaStream) => {
        console.log('Camera stream received:', stream);
        this.mediaStream = stream;
        this.isCameraActive = true;

        const video = this.videoElement.nativeElement;
        video.srcObject = stream;

        // Ensure video plays
        video.onloadedmetadata = () => {
          console.log('Video metadata loaded, attempting to play');
          video.play().catch((error: any) => {
            console.error('Error playing video:', error);
            this.scanError = 'Failed to play video stream. Please try again.';
          });
        };
      })
      .catch((error: any) => {
        console.error('Camera access error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        if (error.name === 'NotAllowedError') {
          this.scanError = 'Camera permission denied. Please enable camera access in browser settings.';
        } else if (error.name === 'NotFoundError') {
          this.scanError = 'No camera device found. Please connect a camera.';
        } else if (error.name === 'NotReadableError') {
          this.scanError = 'Camera is in use by another application.';
        } else {
          this.scanError = 'Failed to access camera: ' + error.message;
        }
      });
  }

  /**
   * Stop camera stream
   */
  stopCamera(): void {
    console.log('Stopping camera...');
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      this.mediaStream = null;
    }
    if (this.videoElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
    this.isCameraActive = false;
    console.log('Camera stopped');
  }

  /**
   * Capture frame from video stream
   */
  captureFrame(): void {
    if (!this.videoElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    this.capturedImage = canvas.toDataURL('image/jpeg');
  }

  /**
   * Send captured image to AI for scanning and explanation
   */
  scanAndExplain(): void {
    if (!this.capturedImage) {
      this.scanError = 'Please capture an image first';
      return;
    }

    this.isScanning = true;
    this.scanError = '';
    this.aiExplanation = '';

    const base64String = this.capturedImage.split(',')[1];

    this.http.post(
      'http://localhost:8086/api/scan/scan-and-explain',
      { image: base64String },
      { responseType: 'text' }
    ).subscribe({
      next: (response: string) => {
        this.isScanning = false;
        this.aiExplanation = response;
        this.stopCamera();
      },
      error: (error: any) => {
        this.isScanning = false;
        console.error('Scan error:', error);
        this.scanError = error?.error?.message || 'Failed to scan medication. Please try again.';
      }
    });
  }

  /**
   * Clear all scan data
   */
  clearScan(): void {
    this.capturedImage = null;
    this.aiExplanation = '';
    this.scanError = '';
  }

  /**
   * Clean up on component destroy
   */
  ngOnDestroy(): void {
    console.log('Destroying PharmacistHomepageComponent');
    this.stopCamera();
  }
}