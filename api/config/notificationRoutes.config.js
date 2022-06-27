export default {
    notificationCounter: '/api/notification-counter/:userId',
    notify: '/api/notify',
    markAsRead: '/api/mark-notifications-as-read/:userId',
    markAsUnRead: '/api/mark-notifications-as-unread/:userId',
    delete: '/api/delete-notifications/:userId',
    getNotifications: '/api/notifications/:userId/:page/:size'
};