export default {
    send: '/api/send-message',
    getMessages: '/api/messages/:userId/:page/:pageSize',
    getMessage: '/api/message/:messageId',
    delete: '/api/delete-message/:messageId',
    messageCounter: '/api/message-counter/:userId',
    markAsRead: '/api/mark-message-as-read/:messageId',
    markAsUnread: '/api/mark-message-as-unread/:messageId'
};