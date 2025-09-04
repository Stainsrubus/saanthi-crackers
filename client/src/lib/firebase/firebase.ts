import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './config';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore } from 'firebase/firestore';


// Only initialize Firebase in the browser
const firebaseApp = typeof window !== 'undefined' ? initializeApp(firebaseConfig) : null;
const messaging = getMessaging(firebaseApp);
const processedNotifications = new Set();
export const onMessageListener = () => {
    return new Promise((resolve) => {
      console.log('Message listening...');

      onMessage(messaging,async (payload) => {
        console.log('Foreground message received:', payload);

        const messageId = payload.data?.id || `${payload.messageId}-${Date.now()}`;
  
        if (processedNotifications.has(messageId)) {
          console.log('Duplicate notification ignored:', messageId);
          return;
        }
  
        processedNotifications.add(messageId);
  
        if (payload.notification) {
          const notificationOptions = {
            body: payload.notification.body,
            icon: '/favicon.png',
            data: payload.data,
            tag: payload.messageId,
          };
          try {
            // await navigator.serviceWorker.ready;
            // const registration = await navigator.serviceWorker.getRegistration();
            // if (registration) {
            //   await registration.showNotification(
            //     payload.notification.title,
            //     notificationOptions
            //   );
            // } else {
            //   console.error('Service Worker registration not found.');
            // }
          } catch (error) {
            console.error('Failed to show notification:', error);
          }
          if (document.visibilityState === 'visible' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(payload.notification.title, notificationOptions);
          }
        }

  
        // Resolve the promise with the payload
        resolve(payload);
      });
    });
  };
  
export { firebaseApp };
