export type objectType = {
  [key: string]: any;
};

export type IResolveParams = {
  provider: string;
  data?: objectType;
};

export { default as LoginSocialAmazon } from './LoginSocialAmazon';
export { default as LoginSocialFacebook } from './LoginSocialFacebook';
export { default as LoginSocialGoogle } from './LoginSocialGoogle';
export { default as LoginSocialGithub } from './LoginSocialGithub';
export { default as LoginSocialInstagram } from './LoginSocialInstagram';
export { default as LoginSocialMicrosoft } from './LoginSocialMicrosoft';
export { default as LoginSocialLinkedin } from './LoginSocialLinkedin';
export { default as LoginSocialPinterest } from './LoginSocialPinterest';
export { default as LoginSocialTwitter } from './LoginSocialTwitter';
export { default as LoginSocialApple } from './LoginSocialApple';
export { default as LoginSocialTiktok } from './LoginSocialTiktok';
