import { Component, OnInit, AfterViewInit } from '@angular/core';
import { StatsService } from '../../core/services/stats.service';
import Chart from 'chart.js/auto';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface StockData {
  productName: string;
  quantity: number;
  percentage: number;
}

interface StockStats {
  totalStock: number;
  averageStock: number;
  maxStock: number;
  minStock: number;
  criticalCount: number;
}

@Component({
  selector: 'app-stock-chart',
  templateUrl: './stock-chart.component.html',
  styleUrls: ['./stock-chart.component.css']
})
export class StockChartComponent implements OnInit, AfterViewInit {

  stockChartInstance: Chart | null = null;
  criticalChartInstance: Chart | null = null;

  // Light and professional colors
  colors = {
    stock: ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'],
    critical: ['#ef4444', '#f97316', '#eab308', '#ec4899'],
  };

  constructor(private statsService: StatsService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.loadRealData();
  }

  loadRealData() {
    this.statsService.getStock()
      .pipe(
        timeout(5000),
        catchError(error => {
          console.error('Error loading stock data:', error);
          return of([]);
        })
      )
      .subscribe(stock => {
        if (stock && stock.length > 0) {
          this.createStockChart(stock);
        }
      });

    this.statsService.getCritical()
      .pipe(
        timeout(5000),
        catchError(error => {
          console.error('Error loading critical products:', error);
          return of([]);
        })
      )
      .subscribe(critical => {
        if (critical && critical.length > 0) {
          this.createCriticalChart(critical);
        }
      });
  }

  createStockChart(data: StockData[]) {
    if (!data || data.length === 0) return;
    
    const labels = data.map(d => d.productName);
    const values = data.map(d => d.quantity);
    const total = values.reduce((a, b) => a + b, 0);
    const percentages = values.map(v => ((v / total) * 100).toFixed(1));

    const canvas = document.getElementById('stockChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.stockChartInstance) this.stockChartInstance.destroy();

    this.stockChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels.map((name, i) => `${name} (${percentages[i]}%)`),
        datasets: [{
          label: 'Quantity',
          data: values,
          backgroundColor: [
            '#6366f1',
            '#8b5cf6',
            '#d946ef',
            '#ec4899',
            '#f43f5e',
            '#f97316',
            '#eab308',
            '#10b981',
            '#06b6d4',
            '#0ea5e9',
            '#3b82f6',
            '#6366f1'
          ].slice(0, values.length),
          borderColor: '#fff',
          borderWidth: 4,
          hoverBorderWidth: 5,
          hoverOffset: 20
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
          duration: 1800,
          easing: 'easeInOutQuart',
          animateRotate: true,
          animateScale: false,
          delay: (ctx: any) => {
            let delay = 0;
            if (ctx.type === 'data') {
              delay = ctx.dataIndex * 120;
            }
            return delay;
          }
        },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#1f2937',
              font: { size: 12, weight: 'bold', family: "'Segoe UI', 'Roboto', sans-serif" },
              padding: 18,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(31, 41, 55, 0.95)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#3b82f6',
            borderWidth: 2,
            padding: 16,
            displayColors: true,
            cornerRadius: 10,
            caretPadding: 12,
            callbacks: {
              title: (context) => {
                return `📦 ${context[0].label.split(' (')[0]}`;
              },
              label: (context) => {
                const idx = context.dataIndex;
                const qty = context.raw;
                return [
                  ` 📊 Quantity: ${qty} units`,
                  ` 📈 Percentage: ${percentages[idx]}%`
                ];
              },
              afterLabel: (context) => {
                const value = context.raw as number;
                if (value < 20) return ' 🔴 CRITICAL';
                if (value < 50) return ' 🟠 LOW';
                return ' 🟢 OPTIMAL';
              }
            },
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 12 },
            bodySpacing: 8
          }
        }
      }
    });
  }

  createCriticalChart(data: StockData[]) {
    if (!data || data.length === 0) return;
    
    const labels = data.map(d => d.productName);
    const values = data.map(d => d.quantity);
    const total = values.reduce((a, b) => a + b, 0);
    const percentages = values.map(v => ((v / total) * 100).toFixed(1));

    const canvas = document.getElementById('criticalChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.criticalChartInstance) this.criticalChartInstance.destroy();

    this.criticalChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Critical Stock Levels',
          data: values,
          backgroundColor: [
            '#ef4444',
            '#f97316',
            '#eab308',
            '#ec4899',
            '#06b6d4',
            '#3b82f6'
          ].slice(0, values.length),
          borderColor: [
            '#dc2626',
            '#ea580c',
            '#ca8a04',
            '#be185d',
            '#0891b2',
            '#1d4ed8'
          ].slice(0, values.length),
          borderWidth: 3,
          borderRadius: 10,
          hoverBackgroundColor: [
            '#dc2626',
            '#ea580c',
            '#ca8a04',
            '#be185d',
            '#0891b2',
            '#1d4ed8'
          ].slice(0, values.length),
          hoverBorderWidth: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.85
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        animation: {
          duration: 1800,
          easing: 'easeInOutQuart',
          delay: (ctx: any) => {
            let delay = 0;
            if (ctx.type === 'data') {
              delay = ctx.dataIndex * 100;
            }
            return delay;
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#1f2937',
              font: { size: 13, weight: 'bold', family: "'Segoe UI', 'Roboto', sans-serif" },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(31, 41, 55, 0.95)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#ef4444',
            borderWidth: 2,
            padding: 16,
            displayColors: true,
            cornerRadius: 10,
            caretPadding: 12,
            callbacks: {
              title: (context) => {
                return `🚨 ${context[0].label}`;
              },
              label: (context) => {
                const idx = context.dataIndex;
                const qty = context.raw;
                return [
                  ` 📊 Quantity: ${qty} units`,
                  ` 📈 Percentage: ${percentages[idx]}%`,
                  ` ⚠️ CRITICAL LEVEL`
                ];
              }
            },
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 12 },
            bodySpacing: 8
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#1f2937',
              font: { weight: 'bold', size: 11 },
              padding: 8
            }
          },
          y: {
            beginAtZero: true,
            max: Math.max(...values) * 1.3,
            grid: {
              color: 'rgba(239, 68, 68, 0.1)',
              lineWidth: 1
            },
            ticks: {
              color: '#1f2937',
              font: { weight: 'bold', size: 12 },
              padding: 10
            }
          }
        }
      }
    });
  }

  private hexToRgb(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}