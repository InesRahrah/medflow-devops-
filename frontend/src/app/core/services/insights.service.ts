import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { StockService } from './stock.service';
import { RequestService } from './request.service';
import { AuthService } from './auth.service';

export interface InsightsData {
  totalProducts: number;
  lowStockItems: number;
  expiringItems: number;
  totalRequests: number;
  activeDeliveries: number;
  totalDeliveryAgents: number;
  requestsByStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
  deliveriesByStatus: {
    pending: number;
    inProgress: number;
    delivered: number;
  };
  drugTypeDistribution: DrugTypeData[];
  lowStockProducts: LowStockProduct[];
  expiringProducts: ExpiringProduct[];
  allStocks: AllStockProduct[];
  recentRequests: any[];
}

export interface DrugTypeData {
  type: string;
  count: number;
  percentage: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  availableQuantity: number;
  minThreshold: number;
  unit: string;
  expirationDate: string;
  type?: string;
}

export interface ExpiringProduct {
  id: string;
  name: string;
  expirationDate: string;
  availableQuantity: number;
  type?: string;
  daysUntilExpiry: number;
}

export interface AllStockProduct {
  id: string;
  name: string;
  availableQuantity: number;
  minThreshold: number;
  unit: string;
  expirationDate: string;
  type?: string;
}

@Injectable({
  providedIn: 'root',
})
export class InsightsService {
  private baseUrl = 'http://localhost:8086/api';

  constructor(
    private stockService: StockService,
    private requestService: RequestService,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders() {
    const userId = this.authService.getUserId();
    return {
      headers: new HttpHeaders({
        userId: userId || ''
      })
    };
  }

  getFullAnalytics(): Observable<InsightsData> {
    return forkJoin({
      allStock: this.stockService.getAll().pipe(catchError(() => of([]))),
      lowStock: this.stockService.getLowStock().pipe(catchError(() => of([]))),
      expiringItems: this.stockService.getItemsExpiringWithinDays(30).pipe(catchError(() => of([]))),
      allRequests: this.requestService.getAllForCentral().pipe(catchError(() => of([]))),
      deliveries: this.getDeliveries().pipe(catchError(() => of([]))),
      deliveryAgents: this.requestService.getDeliveryAgents().pipe(catchError(() => of([]))),
    }).pipe(
      map((data) =>
        this.processInsightsData(
          data.allStock,
          data.lowStock,
          data.expiringItems,
          data.allRequests,
          data.deliveries,
          data.deliveryAgents
        )
      ),
      catchError((error) => {
        console.error('Error fetching insights data:', error);
        return of(this.getEmptyInsightsData());
      })
    );
  }

  private processInsightsData(
    allStock: any[],
    lowStock: any[],
    expiringItems: any[],
    allRequests: any[],
    deliveries: any[],
    deliveryAgents: any[]
  ): InsightsData {
    const stockArray = Array.isArray(allStock) ? allStock : [];
    const lowStockArray = Array.isArray(lowStock) ? lowStock : [];
    const expiringArray = Array.isArray(expiringItems) ? expiringItems : [];
    const requestsArray = Array.isArray(allRequests) ? allRequests : [];
    const deliveriesArray = Array.isArray(deliveries) ? deliveries : [];
    const agentsArray = Array.isArray(deliveryAgents) ? deliveryAgents : [];

    console.log('📊 INSIGHTS DATA PROCESSING:');
    console.log('  Stock Items:', stockArray.length);
    console.log('  Low Stock Items:', lowStockArray.length);
    console.log('  Expiring Items:', expiringArray.length);
    console.log('  Total Requests:', requestsArray.length);
    console.log('  Deliveries:', deliveriesArray.length);
    console.log('  Delivery Agents:', agentsArray.length);

    // 📊 STATISTIQUES DE STOCK - CORRECTES
    const totalProducts = stockArray.length;
    const lowStockCount = lowStockArray.length; // déjà filtré par l'API
    const expiringCount = expiringArray.length; // déjà filtré par l'API

    // 📋 STATISTIQUES DE REQUÊTES - FILTRE PAR requestStatus
    const totalRequests = requestsArray.length;
    const requestsByStatus = {
      pending: requestsArray.filter((r) => {
        const status = String(r?.requestStatus || r?.status || '').toUpperCase().trim();
        return status === 'PENDING';
      }).length,
      approved: requestsArray.filter((r) => {
        const status = String(r?.requestStatus || r?.status || '').toUpperCase().trim();
        return status === 'APPROVED';
      }).length,
      rejected: requestsArray.filter((r) => {
        const status = String(r?.requestStatus || r?.status || '').toUpperCase().trim();
        return status === 'REJECTED';
      }).length,
    };

    // 🚚 STATISTIQUES DE LIVRAISONS - FILTRE PAR status
    const deliveriesByStatus = {
      pending: deliveriesArray.filter((d) => {
        const status = String(d?.deliveryStatus || d?.status || '').toUpperCase().trim();
        return status === 'PENDING';
      }).length,
      inProgress: deliveriesArray.filter((d) => {
        const status = String(d?.deliveryStatus || d?.status || '').toUpperCase().trim();
        return status === 'IN_PROGRESS' || status === 'IN-PROGRESS';
      }).length,
      delivered: deliveriesArray.filter((d) => {
        const status = String(d?.deliveryStatus || d?.status || '').toUpperCase().trim();
        return status === 'DELIVERED';
      }).length,
    };

    const activeDeliveries = deliveriesByStatus.pending + deliveriesByStatus.inProgress;
    const totalDeliveryAgents = agentsArray.length;

    console.log('📊 CALCULATED STATISTICS:');
    console.log('  Total Products:', totalProducts);
    console.log('  Low Stock:', lowStockCount);
    console.log('  Expiring:', expiringCount);
    console.log('  Total Requests:', totalRequests);
    console.log('  Requests Status:', requestsByStatus);
    console.log('  Deliveries Status:', deliveriesByStatus);
    console.log('  All Delivery Statuses in DB:', deliveriesArray.map((d: any) => d?.deliveryStatus || d?.status));
    console.log('  Active Deliveries:', activeDeliveries);
    console.log('  Delivery Agents:', totalDeliveryAgents);

    // 💊 DISTRIBUTION PAR TYPE DE DROGUE - FIABLE
    const drugTypeMap = new Map<string, number>();
    stockArray.forEach((item) => {
      const type = String(item?.product?.type || item?.type || 'UNKNOWN').trim();
      drugTypeMap.set(type, (drugTypeMap.get(type) || 0) + 1);
    });

    const drugTypeDistribution: DrugTypeData[] = Array.from(drugTypeMap.entries())
      .map(([type, count]) => ({
        type: type || 'UNKNOWN',
        count,
        percentage: totalProducts > 0 ? parseFloat(((count / totalProducts) * 100).toFixed(2)) : 0,
      }))
      .filter(d => d.type !== 'UNKNOWN' && d.count > 0) // Exclure inconnus et zéro
      .sort((a, b) => b.count - a.count);

    // 📉 PRODUITS EN STOCK BAS - FIABLES
    const lowStockProducts: LowStockProduct[] = lowStockArray
      .filter(item => item && item.id) // Filtrer items vides
      .map((item) => ({
        id: String(item?.id || ''),
        name: String(item?.product?.productName || item?.productName || 'No product linked').trim(),
        availableQuantity: Number(item?.availableQuantity || 0),
        minThreshold: Number(item?.minThreshold || 0),
        unit: String(item?.unit || 'Unités').trim(),
        expirationDate: String(item?.expirationDate || ''),
        type: String(item?.product?.type || item?.type || 'N/A').trim(),
      }))
      .sort((a, b) => a.availableQuantity - b.availableQuantity);
    console.log('📉 LOW STOCK PRODUCTS:', lowStockProducts);
    // ⏰ PRODUITS EXPIRANT BIENTÔT - FIABLES
    const expiringProducts: ExpiringProduct[] = expiringArray
      .filter(item => item && item.id && item.expirationDate) // Filtrer items vides/sans date
      .map((item) => {
        const expiryDate = new Date(String(item?.expirationDate || ''));
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: String(item?.id || ''),
          name: String(item?.product?.productName || item?.productName || 'No product linked').trim(),
          expirationDate: String(item?.expirationDate || ''),
          availableQuantity: Number(item?.availableQuantity || 0),
          type: String(item?.product?.type || item?.type || 'N/A').trim(),
          daysUntilExpiry: Math.max(0, daysUntilExpiry),
        };
      })
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    console.log('⏰ EXPIRING PRODUCTS:', expiringProducts);

    // 📝 REQUÊTES RÉCENTES - AVEC LES BONNES PROPRIÉTÉS
    const recentRequests = requestsArray
      .sort((a, b) => {
        const dateA = new Date(a?.request_date || a?.createdAt || 0).getTime();
        const dateB = new Date(b?.request_date || b?.createdAt || 0).getTime();
        return dateB - dateA; // Tri descendant (plus récent d'abord)
      })
      .slice(0, 5)
      .map((r) => {
        console.log('🏥 Request data:', r);
        return {
          id: r?.id || r?.requestId || '',
          hospitalName: r?.hospital_name || r?.hospitalName || r?.region || 'Unknown Hospital',
          status: String(r?.request_status || r?.requestStatus || r?.status || 'UNKNOWN').toUpperCase(),
          createdAt: r?.request_date || r?.createdAt || r?.requestDate || new Date().toISOString(),
        };
      });

    console.log('📝 RECENT REQUESTS:', recentRequests);
    console.log('🚚 DELIVERIES STATUS:', deliveriesByStatus);
    console.log('🚚 DELIVERIES ARRAY:', deliveriesArray);

    // 📦 TOUS LES STOCKS - COMPLET
    const allStocksData: AllStockProduct[] = stockArray
      .filter(item => item && item.id) // Filtrer items vides
      .map((item) => ({
        id: String(item?.id || ''),
        name: String(item?.product?.productName || item?.productName || 'No product linked').trim(),
        availableQuantity: Number(item?.availableQuantity || 0),
        minThreshold: Number(item?.minThreshold || 0),
        unit: String(item?.unit || 'Unités').trim(),
        expirationDate: String(item?.expirationDate || ''),
        type: String(item?.product?.type || item?.type || 'N/A').trim(),
      }));
    console.log('📦 ALL STOCKS:', allStocksData);

    return {
      totalProducts,
      lowStockItems: lowStockCount,
      expiringItems: expiringCount,
      totalRequests,
      activeDeliveries,
      totalDeliveryAgents,
      requestsByStatus,
      deliveriesByStatus,
      drugTypeDistribution,
      lowStockProducts,
      expiringProducts,
      allStocks: allStocksData,
      recentRequests,
    };
  }

  private getDeliveries(): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/deliveries`, this.getHeaders())
      .pipe(catchError(() => of([])));
  }

  private getEmptyInsightsData(): InsightsData {
    return {
      totalProducts: 0,
      lowStockItems: 0,
      expiringItems: 0,
      totalRequests: 0,
      activeDeliveries: 0,
      totalDeliveryAgents: 0,
      requestsByStatus: { pending: 0, approved: 0, rejected: 0 },
      deliveriesByStatus: { pending: 0, inProgress: 0, delivered: 0 },
      drugTypeDistribution: [],
      lowStockProducts: [],
      expiringProducts: [],
      allStocks: [],
      recentRequests: [],
    };
  }
}
