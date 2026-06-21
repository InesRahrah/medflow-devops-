export type LayoutType = 'navbar' | 'sidebar';

export interface NavLink {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
  section?: string;
}

export interface RoleConfig {
  label: string;
  baseRoute: string;
  layout: LayoutType;
  links: NavLink[];
}

export const ROLE_CONFIG: Record<string, RoleConfig> = {
  DOCTOR: {
    label: 'Doctor',
    baseRoute: '/doctor',
    layout: 'sidebar',
    links: [
      { label: 'Home', route: '/doctor', icon: 'fas fa-home', exact: true },
      { label: 'Appointments', route: '/doctor/dashboard', icon: 'fas fa-calendar-alt' },
      { label: 'Preconsultation', route: '/doctor/preconsultation/setup', icon: 'fas fa-notes-medical' },
      { label: 'Patients', route: '/doctor/patients', icon: 'fas fa-users' },
      { label: 'Profile', route: '/doctor/profile', icon: 'fas fa-user-circle' },
      { label: 'My Articles',     route: '/doctor/articles',              icon: 'fas fa-newspaper' }, // ✅ ADD THIS LINE

    ],
  },
  NURSE: {
    label: 'Nurse',
    baseRoute: '/nurse/dashboard',
    layout: 'sidebar',
    links: [
      { label: 'Nurse Panel', route: '/nurse/dashboard', icon: 'fas fa-home', exact: true },
      { label: 'My Rooms', route: '/nurse/my-rooms', icon: 'fas fa-door-open' },
      { label: 'Tasks', route: '/nurse/tasks', icon: 'fas fa-list-check' },
      { label: 'Patients', route: '/nurse/patients', icon: 'fas fa-users' },
      { label: 'Settings', route: '/nurse/settings', icon: 'fas fa-cog' },
    ],
  },
  HOSPITAL: {
    label: 'Hospital Manager',
    baseRoute: '/hospital/dashboard',
    layout: 'sidebar',
    links: [
      { label: 'Dashboard', route: '/hospital/dashboard', icon: 'fas fa-chart-line', exact: true },
      { label: 'Structure', route: '/hospital/hospital-structure', icon: 'fas fa-hospital' },
      { label: 'Equipment', route: '/hospital/equipment', icon: 'fas fa-tools' },
      { label: 'Departments', route: '/hospital/departments', icon: 'fas fa-building' },
      { label: 'Staff', route: '/hospital/staff', icon: 'fas fa-user-md' },
      { label: 'Profile', route: '/hospital/profile', icon: 'fas fa-hospital-user' },
    ],
  },
  MANAGER: {
    label: 'Hospital Manager',
    baseRoute: '/hospital/dashboard',
    layout: 'sidebar',
    links: [
      { label: 'Dashboard', route: '/hospital/dashboard', icon: 'fas fa-chart-line', exact: true },
      { label: 'Structure', route: '/hospital/hospital-structure', icon: 'fas fa-hospital' },
      { label: 'Equipment', route: '/hospital/equipment', icon: 'fas fa-tools' },
      { label: 'Departments', route: '/hospital/departments', icon: 'fas fa-building' },
      { label: 'Staff', route: '/hospital/staff', icon: 'fas fa-user-md' },
      { label: 'Profile', route: '/hospital/profile', icon: 'fas fa-hospital-user' },
    ],
  },
  STAFF_ADMIN: {
    label: 'Hospital Admin',
    baseRoute: '/hospital/dashboard',
    layout: 'sidebar',
    links: [
      { label: 'Dashboard', route: '/hospital/dashboard', icon: 'fas fa-chart-line', exact: true },
      { label: 'Structure', route: '/hospital/hospital-structure', icon: 'fas fa-hospital' },
      { label: 'Equipment', route: '/hospital/equipment', icon: 'fas fa-tools' },
      { label: 'Departments', route: '/hospital/departments', icon: 'fas fa-building' },
      { label: 'Staff', route: '/hospital/staff', icon: 'fas fa-user-md' },
      { label: 'Profile', route: '/hospital/profile', icon: 'fas fa-hospital-user' },
      { label: 'Blog Articles', route: '/admin/blogs', icon: 'fas fa-newspaper', section: 'ADMINISTRATION' },

    ],
  },
  LABO: {
    label: 'Laboratory',
    baseRoute: '/lab/dashboard',
    layout: 'sidebar',
    links: [
      { label: 'Dashboard', route: '/lab/dashboard', icon: 'fas fa-flask', exact: true },
      { label: 'Reports', route: '/lab/pending-reports', icon: 'fas fa-file-medical' },
      { label: 'Appointments', route: '/lab/appointments', icon: 'fas fa-vial' },
      { label: 'Profile', route: '/lab/profile', icon: 'fas fa-user-md' },
    ],
  },
  INSURANCE: {
    label: 'Insurance Officer',
    baseRoute: '/insurance/dashboard',
    layout: 'sidebar',
    links: [
      { label: 'Dashboard', route: '/insurance/dashboard', icon: 'fas fa-shield-alt', exact: true },
      { label: 'Claims Queue', route: '/insurance/claims-queue', icon: 'fas fa-clipboard-list' },
      { label: 'Profile', route: '/insurance/profile', icon: 'fas fa-user-tie' },
    ],
  },
  PHARMACIST: {
    label: 'Pharmacist',
    baseRoute: '/pharmacist/dashboard',
    layout: 'sidebar',
    links: [
      { label: 'Home', route: '/pharmacist', icon: 'fas fa-home', exact: true },
      { label: 'Dashboard', route: '/pharmacist/dashboard', icon: 'fas fa-chart-line' },
      { label: 'Stock', route: '/pharmacist/stock', icon: 'fas fa-pills' },
      { label: 'Requests', route: '/pharmacist/requests', icon: 'fas fa-file-medical' },
      { label: 'Profile', route: '/pharmacist/profile', icon: 'fas fa-user-circle' },
    ],
  },
  DELIVERY_AGENT: {
    label: 'Delivery Agent',
    baseRoute: '/delivery/dashboard',
    layout: 'sidebar',
    links: [
      { label: 'Home', route: '/delivery', icon: 'fas fa-home', exact: true },
      { label: 'Dashboard', route: '/delivery/dashboard', icon: 'fas fa-chart-line' },
      { label: 'Tasks', route: '/delivery/tasks', icon: 'fas fa-boxes' },
      { label: 'Profile', route: '/delivery/profile', icon: 'fas fa-user-circle' },
    ],
  },
  CENTRAL_PHARMACY: {
    label: 'Central Pharmacy',
    baseRoute: '/central-pharmacy/dashboard',
    layout: 'sidebar',
    links: [
      { label: 'Home', route: '/central-pharmacy', icon: 'fas fa-home', exact: true },
      { label: 'Dashboard', route: '/central-pharmacy/dashboard', icon: 'fas fa-chart-line' },
      { label: 'Requests', route: '/central-pharmacy/requests', icon: 'fas fa-inbox' },
      { label: 'Profile', route: '/central-pharmacy/profile', icon: 'fas fa-user-circle' },
    ],
  },
  ADMIN: {
    label: 'Administrator',
    baseRoute: '/admin/dashboard',
    layout: 'sidebar',
    links: [
      { label: 'Dashboard', route: '/admin/dashboard', icon: 'fas fa-th-large', exact: true, section: 'OVERVIEW' },
      { label: 'Analytics', route: '/admin/analytics', icon: 'fas fa-chart-line', section: 'OVERVIEW' },

      { label: 'Users', route: '/admin/users', icon: 'fas fa-users', section: 'ADMINISTRATION' },
      { label: 'Staff', route: '/admin/staff', icon: 'fas fa-user-md', section: 'ADMINISTRATION' },
      { label: 'Departments', route: '/admin/departments', icon: 'fas fa-hospital-alt', section: 'ADMINISTRATION' },
      { label: 'Blog Articles', route: '/admin/blogs', icon: 'fas fa-newspaper', section: 'ADMINISTRATION' },

      { label: 'Hospitals', route: '/admin/hospitals', icon: 'fas fa-hospital', section: 'PLATFORM' },

      { label: 'Appointments', route: '/admin/appointments', icon: 'fas fa-calendar-check', section: 'OPERATIONS' },
      { label: 'Insurance', route: '/admin/insurance', icon: 'fas fa-shield-alt', section: 'OPERATIONS' },

      { label: 'PCT (Suppliers)', route: '/admin/pct', icon: 'fas fa-truck-loading', section: 'SUPPLY' },
      { label: 'Pharmacy Insights', route: '/admin/pharmacy', icon: 'fas fa-pills', section: 'SUPPLY' },

      { label: 'Settings', route: '/admin/settings', icon: 'fas fa-cog', section: 'SYSTEM CONTROL' },
      { label: 'Logs', route: '/admin/logs', icon: 'fas fa-file-alt', section: 'SYSTEM CONTROL' },

      

    ],
  },
  PATIENT: {
    label: 'Patient',
    baseRoute: '/patient/dashboard',
    layout: 'navbar',
    links: [], // PATIENT doesn't have a sidebar by default in the current logic
  },
  UNKNOWN: {
    label: 'User',
    baseRoute: '/',
    layout: 'navbar',
    links: [],
  },
};
