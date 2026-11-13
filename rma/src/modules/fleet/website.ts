export interface WebsiteCarPhoto {
  url: string;
  name: string;
}

export function publicPhotoUrl(url: string, origin = "https://crm.rma.network"): string | null {
  if (/^https:\/\//.test(url) || /^data:image\/(png|jpeg|webp);base64,/.test(url)) return url;
  if (/^\/site-cars\/[a-zA-Z0-9.-]+$/.test(url)) return `${origin}${url}`;
  return null;
}
