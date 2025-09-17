import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './config';
import { getMessaging, onMessage } from 'firebase/messaging';


// Only initialize Firebase in the browser
const firebaseApp = typeof window !== 'undefined' ? initializeApp(firebaseConfig) : null;
const messaging = getMessaging(firebaseApp || undefined);
const processedNotifications = new Set();
export const onMessageListener = () => {
    return new Promise((resolve) => {
      console.log('Message listening...');

      onMessage(messaging, async (payload) => {
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
          // Show notification using Notification API
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(payload.notification?.title || 'Notification', notificationOptions);
            } else {
              Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                  new Notification(payload.notification?.title || 'Notification', notificationOptions);
                }
              });
            }
          }
        }

        // Resolve the promise with the payload
        resolve(payload);
      });
    });
  };
  
export { firebaseApp };
