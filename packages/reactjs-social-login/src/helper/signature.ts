// /* eslint-disable camelcase */
// import { HmacSHA1, enc } from 'crypto-js'

// interface RequestTokenResponse {
//   oauth_token: string
//   oauth_token_secret: string
//   oauth_callback_confirmed?: string
// }

// export const requestTokenSignature = ({
//   method,
//   apiUrl,
//   callbackUrl,
//   consumerKey,
//   consumerSecret
// }: {
//   method: string
//   apiUrl: string
//   callbackUrl: string
//   consumerKey: string
//   consumerSecret: string
// }) => {
//   const params = {
//     oauth_consumer_key: consumerKey,
//     oauth_version: '1.0',
//     oauth_signature_method: 'HMAC-SHA1',
//     oauth_callback: callbackUrl,
//     oauth_timestamp: (Date.now() / 1000).toFixed(),
//     oauth_nonce: Math.random()
//       .toString(36)
//       .replace(/[^a-z]/, '')
//       .substr(2)
//   }

//   return makeSignature(params, method, apiUrl, consumerSecret)
// }

// export const accessTokenSignature = ({
//   consumerKey,
//   consumerSecret,
//   oauthToken,
//   oauthVerifier,
//   method,
//   apiUrl
// }: {
//   method: string
//   apiUrl: string
//   consumerKey: string
//   consumerSecret: string
//   oauthToken: string
//   oauthVerifier: string
// }) => {
//   const params = {
//     oauth_consumer_key: consumerKey,
//     oauth_version: '1.0',
//     oauth_signature_method: 'HMAC-SHA1',
//     oauth_token: oauthToken,
//     oauth_verifier: oauthVerifier,
//     oauth_timestamp: (Date.now() / 1000).toFixed(),
//     oauth_nonce: Math.random()
//       .toString(36)
//       .replace(/[^a-z]/, '')
//       .substr(2)
//   }

//   return makeSignature(params, method, apiUrl, consumerSecret, oauthVerifier)
// }

// export const profileSignature = ({
//   consumerKey,
//   consumerSecret,
//   oauthToken,
//   oauthTokenSecret,
//   method,
//   apiUrl
// }: {
//   method: string
//   apiUrl: string
//   consumerKey: string
//   consumerSecret: string
//   oauthToken: string
//   oauthTokenSecret: string
// }) => {
//   const params = {
//     oauth_consumer_key: consumerKey,
//     oauth_nonce: Math.random()
//       .toString(36)
//       .replace(/[^a-z]/, '')
//       .substr(2),
//     oauth_signature_method: 'HMAC-SHA1',
//     oauth_timestamp: (Date.now() / 1000).toFixed(),
//     oauth_token: oauthToken,
//     oauth_version: '1.0'
//   }

//   return makeSignature(params, method, apiUrl, consumerSecret, oauthTokenSecret)
// }

// const makeSignature = (
//   params: any,
//   method: string,
//   apiUrl: string,
//   consumerSecret: string,
//   oauthSecret = ''
// ) => {
//   const paramsBaseString = Object.keys(params)
//     .sort()
//     .reduce((prev: string, el: any) => {
//       return (prev += `&${el}=${params[el]}`)
//     }, '')
//     .substr(1)

//   const signatureBaseString = `${method.toUpperCase()}&${encodeURIComponent(
//     apiUrl
//   )}&${encodeURIComponent(paramsBaseString)}`

//   const signingKey = `${encodeURIComponent(
//     consumerSecret
//   )}&${encodeURIComponent(oauthSecret)}`

//   const oauthSignature = enc.Base64.stringify(
//     HmacSHA1(signatureBaseString, signingKey)
//   )

//   const paramsWithSignature = {
//     ...params,
//     oauth_signature: encodeURIComponent(oauthSignature)
//   }

//   return Object.keys(paramsWithSignature)
//     .sort()
//     .reduce((prev: string, el: any) => {
//       return (prev += `,${el}="${paramsWithSignature[el]}"`)
//     }, '')
//     .substr(1)
// }

// export const parseOAuthRequestToken = (responseText: string) =>
//   responseText.split('&').reduce((prev, el) => {
//     const [key, value] = el.split('=')
//     return { ...prev, [key]: value }
//   }, {} as RequestTokenResponse)
