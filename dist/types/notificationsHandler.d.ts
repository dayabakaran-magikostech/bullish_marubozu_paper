export type Message = string | Record<string, any> | Record<string, any>[];
export type NotificationSeverity = 'High' | 'Medium' | 'Low';
export type NotificationOptions = {
    module?: string;
    severity?: NotificationSeverity;
    type?: 'Info' | 'Error';
};
export type Notification = {
    message: Message;
    severity?: NotificationSeverity;
    timestamp: string;
};
//# sourceMappingURL=notificationsHandler.d.ts.map