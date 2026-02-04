import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAB-SmtmTXFMgt9NY06T40w5zxJsz2VYsc",
  authDomain: "ravi-tracker.firebaseapp.com",
  projectId: "ravi-tracker",
  storageBucket: "ravi-tracker.firebasestorage.app",
  messagingSenderId: "1023010880808",
  appId: "1:1023010880808:web:467e3169f39809154fe41d",
  measurementId: "G-D27V657F7L"
};

// VAPID key for FCM (from Firebase Console -> Cloud Messaging -> Web Push certificates)
// TODO: Replace with your own VAPID key
const VAPID_KEY = 'YOUR_VAPID_KEY';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize Firebase Cloud Messaging
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (error) {
  console.log('FCM not supported in this browser');
}

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) {
      console.log('FCM not available');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Get FCM token
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      console.log('FCM Token:', token);
      return token;
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
};

export { messaging };
export default app;
