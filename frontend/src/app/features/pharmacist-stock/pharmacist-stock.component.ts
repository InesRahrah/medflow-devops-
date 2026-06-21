import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StockService } from '../../core/services/stock.service';
import { NgrokService } from '../../core/services/ngrok.service';
import { environment } from '../../../environments/environment';
import QRCode from 'qrcode';

@Component({
  selector: 'app-pharmacist-stock',
  templateUrl: './pharmacist-stock.component.html',
  styleUrls: ['./pharmacist-stock.component.css']
})
export class PharmacistStockComponent implements OnInit {

  stocks: any[] = [];
  selectedStock: any = null;
  showDetails = false;
  qrCodeDataUrl: string | null = null;
  qrCodeUrl: string = '';
  
  // Expose environment for template
  environment = environment;

  constructor(
    private service: StockService,
    private router: Router,
    private ngrokService: NgrokService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll() {
    this.service.getAll().subscribe(res => {
      this.stocks = res;
    });
  }

  loadLow() {
    this.service.getLowStock().subscribe(res => {
      this.stocks = res;
    });
  }

  // 👁️ VIEW STOCK DETAILS
  viewDetails(stock: any) {
    console.log("STOCK DATA:", stock);
    this.selectedStock = stock;
    this.showDetails = true;
    
    if (stock) {
      this.generateQRCode(stock);
    }
  }

  // 📱 GENERATE QR CODE
  generateQRCode(stock: any) {
    if (!stock?.product?.id) {
      console.error('Invalid stock or product ID');
      return;
    }

    const baseUrl = environment.baseUrl.replace(/\/$/, '');
    this.qrCodeUrl = `${baseUrl}/drug/${stock.product.id}`;

    QRCode.toDataURL(this.qrCodeUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 200,
      margin: 1
    })
    .then(url => this.qrCodeDataUrl = url)
    .catch(err => console.error('QR Code generation error:', err));
  }

 

  // ❌ CLOSE DETAILS MODAL
  closeDetails() {
    this.showDetails = false;
    this.selectedStock = null;
    this.qrCodeDataUrl = null;
  }

  // 🔄 NAVIGATE TO REQUESTS WITH PRODUCT
  reorderProduct(product: any) {
    this.router.navigate(['/pharmacist/requests'], {
      queryParams: {
        productId: product.id,
        productName: product.productName
      }
    });
  }

  // 📅 CALCULATE DAYS UNTIL EXPIRATION
  getExpirationDays(expirationDate: any): number {
    if (!expirationDate) return 0;
    const today = new Date();
    const expDate = new Date(expirationDate);
    const timeDiff = expDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  }

  // 🎨 GET COLOR CLASS FOR EXPIRATION DAYS
  getExpirationDaysClass(expirationDate: any): string {
    const days = this.getExpirationDays(expirationDate);
    if (days < 0) return 'text-danger'; // Expired
    if (days < 30) return 'text-warning'; // Less than 1 month
    if (days < 90) return 'text-info'; // Less than 3 months
    return 'text-success'; // More than 3 months
  }

  // 💾 DOWNLOAD QR CODE
  downloadQRCode() {
    if (!this.qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.href = this.qrCodeDataUrl;
    link.download = `QR_${this.selectedStock.product.id}.png`;
    link.click();
  }

  // 📋 COPY QR URL TO CLIPBOARD
  copyQRUrl() {
    if (!this.qrCodeUrl) return;
    
    navigator.clipboard.writeText(this.qrCodeUrl).then(() => {
      alert('✓ QR URL copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    });
  }
}