/* eslint-disable camelcase */
/**
 *
 * LoginSocialGithub
 *
 */
// import { PASS_CORS_KEY } from 'helper/constants';
import React, { memo, useCallback, useEffect } from 'react';
import { IResolveParams, objectType } from '../';

interface Props {
  state?: string;
  scope?: string;
  client_id: string;
  className?: string;
  redirect_uri: string;
  client_secret: string;
  allow_signup?: boolean;
  isOnlyGetToken?: boolean;
  isOnlyGetCode?: boolean;
  children?: React.ReactNode;
  onLoginStart?: () => void;
  onLogoutSuccess?: () => void;
  onReject: (reject: string | objectType) => void;
  onResolve: ({ provider, data }: IResolveParams) => void;
}

const GITHUB_URL: string = 'https://github.com';
const GITHUB_API_URL: string = 'https://api.github.com/';
// const PREVENT_CORS_URL: string = 'https://cors.bridged.cc';

export const LoginSocialGithub = ({
  state = '',
  scope = 'repo,gist',
  client_id,
  client_secret,
  className = '',
  redirect_uri,
  allow_signup = false,
  isOnlyGetToken = false,
  isOnlyGetCode = false,
  children,
  onReject,
  onResolve,
  onLoginStart,
}: Props) => {
  useEffect(() => {
    const popupWindowURL = new URL(window.location.href);
    const code = popupWindowURL.searchParams.get('code');
    const state = popupWindowURL.searchParams.get('state');
    if (state?.includes('_github') && code) {
      localStorage.setItem('github', code);
      window.close();
    }
  }, []);

  const getProfile = useCallback(
    (data: objectType) => {
      fetch(
        // `${PREVENT_CORS_URL}/${GITHUB_API_URL}/user`,
        `${GITHUB_API_URL}/user`,
        {
          method: 'GET',
          headers: {
            Authorization: `token ${data.access_token}`,
            // 'x-cors-grida-api-key': PASS_CORS_KEY,
          },
        })
        .then(res => res.json())
        .then((response: any) => {
          onResolve({ provider: 'github', data: { ...response, ...data } });
        })
        .catch(err => {
          onReject(err);
        });
    },
    [onReject, onResolve],
  );

  const getAccessToken = useCallback(
    (code: string) => {
      if (isOnlyGetCode) onResolve({ provider: 'github', data: { code } });
      else {
        const params = {
          code,
          state,
          redirect_uri,
          client_id,
          client_secret,
        };
        const headers = new Headers({
          'Content-Type': 'application/x-www-form-urlencoded',
          // 'x-cors-grida-api-key': PASS_CORS_KEY,
        });

        fetch(
          // `${PREVENT_CORS_URL}/${GITHUB_URL}/login/oauth/access_token`, 
          `${GITHUB_URL}/login/oauth/access_token`,
          {
            method: 'POST',
            headers,
            body: new URLSearchParams(params),
          })
          .then(response => response.text())
          .then(response => {
            const data: objectType = {};
            const searchParams: any = new URLSearchParams(response);
            for (const p of searchParams) {
              data[p[0]] = p[1];
            }
            if (data.access_token) {
              if (isOnlyGetToken) onResolve({ provider: 'github', data });
              else getProfile(data);
            } else onReject('no data');
          })
          .catch(err => {
            onReject(err);
          });
      }
    },
    [
      state,
      onReject,
      getProfile,
      onResolve,
      client_id,
      redirect_uri,
      client_secret,
      isOnlyGetCode,
      isOnlyGetToken,
    ],
  );

  const handlePostMessage = useCallback(
    async ({ type, code, provider }: objectType) =>
      type === 'code' && provider === 'github' && code && getAccessToken(code),
    [getAccessToken],
  );

  const onChangeLocalStorage = useCallback(() => {
    window.removeEventListener('storage', onChangeLocalStorage, false);
    const code = localStorage.getItem('github');
    if (code) {
      handlePostMessage({ provider: 'github', type: 'code', code });
      localStorage.removeItem('github');
    }
  }, [handlePostMessage]);

  const onLogin = useCallback(() => {
    onLoginStart && onLoginStart();
    window.addEventListener('storage', onChangeLocalStorage, false);
    const oauthUrl = `${GITHUB_URL}/login/oauth/authorize?client_id=${client_id}&scope=${scope}&state=${state + '_github'
      }&redirect_uri=${redirect_uri}&allow_signup=${allow_signup}`;
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
    client_id,
    redirect_uri,
    allow_signup,
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
