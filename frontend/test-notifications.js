// 🧪 TEST FILE - Comment forcer les alertes en développement

// Option 1: Ajouter au localStorage pour que Angular les recharge
localStorage.setItem('debug_alerts', JSON.stringify([
  {
    id: 1,
    title: "TEST: Aspirin Expiration",
    message: "Aspirin is expiring in less than 1 month",
    type: "warning",
    read: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: "TEST: Low Stock",
    message: "Ibuprofen stock is below minimum",
    type: "error",
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 3,
    title: "TEST: System Info",
    message: "New features are now available",
    type: "info",
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
]));

// Option 2: Vérifier ce qui est stocké
console.log('Stored alerts:', JSON.parse(localStorage.getItem('debug_alerts')));

// Option 3: Vérifier la structure du JWT
const token = localStorage.getItem('auth_token');
if (token) {
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  console.log('JWT Payload:', payload);
  console.log('userId/sub:', payload.sub);
}

// Option 4: Vérifier user_info
console.log('User Info:', JSON.parse(localStorage.getItem('user_info')));

// Option 5: Inspecter le DOM
console.log('Notification Bell Element:', document.querySelector('app-notification-bell'));
console.log('Alert Service Status:', {
  element: document.querySelector('app-notification-bell') ? '✅ Found' : '❌ Not found',
  navbar: document.querySelector('app-navbar') ? '✅ Found' : '❌ Not found'
});
