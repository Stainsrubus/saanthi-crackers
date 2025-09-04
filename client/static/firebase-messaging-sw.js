console.log('Service worker initializing...');

try {
  importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');
  
  const firebaseConfig = {
    apiKey: 'AIzaSyDxkpAyYjGS_jC3abTHDfdAVozeUR_MKiU',
    authDomain: 'ecommerce-76923.firebaseapp.com',
    projectId: 'ecommerce-76923',
    storageBucket: 'ecommerce-76923.firebasestorage.app',
    messagingSenderId: '1075564064831',
    appId: '1:1075564064831:web:0e28c69c564ba6e9d4888a',
    measurementId: 'G-ZSPBRZFZ6N',
  };

  const app = firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  const processedNotifications = new Set();

console.log(messaging.onBackgroundMessage,'payload'); 




  messaging.onBackgroundMessage((payload) => {

    console.log('Received background message:', payload);
  
    // Customize notification
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/favicon.png',
      data: payload.data || {},
      tag: payload.messageId || `bg-${Date.now()}`,
      vibrate: [200, 100, 200]
    };
  
    // Show notification
    return self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => {
        console.log('Notification shown');
  globalThis.writableGlobalStore.hasNoti=true
        // Optional: Send message to all clients
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'NOTIFICATION_RECEIVED',
              payload: payload
            });
          });
        });
      });
  });
  

  self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.openWindow(url)
        .then(() => console.log('Window opened successfully'))
        .catch((error) => console.error('Error opening window:', error))
    );
  });

  console.log('Service worker initialized successfully');
} catch (error) {
  console.error('Service worker initialization failed:', error);
}
