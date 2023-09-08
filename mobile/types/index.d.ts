type StackParams = {
    About: {
        d?: number
    }
    Booking: {
        d?: number
        id: string
    }
    Bookings: {
        d?: number
    }
    Cars: {
        d?: number
        pickupLocation: string
        dropOffLocation: string
        from: number
        to: number
    }
    ChangePassword: {
        d?: number
    }
    Checkout: {
        d?: number
        car: string
        pickupLocation: string
        dropOffLocation: string
        from: number
        to: number
    }
    Contact: {
        d?: number
    }
    ForgotPassword: {
        d?: number
    }
    Home: {
        d?: number
    }
    Notifications: {
        d?: number
    }
    Settings: {
        d?: number
    }
    SignIn: {
        d?: number
    }
    SignUp: {
        d?: number
    }
    ToS: {
        d?: number
    }
}

interface DrawerItem {
    name: string
    title: string
    iconName: string
    hideTitle?: boolean
    hidden?: boolean
}

interface BlobInfo {
    uri: string
    name: string
    type: string | null
}
