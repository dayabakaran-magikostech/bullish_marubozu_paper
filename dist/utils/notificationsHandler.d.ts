import { Message, NotificationOptions, Notification } from "../types/notificationsHandler";
/**
 * Handles error and log messages and sends them to the chat if specified.
 */
export declare function notificationHandler(message: Message, options: NotificationOptions, notifyOnChat?: boolean): Promise<boolean>;
/**
 * Sends a notification to the Google Chat webhook URL with the given title and
 * notification details. The notification object should contain the message to
 * be sent, the severity of the message, and the timestamp when the message was
 * triggered. If the notification object contains a severity, it will be
 * displayed in the Google Chat card. If the request to the webhook fails, the
 * function will retry up to 5 times with a 5 second delay between retries.
 */
export declare function sendNotification(title: string, notification: Notification, maxRetries?: number): Promise<void>;
//# sourceMappingURL=notificationsHandler.d.ts.map