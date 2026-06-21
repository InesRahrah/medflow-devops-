import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { RequestService } from '../../core/services/request.service';
import { AuthService } from '../../core/services/auth.service';
import * as L from 'leaflet';
import { getRegionCoordinates, getTunisiaCenter, calculateDistance } from '../../shared/helpers/region-coords';

/**
 * Interface for Request data from backend
 */
interface RequestData {
  id?: number;
  region?: string;
  hospitalName?: string;
  latitude?: number;
  longitude?: number;
  destinationRegion?: string;
  [key: string]: any;
}

/**
 * Interface for Delivery data from backend
 */
interface DeliveryData {
  id?: number;
  region?: string;
  destinationRegion?: string;
  request?: RequestData;
  deliveryStatus?: string;
  hospitalName?: string;
  vehicleType?: string;
  trackingNumber?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

@Component({
  selector: 'app-delivery-tasks',
  templateUrl: './delivery-tasks.component.html',
  styleUrls: ['./delivery-tasks.component.css']
})
export class DeliveryTasksComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer') mapElement!: ElementRef;

  // Delivery data
  deliveries: any[] = [];
  isLoading = false;
  selectedDelivery: any = null;
  showModal = false;
  actionInProgress = false;

  // Map properties
  map!: L.Map;
  mapInitialized = false;
  userLocation: { lat: number; lng: number } | null = null;
  userMarker: L.Marker | null = null;
  destinationMarker: L.Marker | null = null;
  routingControl: any = null;
  hasGeolocation = false;

  // Stats
  stats = {
    pending: 0,
    completed: 0,
    total: 0
  };

  // Distance between user and delivery
  distance: number = 0;

  constructor(
    private requestService: RequestService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadMyDeliveries();
    this.initializeGeolocation();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeMap();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  /**
   * Initialize Leaflet Map
   */
  initializeMap(): void {
    if (this.mapInitialized || !this.mapElement) return;

    try {
      const container = this.mapElement.nativeElement;
      if (!container || container.offsetHeight === 0) {
        console.warn('Map container not ready');
        return;
      }

      this.map = L.map(container).setView([35.5, 10.0], 6);

      // OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(this.map);

      this.mapInitialized = true;

      // Add user location marker if available
      if (this.userLocation) {
        this.addUserMarker(this.userLocation.lat, this.userLocation.lng);
      }

      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  /**
   * Get user's current location
   */
  initializeGeolocation(): void {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      this.hasGeolocation = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        this.hasGeolocation = true;
        console.log('User location:', this.userLocation);
        
        // Update map if already initialized
        if (this.mapInitialized && this.map) {
          this.addUserMarker(this.userLocation.lat, this.userLocation.lng);
          this.map.setView([this.userLocation.lat, this.userLocation.lng], 12);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        this.hasGeolocation = false;
      }
    );
  }

  /**
   * Add user location marker
   */
  addUserMarker(lat: number, lng: number): void {
    if (!this.map) return;

    // Remove existing user marker
    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
    }

    const userIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    this.userMarker = L.marker([lat, lng], { icon: userIcon })
      .addTo(this.map)
      .bindPopup('<b>Your Location</b><br>Delivery Agent Position');
  }

  /**
   * Display delivery location on map
   * Uses real coordinates from delivery.request if available
   * Falls back to region-based coordinates
   */
  viewDeliveryLocation(delivery: any): void {
    if (!this.mapInitialized || !this.map) {
      console.error('Map not initialized');
      return;
    }

    // Try to use real coordinates first
    const lat = delivery?.request?.latitude;
    const lng = delivery?.request?.longitude;

    let finalLat: number;
    let finalLng: number;
    let name = '';

    // Priority 1: Use real coordinates if available
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      finalLat = lat;
      finalLng = lng;
      name = delivery?.request?.hospitalName || 'Hospital';
      console.log('Using real coordinates:', { lat: finalLat, lng: finalLng, name });
    } else {
      // Priority 2: Fallback to region-based coordinates
      const region = delivery?.request?.region || delivery?.region;
      const regionCoord = getRegionCoordinates(region);

      if (!regionCoord) {
        alert(`Region "${region}" not found in database`);
        return;
      }

      finalLat = regionCoord.latitude;
      finalLng = regionCoord.longitude;
      name = regionCoord.name;
      console.log('Using region-based coordinates:', regionCoord);
    }

    // Remove existing destination marker
    if (this.destinationMarker) {
      this.map.removeLayer(this.destinationMarker);
    }

    // Remove existing routing control/polyline
    if (this.routingControl) {
      if (this.map.hasLayer(this.routingControl)) {
        this.map.removeLayer(this.routingControl);
      }
      this.routingControl = null;
    }

    // Add destination marker
    const destIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    this.destinationMarker = L.marker([finalLat, finalLng], { icon: destIcon })
      .addTo(this.map)
      .bindPopup(`<b>${name}</b><br>Delivery Destination`);

    // Center map on destination
    this.map.fitBounds(
      L.latLngBounds(
        [finalLat, finalLng],
        [finalLat, finalLng]
      ).pad(0.2),
      { maxZoom: 14 }
    );

    // Add route and calculate distance if user location is available
    if (this.userLocation && this.hasGeolocation) {
      this.addRoute(
        this.userLocation.lat,
        this.userLocation.lng,
        finalLat,
        finalLng
      );
    }

    this.selectedDelivery = delivery;
    console.log('Displaying delivery location:', { name, lat: finalLat, lng: finalLng });
  }

  /**
   * Add routing between user and destination
   * Also calculates and stores distance
   */
  addRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): void {
    if (!this.map) return;

    try {
      // Simple polyline route
      const routeLine = L.polyline(
        [
          [startLat, startLng],
          [endLat, endLng]
        ],
        {
          color: '#FF9500',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 5'
        }
      ).addTo(this.map);

      // Calculate and store distance
      this.distance = calculateDistance(startLat, startLng, endLat, endLng);
      console.log(`Distance: ${this.distance.toFixed(2)} km`);

      this.routingControl = routeLine;
    } catch (error) {
      console.error('Error adding route:', error);
    }
  }

  /**
   * Load deliveries from API
   */
  loadMyDeliveries(): void {
    this.isLoading = true;
    this.requestService.getMyDeliveries().subscribe(
      (response: any) => {
        this.deliveries = response || [];
        // DEBUG: Log delivery structure to verify request fields
        if (this.deliveries.length > 0) {
          console.log('DELIVERY:', this.deliveries[0]);
          console.log('Request object:', this.deliveries[0]?.request);
          console.log('Latitude:', this.deliveries[0]?.request?.latitude);
          console.log('Longitude:', this.deliveries[0]?.request?.longitude);
          console.log('Hospital Name:', this.deliveries[0]?.request?.hospitalName);
        }
        this.updateStats();
        this.isLoading = false;
      },
      (error) => {
        console.error('Error loading deliveries:', error);
        this.isLoading = false;
      }
    );
  }

  /**
   * Update statistics
   */
  updateStats(): void {
    this.stats.total = this.deliveries.length;
    this.stats.pending = this.deliveries.filter(d => d.deliveryStatus === 'PENDING').length;
    this.stats.completed = this.deliveries.filter(d => d.deliveryStatus === 'COMPLETED').length;
  }

  acceptDelivery(id: number): void {
    this.actionInProgress = true;
    this.requestService.acceptDelivery(id).subscribe(
      (response) => {
        console.log('Delivery accepted:', response);
        this.loadMyDeliveries();
        this.actionInProgress = false;
      },
      (error) => {
        console.error('Error accepting delivery:', error);
        this.actionInProgress = false;
      }
    );
  }

  completeDelivery(id: number): void {
    this.actionInProgress = true;
    this.requestService.completeDelivery(id).subscribe(
      (response) => {
        console.log('Delivery completed:', response);
        this.loadMyDeliveries();
        this.actionInProgress = false;
        this.showModal = false;
      },
      (error) => {
        console.error('Error completing delivery:', error);
        this.actionInProgress = false;
      }
    );
  }

  openDeliveryDetails(delivery: any): void {
    this.selectedDelivery = delivery;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedDelivery = null;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return '#FFB74D';
      case 'ACCEPTED':
        return '#00A8E8';
      case 'COMPLETED':
        return '#66BB6A';
      case 'REJECTED':
        return '#EF5350';
      default:
        return '#9E9E9E';
    }
  }

  getVehicleType(delivery: any): string {
    return delivery.vehiculeType || delivery.vehicleType || delivery.vehicle || delivery.type || 'Not assigned';
  }

  /**
   * Get location label with smart fallback strategy
   * Priority:
   * 1. Region name (if exists)
   * 2. Hospital name (if exists)
   * 3. Location available (if coordinates exist)
   * 4. Unknown location (fallback)
   */
  getLocationLabel(delivery: DeliveryData | null): string {
    if (!delivery) return 'Unknown location';

    // Debug log
    console.log('[DeliveryTasks] Processing location for delivery:', {
      id: delivery.id,
      region: delivery?.request?.region || delivery?.region,
      hospital: delivery?.request?.hospitalName,
      coords: delivery?.request?.latitude && delivery?.request?.longitude ? 'available' : 'none',
      rawDelivery: delivery
    });

    // Priority 1: Try to get region
    const region = 
      delivery?.request?.region ||
      delivery?.region ||
      delivery?.destinationRegion ||
      delivery?.request?.destinationRegion;

    if (region && typeof region === 'string' && region.trim()) {
      return region.trim();
    }

    // Priority 2: Try hospital name
    const hospitalName = delivery?.request?.hospitalName || delivery?.hospitalName;
    if (hospitalName && typeof hospitalName === 'string' && hospitalName.trim()) {
      return `🏥 ${hospitalName.trim()}`;
    }

    // Priority 3: Check for GPS coordinates
    const hasCoordinates = 
      (delivery?.request?.latitude && delivery?.request?.longitude) ||
      (delivery?.latitude && delivery?.longitude);

    if (hasCoordinates) {
      return '📍 Location available';
    }

    // Priority 4: Fallback
    return 'Unknown location';
  }

  /**
   * Get location icon based on fallback strategy
   * Used to display different icons in UI
   */
  getLocationIcon(delivery: DeliveryData | null): string {
    if (!delivery) return '❌';

    // Has region
    const region = 
      delivery?.request?.region ||
      delivery?.region ||
      delivery?.destinationRegion ||
      delivery?.request?.destinationRegion;

    if (region && typeof region === 'string' && region.trim()) {
      return '🗺️';
    }

    // Has hospital
    if (delivery?.request?.hospitalName && typeof delivery?.request?.hospitalName === 'string') {
      return '🏥';
    }

    // Has coordinates
    if ((delivery?.request?.latitude && delivery?.request?.longitude) ||
        (delivery?.latitude && delivery?.longitude)) {
      return '📍';
    }

    return '❓';
  }

  /**
   * Check if location data is available (for UI visibility)
   */
  hasLocationData(delivery: DeliveryData | null): boolean {
    if (!delivery) return false;

    return !!(
      (delivery?.request?.region || delivery?.region) ||
      delivery?.request?.hospitalName ||
      (delivery?.request?.latitude && delivery?.request?.longitude) ||
      (delivery?.latitude && delivery?.longitude)
    );
  }

  /**
   * Get region name from delivery object (backward compatibility)
   * Supports multiple possible property paths from API response
   */
  getRegionName(delivery: any): string {
    // Try different possible paths for region data
    const region = 
      delivery?.request?.region ||
      delivery?.region ||
      delivery?.destinationRegion ||
      delivery?.request?.destinationRegion ||
      delivery?.stockRequest?.region ||
      delivery?.delivery?.region ||
      null;

    if (!region) {
      // If no region, try hospital name as fallback
      const hospitalName = delivery?.request?.hospitalName || delivery?.hospitalName;
      if (hospitalName) {
        console.log('[DeliveryTasks] Region not found, using hospital name:', hospitalName);
        return hospitalName;
      }
      console.warn('[DeliveryTasks] Region not found in delivery:', delivery);
      return 'N/A';
    }

    // Normalize region name (trim and uppercase)
    return typeof region === 'string' ? region.trim().toUpperCase() : region;
  }

}