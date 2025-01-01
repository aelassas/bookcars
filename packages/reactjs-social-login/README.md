
# reactjs-social-login

> Group social login for ReactJS
>
> 1. Facebook
> 2. Google
> 3. Linkedin
> 4. Github
> 5. Microsoft
> 6. Amazon
> 7. Instagram
> 8. Pinterest
> 9. Twitter
> 10. Apple
> 11. Tiktok

This repository is all in one, includes multiple platform for social login, is written by TypeScript and React Hooks, tree-shakeable, zero dependencies, extremely lightweight.
You can customize any style UI as you like.

Reactjs Social Login is an HOC which provides social login through multiple providers.

## **Currently supports Amazon, Facebook, GitHub, Google, Instagram, Linkedin, Pinterest, Twitter, Microsoft, Apple, Tiktok as providers (more to come!)**

[![npm download](https://img.shields.io/npm/dm/reactjs-social-login.svg?style=flat)](https://www.npmjs.com/package/reactjs-social-login)
[![npm bundle zip](https://img.shields.io/bundlephobia/minzip/reactjs-social-login?style=flat)](https://www.npmjs.com/package/reactjs-social-login)
[![node version](https://img.shields.io/badge/node.js-%3E=_6-green.svg?style=flat)](http://nodejs.org/download/)
[![NPM](https://img.shields.io/npm/v/reactjs-social-login.svg)](https://www.npmjs.com/package/reactjs-social-login)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

![img-description](./screenshot.png)
<!-- ![img-description](./gif.gif) -->

## Install

```bash
npm install --save reactjs-social-login
```

<br/>

## Demo

[Online Demo](https://react-social-login.netlify.app)

<br/>

## Example code

[Code Demo](https://github.com/cuongdevjs/reactjs-social-login/blob/master/example/src/App.tsx)

<br />

## Contribute / Testing

Clone project, open terminal and type these commands

```bash
npm install
```

```bash
npm run start
```

then go to directory /example, add .env.development by following format

````bash
NODE_ENV=development
REACT_APP_FB_APP_ID=
REACT_APP_GG_APP_ID=
REACT_APP_AMAZON_APP_ID=
REACT_APP_INSTAGRAM_APP_ID=
REACT_APP_INSTAGRAM_APP_SECRET=
REACT_APP_MICROSOFT_APP_ID=
REACT_APP_LINKEDIN_APP_SECRET=
REACT_APP_LINKEDIN_APP_ID=
REACT_APP_GITHUB_APP_ID=
REACT_APP_GITHUB_APP_SECRET=
REACT_APP_PINTEREST_APP_ID=
REACT_APP_PINTEREST_APP_SECRET=
REACT_APP_TWITTER_APP_ID=
REACT_APP_TWITTER_V2_APP_KEY=
REACT_APP_TWITTER_V2_APP_SECRET=
REACT_APP_APPLE_ID=
REACT_APP_TIKTOK_CLIENT_KEY=
````

and on directory /example, then open another terminal, type these commands

```shell
npm run start
```

You can then view the demo at <https://localhost:3000>.

<br/>

## How to use

<details>
  <summary>Typescript Version</summary>

  ````tsx
  import React, { useCallback, useState } from 'react'
  import './app.css'
  import { User } from './User' // component display user (see detail on /example directory)
  import {
    LoginSocialGoogle,
    LoginSocialAmazon,
    LoginSocialFacebook,
    LoginSocialGithub,
    LoginSocialInstagram,
    LoginSocialLinkedin,
    LoginSocialMicrosoft,
    LoginSocialPinterest,
    LoginSocialTwitter,
    LoginSocialApple,
    LoginSocialTiktok,
    IResolveParams,
  } from 'reactjs-social-login'

  // CUSTOMIZE ANY UI BUTTON
  import {
    FacebookLoginButton,
    GoogleLoginButton,
    GithubLoginButton,
    AmazonLoginButton,
    InstagramLoginButton,
    LinkedInLoginButton,
    MicrosoftLoginButton,
    TwitterLoginButton,
    AppleLoginButton,
  } from 'react-social-login-buttons'

  import { ReactComponent as PinterestLogo } from './assets/pinterest.svg'
  import { ReactComponent as TiktokLogo } from './assets/tiktok.svg'

  // REDIRECT URL must be same with URL where the (reactjs-social-login) components is locate
  // MAKE SURE the (reactjs-social-login) components aren't unmounted or destroyed before the ask permission dialog closes
  const REDIRECT_URI = window.location.href;

  const App = () => {
    const [provider, setProvider] = useState('')
    const [profile, setProfile] = useState<any>()

    const onLoginStart = useCallback(() => {
      alert('login start')
    }, [])

    const onLogoutSuccess = useCallback(() => {
      setProfile(null)
      setProvider('')
      alert('logout success')
    }, [])

    return (
      <>
        {provider && profile ? (
          <User provider={provider} profile={profile} onLogout={onLogoutSuccess} />
        ) : (
          <div className={`App ${provider && profile ? 'hide' : ''}`}>
            <h1 className='title'>ReactJS Social Login</h1>
            <LoginSocialFacebook
              isOnlyGetToken
              appId={process.env.REACT_APP_FB_APP_ID || ''}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }: IResolveParams) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
            >
              <FacebookLoginButton />
            </LoginSocialFacebook>

            <LoginSocialGoogle
              isOnlyGetToken
              client_id={process.env.REACT_APP_GG_APP_ID || ''}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }: IResolveParams) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
            >
              <GoogleLoginButton />
            </LoginSocialGoogle>

            <LoginSocialApple
              client_id={process.env.REACT_APP_APPLE_ID || ''}
              scope={'name email'}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }: IResolveParams) => {
                setProvider(provider);
                setProfile(data);
              }}
              onReject={err => {
                console.log(err);
              }}
            >
              <AppleLoginButton />
            </LoginSocialApple>

            <LoginSocialAmazon
              isOnlyGetToken
              client_id={process.env.REACT_APP_AMAZON_APP_ID || ''}
              redirect_uri={REDIRECT_URI}
              onResolve={({ provider, data }: IResolveParams) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err: any) => {
                console.log(err)
              }}
              onLoginStart={onLoginStart}
            >
              <AmazonLoginButton />
            </LoginSocialAmazon>

            <LoginSocialInstagram
              isOnlyGetToken
              client_id={process.env.REACT_APP_INSTAGRAM_APP_ID || ''}
              client_secret={process.env.REACT_APP_INSTAGRAM_APP_SECRET || ''}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }: IResolveParams) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err: any) => {
                console.log(err)
              }}
            >
              <InstagramLoginButton />
            </LoginSocialInstagram>

            <LoginSocialMicrosoft
              isOnlyGetToken
              client_id={process.env.REACT_APP_MICROSOFT_APP_ID || ''}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }: IResolveParams) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err: any) => {
                console.log(err)
              }}
            >
              <MicrosoftLoginButton />
            </LoginSocialMicrosoft>

            <LoginSocialLinkedin
              isOnlyGetToken
              client_id={process.env.REACT_APP_LINKEDIN_APP_ID || ''}
              client_secret={process.env.REACT_APP_LINKEDIN_APP_SECRET || ''}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }: IResolveParams) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err: any) => {
                console.log(err)
              }}
            >
              <LinkedInLoginButton />
            </LoginSocialLinkedin>

            <LoginSocialGithub
              isOnlyGetToken
              client_id={process.env.REACT_APP_GITHUB_APP_ID || ''}
              client_secret={process.env.REACT_APP_GITHUB_APP_SECRET || ''}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }: IResolveParams) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err: any) => {
                console.log(err)
              }}
            >
              <GithubLoginButton />
            </LoginSocialGithub>
            <LoginSocialPinterest
              isOnlyGetToken
              client_id={process.env.REACT_APP_PINTEREST_APP_ID || ''}
              client_secret={process.env.REACT_APP_PINTEREST_APP_SECRET || ''}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }: IResolveParams) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err: any) => {
                console.log(err)
              }}
              className='pinterest-btn'
            >
              <div className='content'>
                <div className='icon'>
                  <PinterestLogo />
                </div>
                <span className='txt'>Login With Pinterest</span>
              </div>
            </LoginSocialPinterest>

            <LoginSocialTwitter
              isOnlyGetToken
              client_id={process.env.REACT_APP_TWITTER_V2_APP_KEY || ''}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }: IResolveParams) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err: any) => {
                console.log(err)
              }}
            >
              <TwitterLoginButton />
            </LoginSocialTwitter>

            <LoginSocialTiktok
              client_key={process.env.REACT_APP_TIKTOK_CLIENT_KEY}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider(provider);
                setProfile(data);
              }}
              onReject={(err) => {
                console.log(err);
              }}
              className="pinterest-btn"
            >
              <div className="content">
                <div className="icon">
                  <TiktokLogo />
                </div>
                <span className="txt">Login With Tiktok</span>
              </div>
            </LoginSocialTiktok>
          </div>
        )}
      </>
    )
  }

  export default App
  ````
</details>

<br />

<details>
  <summary>JavaScript Version</summary>

  ````jsx
  import React, { useCallback, useState } from 'react'
  import './app.css'
  import { User } from './User' // component display user (see detail on /example directory)
  import {
    LoginSocialGoogle,
    LoginSocialAmazon,
    LoginSocialFacebook,
    LoginSocialGithub,
    LoginSocialInstagram,
    LoginSocialLinkedin,
    LoginSocialMicrosoft,
    LoginSocialPinterest,
    LoginSocialTwitter,
    LoginSocialApple,
    LoginSocialTiktok,
  } from 'reactjs-social-login'

  // CUSTOMIZE ANY UI BUTTON
  import {
    FacebookLoginButton,
    GoogleLoginButton,
    GithubLoginButton,
    AmazonLoginButton,
    InstagramLoginButton,
    LinkedInLoginButton,
    MicrosoftLoginButton,
    TwitterLoginButton,
    AppleLoginButton,
  } from 'react-social-login-buttons'

  import { ReactComponent as PinterestLogo } from './assets/pinterest.svg'
  import { ReactComponent as TiktokLogo } from './assets/tiktok.svg'

  // REDIRECT URL must be same with URL where the (reactjs-social-login) components is locate
  // MAKE SURE the (reactjs-social-login) components aren't unmounted or destroyed before the ask permission dialog closes
  const REDIRECT_URI = window.location.href;

  const App = () => {
    const [provider, setProvider] = useState('')
    const [profile, setProfile] = useState(null)

    const onLoginStart = useCallback(() => {
      alert('login start')
    }, [])

    const onLogoutSuccess = useCallback(() => {
      setProfile(null)
      setProvider('')
      alert('logout success')
    }, [])

    return (
      <>
        {provider && profile ? (
          <User provider={provider} profile={profile} onLogout={onLogoutSuccess} />
        ) : (
          <div className={`App ${provider && profile ? 'hide' : ''}`}>
            <h1 className='title'>ReactJS Social Login</h1>
            <LoginSocialFacebook
              isOnlyGetToken
              appId={process.env.REACT_APP_FB_APP_ID || ''}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
            >
              <FacebookLoginButton />
            </LoginSocialFacebook>

            <LoginSocialGoogle
              isOnlyGetToken
              client_id={process.env.REACT_APP_GG_APP_ID || ''}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
            >
              <GoogleLoginButton />
            </LoginSocialGoogle>

            <LoginSocialApple
              client_id={process.env.REACT_APP_APPLE_ID || ''}
              scope={'name email'}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider(provider);
                setProfile(data);
              }}
              onReject={err => {
                console.log(err);
              }}
            >
              <AppleLoginButton />
            </LoginSocialApple>

            <LoginSocialAmazon
              isOnlyGetToken
              client_id={process.env.REACT_APP_AMAZON_APP_ID || ''}
              redirect_uri={REDIRECT_URI}
              onResolve={({ provider, data }) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
              onLoginStart={onLoginStart}
            >
              <AmazonLoginButton />
            </LoginSocialAmazon>

            <LoginSocialInstagram
              isOnlyGetToken
              client_id={process.env.REACT_APP_INSTAGRAM_APP_ID || ''}
              client_secret={process.env.REACT_APP_INSTAGRAM_APP_SECRET || ''}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
            >
              <InstagramLoginButton />
            </LoginSocialInstagram>

            <LoginSocialMicrosoft
              isOnlyGetToken
              client_id={process.env.REACT_APP_MICROSOFT_APP_ID || ''}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
            >
              <MicrosoftLoginButton />
            </LoginSocialMicrosoft>

            <LoginSocialLinkedin
              isOnlyGetToken
              client_id={process.env.REACT_APP_LINKEDIN_APP_ID || ''}
              client_secret={process.env.REACT_APP_LINKEDIN_APP_SECRET || ''}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
            >
              <LinkedInLoginButton />
            </LoginSocialLinkedin>

            <LoginSocialGithub
              isOnlyGetToken
              client_id={process.env.REACT_APP_GITHUB_APP_ID || ''}
              client_secret={process.env.REACT_APP_GITHUB_APP_SECRET || ''}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
            >
              <GithubLoginButton />
            </LoginSocialGithub>

            <LoginSocialPinterest
              isOnlyGetToken
              client_id={process.env.REACT_APP_PINTEREST_APP_ID || ''}
              client_secret={process.env.REACT_APP_PINTEREST_APP_SECRET || ''}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
              className='pinterest-btn'
            >
              <div className='content'>
                <div className='icon'>
                  <PinterestLogo />
                </div>
                <span className='txt'>Login With Pinterest</span>
              </div>
            </LoginSocialPinterest>

            <LoginSocialTwitter
              isOnlyGetToken
              client_id={process.env.REACT_APP_TWITTER_V2_APP_KEY || ''}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
            >
              <TwitterLoginButton />
            </LoginSocialTwitter>

            <LoginSocialTiktok
              client_key={process.env.REACT_APP_TIKTOK_CLIENT_KEY}
              redirect_uri={REDIRECT_URI}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider(provider);
                setProfile(data);
              }}
              onReject={(err) => {
                console.log(err);
              }}
              className="pinterest-btn"
            >
              <div className="content">
                <div className="icon">
                  <TiktokLogo />
                </div>
                <span className="txt">Login With Tiktok</span>
              </div>
            </LoginSocialTiktok>
          </div>
        )}
      </>
    )
  }

  export default App
  ````
</details>

<br/>

> ### Loading more information like: user info, access_token on client side is discouraged and causes slow response, this should be done on server side, you can pass suggestion `isOnlyGetCode={true}` if you just want the code and don't need the access_token or `isOnlyGetToken={true}` if you just want the access_token and don't need the user's profile

<br/>

### 1. Google Props

| Prop                                                                                                                                                   | Type                                           |                      Default                       | Description                                                                                                                                  |
| :----------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- | :------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------- |
| onResolve                                                                                                                                              | `function({provider, data}) { // } (required)` |                        `-`                         | Return provider and data (include user's info & access_token,...)                                                                            |
| onReject                                                                                                                                               | `function(err) { // } (required)`              |                        `-`                         | Return error                                                                                                                                 |
| onLoginStart                                                                                                                                           | `function() { // } (optional)`                 |                        `-`                         | Called when click login                                                                                                                      |
| client_id                                                                                                                                              | `string (required)`                            |                        `-`                         | ID application                                                                                                                               |
| typeResponse                                                                                                                                           | `accessToken / idToken (optional)`             |                   `accessToken`                    | whether get idToken or accessToken                                                                                                           |
| auto_select                                                                                                                                            | `boolean (optional)`                           |                      `false`                       | if an ID token is automatically returned without any user interaction when there's only one Google session that has approved your app before |
| scope                                                                                                                                                  | `string (optional)`                            | `https://www.googleapis.com/auth/userinfo.profile` | Scope application                                                                                                                            |
| className                                                                                                                                              | `string (optional)`                            |                        `-`                         | Class container                                                                                                                              |
| isOnlyGetToken                                                                                                                                         | `boolean (optional)`                           |                      `false`                       | Only get access_token without get user's info (server-side)                                                                                  |
| [other_props...](https://github.com/cuongdevjs/reactjs-social-login/blob/ae89f1cb931a338b8aed24f94064ff07bda48f9f/src/LoginSocialGoogle/index.tsx#L11) |

<br/>

### 2. Facebook Props

| Prop                                                                                                                                                     | Type                                           |                                        Default                                         | Description                                                       |
| :------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- | :------------------------------------------------------------------------------------: | :---------------------------------------------------------------- |
| onResolve                                                                                                                                                | `function({provider, data}) { // } (required)` |                                          `-`                                           | Return provider and data (include user's info & access_token,...) |
| onReject                                                                                                                                                 | `function(err) { // } (required)`              |                                          `-`                                           | Return error                                                      |
| appId                                                                                                                                                    | `string (required)`                            |                                          `-`                                           | ID application                                                    |
| fields                                                                                                                                                   | `string (optional)`                            | `id,first_name,last_name,middle_name,name,name_format,picture,short_name,email,gender` | User's fields                                                     |
| onLoginStart                                                                                                                                             | `function() { // } (optional)`                 |                                          `-`                                           | Called when click login                                           | className | `string (optional)` | `-` | Class for button |
| scope                                                                                                                                                    | `string (optional)`                            |                                 `email,public_profile`                                 | Scope application                                                 |
| className                                                                                                                                                | `string (optional)`                            |                                          `-`                                           | Class container                                                   |
| isOnlyGetToken                                                                                                                                           | `boolean (optional)`                           |                                        `false`                                         | Only get access_token without get user's info (server-side)       |
| [other_props...](https://github.com/cuongdevjs/reactjs-social-login/blob/ae89f1cb931a338b8aed24f94064ff07bda48f9f/src/LoginSocialFacebook/index.tsx#L10) |

<br/>

### 3. Microsoft Props

| Prop                                                                                                                                                      | Type                                           |        Default         | Description                                                       |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- | :--------------------: | :---------------------------------------------------------------- |
| onResolve                                                                                                                                                 | `function({provider, data}) { // } (required)` |          `-`           | Return provider and data (include user's info & access_token,...) |
| onReject                                                                                                                                                  | `function(err) { // } (required)`              |          `-`           | Return error                                                      |
| client_id                                                                                                                                                 | `string (required)`                            |          `-`           | ID application                                                    |
| onLoginStart                                                                                                                                              | `function() { // } (optional)`                 |          `-`           | Called when click login                                           |
| scope                                                                                                                                                     | `string (optional)`                            | `profile openid email` | Scope application                                                 |
| className                                                                                                                                                 | `string (optional)`                            |          `-`           | Class for button                                                  |
| isOnlyGetToken                                                                                                                                            | `boolean (optional)`                           |        `false`         | Only get access_token without get user's info (server-side)       |
| isOnlyGetCode                                                                                                                                             | `boolean (optional)`                           |        `false`         | Only get code without access_token (server-side)                  |
| [other_props...](https://github.com/cuongdevjs/reactjs-social-login/blob/ae89f1cb931a338b8aed24f94064ff07bda48f9f/src/LoginSocialMicrosoft/index.tsx#L10) |

<br/>

### 4. Amazon Props

| Prop                                                                                                                                                   | Type                                           |  Default  | Description                                                       |
| :----------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- | :-------: | :---------------------------------------------------------------- |
| onResolve                                                                                                                                              | `function({provider, data}) { // } (required)` |    `-`    | Return provider and data (include user's info & access_token,...) |
| onReject                                                                                                                                               | `function(err) { // } (required)`              |    `-`    | Return error                                                      |
| client_id                                                                                                                                              | `string (required)`                            |    `-`    | ID application                                                    |
| onLoginStart                                                                                                                                           | `function() { // } (optional)`                 |    `-`    | Called when click login                                           |
| scope                                                                                                                                                  | `string (optional)`                            | `profile` | Scope application                                                 |
| className                                                                                                                                              | `string (optional)`                            |    `-`    | Class for button                                                  |
| isOnlyGetToken                                                                                                                                         | `boolean (optional)`                           |  `false`  | Only get access_token without get user's info (server-side)       |
| [other_props...](https://github.com/cuongdevjs/reactjs-social-login/blob/ae89f1cb931a338b8aed24f94064ff07bda48f9f/src/LoginSocialAmazon/index.tsx#L10) |

<br/>

### 5. Instagram Props

| Prop                                                                                                                                                      | Type                                           |                Default                 | Description                                                       |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- | :------------------------------------: | :---------------------------------------------------------------- |
| onResolve                                                                                                                                                 | `function({provider, data}) { // } (required)` |                  `-`                   | Return provider and data (include user's info & access_token,...) |
| onReject                                                                                                                                                  | `function(err) { // } (required)`              |                  `-`                   | Return error                                                      |
| client_id                                                                                                                                                 | `string (required)`                            |                  `-`                   | App ID application                                                |
| client_secret                                                                                                                                             | `string (required)`                            |                  `-`                   | App Secret application                                            |
| onLoginStart                                                                                                                                              | `function() { // } (optional)`                 |                  `-`                   | Called when click login                                           |
| scope                                                                                                                                                     | `string (optional)`                            |       `user_profile,user_media`        | Scope application                                                 |
| fields                                                                                                                                                    | `string (optional)`                            | `id,username,account_type,media_count` | Fields return                                                     |
| className                                                                                                                                                 | `string (optional)`                            |                  `-`                   | Class for button                                                  |
| isOnlyGetToken                                                                                                                                            | `boolean (optional)`                           |                `false`                 | Only get access_token without get user's info (server-side)       |
| isOnlyGetCode                                                                                                                                             | `boolean (optional)`                           |                `false`                 | Only get code without access_token (server-side)                  |
| [other_props...](https://github.com/cuongdevjs/reactjs-social-login/blob/ae89f1cb931a338b8aed24f94064ff07bda48f9f/src/LoginSocialInstagram/index.tsx#L11) |

<br/>

### 6. Linkedin Props

| Prop                                                                                                                                                     | Type                                           |     Default     | Description                                                       |
| :------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- | :-------------: | :---------------------------------------------------------------- |
| onResolve                                                                                                                                                | `function({provider, data}) { // } (required)` |       `-`       | Return provider and data (include user's info & access_token,...) |
| onReject                                                                                                                                                 | `function(err) { // } (required)`              |       `-`       | Return error                                                      |
| client_id                                                                                                                                                | `string (required)`                            |       `-`       | App ID application                                                |
| client_secret                                                                                                                                            | `string (required)`                            |       `-`       | App Secret application                                            |
| onLoginStart                                                                                                                                             | `function() { // } (optional)`                 |       `-`       | Called when click login                                           |
| scope                                                                                                                                                    | `string (optional)`                            | `r_liteprofile` | Scope application                                                 |
| className                                                                                                                                                | `string (optional)`                            |       `-`       | Class for button                                                  |
| isOnlyGetToken                                                                                                                                           | `boolean (optional)`                           |     `false`     | Only get access_token without get user's info (server-side)       |
| isOnlyGetCode                                                                                                                                            | `boolean (optional)`                           |     `false`     | Only get code without access_token (server-side)                  |
| [other_props...](https://github.com/cuongdevjs/reactjs-social-login/blob/ae89f1cb931a338b8aed24f94064ff07bda48f9f/src/LoginSocialLinkedin/index.tsx#L11) |

<br/>

### 7. Github Props

| Prop                                                                                                                                                   | Type                                           |   Default   | Description                                                       |
| :----------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- | :---------: | :---------------------------------------------------------------- |
| onResolve                                                                                                                                              | `function({provider, data}) { // } (required)` |     `-`     | Return provider and data (include user's info & access_token,...) |
| onReject                                                                                                                                               | `function(err) { // } (required)`              |     `-`     | Return error                                                      |
| client_id                                                                                                                                              | `string (required)`                            |     `-`     | App ID application                                                |
| client_secret                                                                                                                                          | `string (required)`                            |     `-`     | Secret ID application                                             |
| onLoginStart                                                                                                                                           | `function() { // } (optional)`                 |     `-`     | Called when click login                                           |
| scope                                                                                                                                                  | `string (optional)`                            | `repo,gist` | Scope application                                                 |
| className                                                                                                                                              | `string (optional)`                            |     `-`     | Class for button                                                  |
| isOnlyGetToken                                                                                                                                         | `boolean (optional)`                           |   `false`   | Only get access_token without get user's info (server-side)       |
| isOnlyGetCode                                                                                                                                          | `boolean (optional)`                           |   `false`   | Only get code without access_token (server-side)                  |
| [other_props...](https://github.com/cuongdevjs/reactjs-social-login/blob/ae89f1cb931a338b8aed24f94064ff07bda48f9f/src/LoginSocialGithub/index.tsx#L11) |

<br/>

### 8. Pinterest Props

| Prop                                                                                                                                                      | Type                                           | Default | Description                                                       |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- | :-----: | :---------------------------------------------------------------- |
| onResolve                                                                                                                                                 | `function({provider, data}) { // } (required)` |   `-`   | Return provider and data (include user's info & access_token,...) |
| onReject                                                                                                                                                  | `function(err) { // } (required)`              |   `-`   | Return error                                                      |
| client_id                                                                                                                                                 | `string (required)`                            |   `-`   | App ID application                                                |
| client_secret                                                                                                                                             | `string (required)`                            |   `-`   | Secret ID application                                             |
| onLoginStart                                                                                                                                              | `function() { // } (optional)`                 |   `-`   | Called when click login                                           |
| scope                                                                                                                                                     | `string (optional)`                            |   `-`   | Scope application                                                 |
| className                                                                                                                                                 | `string (optional)`                            |   `-`   | Class for button                                                  |
| isOnlyGetToken                                                                                                                                            | `boolean (optional)`                           | `false` | Only get access_token without get user's info (server-side)       |
| isOnlyGetCode                                                                                                                                             | `boolean (optional)`                           | `false` | Only get code without access_token (server-side)                  |
| [other_props...](https://github.com/cuongdevjs/reactjs-social-login/blob/ae89f1cb931a338b8aed24f94064ff07bda48f9f/src/LoginSocialPinterest/index.tsx#L11) |

<br/>

### 9. Twitter Props

| Prop                                                                                                                                                    | Type                                           |                                                                   Default                                                                    | Description                                                       |
| :------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------- |
| onResolve                                                                                                                                               | `function({provider, data}) { // } (required)` |                                                                     `-`                                                                      | Return provider and data (include user's info & access_token,...) |
| onReject                                                                                                                                                | `function(err) { // } (required)`              |                                                                     `-`                                                                      | Return error                                                      |
| client_id                                                                                                                                               | `string (required)`                            |                                                                     `-`                                                                      | API Key                                                           |
| fields                                                                                                                                                  | `string (optional)`                            | `created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified,withheld` | User's fields                                                     |
| state                                                                                                                                                   | `string (optional)`                            |                                                                   `state`                                                                    | A random string you provide to verify against CSRF attacks.       |
| scope                                                                                                                                                   | `string (optional)`                            |                                                          `users.read%20tweet.read`                                                           | Application's scope                                               |
| onLoginStart                                                                                                                                            | `function() { // } (optional)`                 |                                                                     `-`                                                                      | Called when click login                                           |
| className                                                                                                                                               | `string (optional)`                            |                                                                     `-`                                                                      | Class for button                                                  |
| isOnlyGetToken                                                                                                                                          | `boolean (optional)`                           |                                                                   `false`                                                                    | Only get access_token without get user's info (server-side)       |
| isOnlyGetCode                                                                                                                                           | `boolean (optional)`                           |                                                                   `false`                                                                    | Only get code without access_token (server-side)                  |
| [other_props...](https://github.com/cuongdevjs/reactjs-social-login/blob/ae89f1cb931a338b8aed24f94064ff07bda48f9f/src/LoginSocialTwitter/index.tsx#L12) |

<br/>

### 10. Apple Props

| Prop                                                                                                                                                  | Type                                           |   Default    | Description                                                       |
| :---------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- | :----------: | :---------------------------------------------------------------- |
| onResolve                                                                                                                                             | `function({provider, data}) { // } (required)` |     `-`      | Return provider and data (include user's info & access_token,...) |
| onReject                                                                                                                                              | `function(err) { // } (required)`              |     `-`      | Return error                                                      |
| client_id                                                                                                                                             | `string (required)`                            |     `-`      | API Key                                                           |
| scope                                                                                                                                                 | `string (optional)`                            | `name email` | Application's scope                                               |
| onLoginStart                                                                                                                                          | `function() { // } (optional)`                 |     `-`      | Called when click login                                           |
| className                                                                                                                                             | `string (optional)`                            |     `-`      | Class for button                                                  |
| [other_props...](https://github.com/cuongdevjs/reactjs-social-login/blob/ae89f1cb931a338b8aed24f94064ff07bda48f9f/src/LoginSocialApple/index.tsx#L10) |

<br/>

### 11. Tiktok Props

| Prop                                                                                                                                                   | Type                                           |   Default    | Description                                                       |
| :----------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- | :----------: | :---------------------------------------------------------------- |
| onResolve                                                                                                                                              | `function({provider, data}) { // } (required)` |     `-`      | Return provider and data (include user's info & access_token,...) |
| onReject                                                                                                                                               | `function(err) { // } (required)`              |     `-`      | Return error                                                      |
| client_key                                                                                                                                             | `string (required)`                            |     `-`      | API Key                                                           |
| scope                                                                                                                                                  | `string (optional)`                            | `name email` | Application's scope                                               |
| onLoginStart                                                                                                                                           | `function() { // } (optional)`                 |     `-`      | Called when click login                                           |
| className                                                                                                                                              | `string (optional)`                            |     `-`      | Class for button                                                  |
| [other_props...](https://github.com/cuongdevjs/reactjs-social-login/blob/ae89f1cb931a338b8aed24f94064ff07bda48f9f/src/LoginSocialTiktok/index.tsx#L11) |

<br/>

### How get client_id, client_secret_id

> Create application developer and you can get detail id & secret_id on these link

1. [Facebook](https://developers.facebook.com/apps/)
2. [Instagram](https://developers.facebook.com/apps/)
3. [Github](https://github.com/settings/developers)
4. [Linkedin](https://www.linkedin.com/developers/apps/)
5. [Google](https://console.developers.google.com/apis/credentials)
6. [Microsoft](https://portal.azure.com/)
7. [Amazon](https://developer.amazon.com/loginwithamazon/console/site/lwa/overview.html)
8. [Pinterest](https://developers.pinterest.com/docs/api/v5/)
9. [Twitter](https://developer.twitter.com/en/docs/authentication/)
10. [Apple](https://developer.apple.com/account/resources/)
11. [Tiktok](https://developers.tiktok.com/apps/)

## License

MIT © [Nguyen-Manh-Cuong](https://github.com/cuongdevjs )
