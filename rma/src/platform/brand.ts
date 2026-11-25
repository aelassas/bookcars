// Platform display name, shared by server + client. White-label: never
// hardcode a customer's trademark. Override via NEXT_PUBLIC_PLATFORM_NAME.
export const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "MyCRM";
