/* eslint-disable camelcase */
/**
 *
 * LoginSocialTiktok
 *
 */
// import { PASS_CORS_KEY } from 'helper/constants';
import React, { memo, useCallback, useEffect } from 'react';
import { IResolveParams, objectType } from '..';

interface Props {
  state?: string;
  scope?: string;
  client_key: string;
  // client_secret: string;
  className?: string;
  redirect_uri: string;
  // isOnlyGetToken?: boolean;
  // isOnlyGetCode?: boolean;
  children?: React.ReactNode;
  onLoginStart?: () => void;
  // onLogoutSuccess?: () => void;
  onReject: (reject: string | objectType) => void;
  onResolve: ({ provider, data }: IResolveParams) => void;
}

const TIKTOK_URL: string = 'https://www.tiktok.com';
// const TIKTOK_API_URL: string = 'https://open-api.tiktok.com';
// const PREVENT_CORS_URL: string = 'https://cors.bridged.cc';

export const LoginSocialGithub = ({
  state = '',
  scope = 'user.info.basic',
  client_key,
  // client_secret,
  className = '',
  redirect_uri,
  // isOnlyGetToken = false,
  // isOnlyGetCode = false,
  children,
  // onReject,
  onResolve,
  onLoginStart,
}: Props) => {
  useEffect(() => {
    const popupWindowURL = new URL(window.location.href);
    const code = popupWindowURL.searchParams.get('code');
    const state = popupWindowURL.searchParams.get('state');
    if (state?.includes('_tiktok') && code) {
      localStorage.setItem('tiktok', code);
      window.close();
    }
  }, []);

  // const getProfile = useCallback(
  //   (data: objectType) => {
  //     fetch(`${PREVENT_CORS_URL}/${TIKTOK_API_URL}/user`, {
  //       method: 'GET',
  //       headers: {
  //         Authorization: `token ${data.access_token}`,
  //         'x-cors-grida-api-key': PASS_CORS_KEY,
  //       },
  //     })
  //       .then(res => res.json())
  //       .then((response: any) => {
  //         onResolve({ provider: 'tiktok', data: { ...response, ...data } });
  //       })
  //       .catch(err => {
  //         onReject(err);
  //       });
  //   },
  //   [onReject, onResolve],
  // );

  // const getAccessToken = useCallback(
  //   (code: string) => {
  //     if (isOnlyGetCode) onResolve({ provider: 'tiktok', data: { code } });
  //     else {
  //       const params = {
  //         code,
  //         client_key,
  //         client_secret,
  //         grant_type: 'authorization_code',
  //       };
  //       const headers = new Headers({
  //         'Content-Type': 'application/x-www-form-urlencoded',
  //         'x-cors-grida-api-key': PASS_CORS_KEY,
  //       });

  //       fetch(`${PREVENT_CORS_URL}/${TIKTOK_API_URL}/oauth/access_token/`, {
  //         method: 'POST',
  //         headers,
  //         body: new URLSearchParams(params),
  //       })
  //         .then(response => response.text())
  //         .then(response => {
  //           console.log(response);
  //           // const data: objectType = {};
  //           // const searchParams: any = new URLSearchParams(response);
  //           // for (const p of searchParams) {
  //           //   data[p[0]] = p[1];
  //           // }
  //           // if (data.access_token) {
  //           //   if (isOnlyGetToken) onResolve({ provider: 'tiktok', data });
  //           //   else getProfile(data);
  //           // } else onReject('no data');
  //         })
  //         .catch(err => {
  //           onReject(err);
  //         });
  //     }
  //   },
  //   [onReject, onResolve, client_key, client_secret, isOnlyGetCode],
  // );

  const handlePostMessage = useCallback(
    async ({ type, code, provider }: objectType) =>
      type === 'code' &&
      provider === 'tiktok' &&
      code &&
      onResolve({ provider: 'tiktok', data: { code } }),
    // getAccessToken(code),
    [onResolve],
  );

  const onChangeLocalStorage = useCallback(() => {
    window.removeEventListener('storage', onChangeLocalStorage, false);
    const code = localStorage.getItem('tiktok');
    if (code) {
      handlePostMessage({ provider: 'tiktok', type: 'code', code });
      localStorage.removeItem('instagram');
    }
  }, [handlePostMessage]);

  const onLogin = useCallback(() => {
    onLoginStart && onLoginStart();

    window.addEventListener('storage', onChangeLocalStorage, false);
    const oauthUrl = `${TIKTOK_URL}/auth/authorize?client_key=${client_key}&scope=${scope}&state=${
      state + '_tiktok'
    }&redirect_uri=${redirect_uri}&response_type=code`;
    const width = 450;
    const height = 730;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      oauthUrl,
      'Github',
      'menubar=no,location=no,resizable=no,scrollbars=no,status=no, width=' +
        width +
        ', height=' +
        height +
        ', top=' +
        top +
        ', left=' +
        left,
    );
  }, [
    scope,
    state,
    client_key,
    redirect_uri,
    onLoginStart,
    onChangeLocalStorage,
  ]);

  return (
    <div className={className} onClick={onLogin}>
      {children}
    </div>
  );
};

export default memo(LoginSocialGithub);
