export default {
    notificationCounter: '/api/notification-counter/:userId',
    notify: '/api/notify',
    markAsRead: '/api/mark-notification-as-read/:notificationId',
    markAsUnRead: '/api/mark-notification-as-unread/:notificationId',
    getNotifications: '/api/notifications/:userId/:page/:size',
    delete: '/api/delete-notification/:notificationId'
};