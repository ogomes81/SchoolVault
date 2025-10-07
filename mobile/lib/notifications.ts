import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  documentId: string;
  title: string;
  status: 'processed' | 'failed';
}

class NotificationManager {
  private expoPushToken: string | null = null;

  // Initialize and request permissions
  async initialize(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return false;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      // Get the push token (skip if no project ID configured)
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (projectId) {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });
        
        this.expoPushToken = token.data;
        console.log('Push token:', this.expoPushToken);
      } else {
        console.log('No Expo project ID configured - skipping push notifications setup');
      }

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('document-processing', {
          name: 'Document Processing',
          description: 'Notifications for document upload and processing status',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2563eb',
        });
      }

      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // Get the current push token
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Schedule a local notification
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    delaySeconds: number = 0
  ): Promise<string | null> {
    try {
      const trigger = delaySeconds > 0 
        ? { type: 'timeInterval' as const, seconds: delaySeconds, repeats: false }
        : null;
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          badge: 1,
        },
        trigger: trigger as any,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // Show notification for document processing completion
  async notifyDocumentProcessed(documentTitle: string, status: 'processed' | 'failed') {
    const title = status === 'processed' 
      ? '✅ Document Processed'
      : '❌ Processing Failed';
    
    const body = status === 'processed'
      ? `"${documentTitle}" has been processed and is ready to view`
      : `Failed to process "${documentTitle}". Please try uploading again.`;

    return this.scheduleLocalNotification(title, body, {
      type: 'document_status',
      documentTitle,
      status,
    });
  }

  // Show notification for upload completion
  async notifyUploadComplete(documentTitle: string) {
    return this.scheduleLocalNotification(
      '📤 Upload Complete',
      `"${documentTitle}" uploaded successfully. Processing has started.`,
      {
        type: 'upload_complete',
        documentTitle,
      }
    );
  }

  // Clear all notifications
  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  // Clear notification badge
  async clearBadge() {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  // Add notification listeners
  addListeners() {
    // Listener for when a notification is received while the app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listener for when a user taps on or interacts with a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      const data = response.notification.request.content.data;
      if (data?.type === 'document_status') {
        // Handle navigation to document detail or dashboard
        this.handleNotificationTap(data);
      }
    });

    return {
      notificationListener,
      responseListener,
    };
  }

  // Remove notification listeners
  removeListeners(listeners: any) {
    if (listeners.notificationListener) {
      listeners.notificationListener.remove();
    }
    if (listeners.responseListener) {
      listeners.responseListener.remove();
    }
  }

  // Handle notification tap
  private handleNotificationTap(data: any) {
    // This could trigger navigation to specific screens
    // For now, just log the interaction
    console.log('User tapped notification with data:', data);
  }

  // Register device for push notifications with backend
  async registerDevice(userId: string): Promise<boolean> {
    if (!this.expoPushToken) {
      console.log('No push token available');
      return false;
    }

    try {
      // TODO: Send token to backend API to register device
      // const response = await apiClient.registerPushToken(this.expoPushToken, userId);
      console.log('Device registered for push notifications');
      return true;
    } catch (error) {
      console.error('Error registering device:', error);
      return false;
    }
  }

  // Unregister device from push notifications
  async unregisterDevice(): Promise<boolean> {
    if (!this.expoPushToken) {
      return true;
    }

    try {
      // TODO: Send request to backend to unregister device
      console.log('Device unregistered from push notifications');
      return true;
    } catch (error) {
      console.error('Error unregistering device:', error);
      return false;
    }
  }
}

export const notificationManager = new NotificationManager();