/* eslint-disable camelcase */
/**
 *
 * LoginSocialInstagram
 *
 */
// import { PASS_CORS_KEY } from 'helper/constants';
import React, { memo, useCallback, useEffect } from 'react';
import { objectType, IResolveParams } from '../';

interface Props {
  scope?: string;
  state?: string;
  fields?: string;
  client_id: string;
  className?: string;
  client_secret: string;
  redirect_uri: string;
  response_type?: string;
  isOnlyGetCode?: boolean;
  isOnlyGetToken?: boolean;
  children?: React.ReactNode;
  onLogoutSuccess?: () => void;
  onLoginStart?: () => void;
  onReject: (reject: string | objectType) => void;
  onResolve: ({ provider, data }: IResolveParams) => void;
}

const INSTAGRAM_URL = 'https://api.instagram.com';
const INSTAGRAM_API_URL = 'https://graph.instagram.com/';
// const PREVENT_CORS_URL: string = 'https://cors.bridged.cc';

export const LoginSocialInstagram = ({
  state = '',
  client_id,
  client_secret,
  className,
  redirect_uri,
  fields = 'id,username,account_type,media_count',
  scope = 'user_profile,user_media',
  response_type = 'code',
  isOnlyGetCode = false,
  isOnlyGetToken = false,
  children,
  onReject,
  onResolve,
  onLoginStart,
}: Props) => {
  useEffect(() => {
    const popupWindowURL = new URL(window.location.href);
    const code = popupWindowURL.searchParams.get('code');
    const state = popupWindowURL.searchParams.get('state');
    if (state?.includes('_instagram') && code) {
      localStorage.setItem('instagram', code);
      window.close();
    }
  }, []);

  const getProfile = useCallback(
    (data: objectType) => {
      fetch(
        // `${PREVENT_CORS_URL}/${INSTAGRAM_API_URL}/me?fields=${fields}&access_token=${data.access_token}`,
        `${INSTAGRAM_API_URL}/me?fields=${fields}&access_token=${data.access_token}`,
        {
          method: 'GET',
          headers: {
            // 'x-cors-grida-api-key': PASS_CORS_KEY,
          },
        },
      )
        .then(res => res.json())
        .then(res => {
          onResolve({ provider: 'instagram', data: { ...res, ...data } });
        })
        .catch(err => {
          onReject(err);
        });
    },
    [fields, onReject, onResolve],
  );

  const getAccessToken = useCallback(
    (code: string) => {
      if (isOnlyGetCode) onResolve({ provider: 'instagram', data: { code } });
      else {
        const params = {
          grant_type: 'authorization_code',
          code,
          redirect_uri,
          client_id,
          client_secret,
        };
        const headers = new Headers({
          'Content-Type': 'application/x-www-form-urlencoded',
          // 'x-cors-grida-api-key': PASS_CORS_KEY,
        });
        fetch(
          // `${PREVENT_CORS_URL}/${INSTAGRAM_URL}/oauth/access_token`,
          `${INSTAGRAM_URL}/oauth/access_token`,
          {
            method: 'POST',
            headers,
            body: new URLSearchParams(params),
          })
          .then(response => response.json())
          .then(data => {
            if (data.access_token) {
              if (isOnlyGetToken) onResolve({ provider: 'instagram', data });
              else getProfile(data);
            } else onReject('no data');
          })
          .catch(err => {
            onReject(err);
          })
          .finally(() => { });
      }
    },
    [
      onReject,
      onResolve,
      getProfile,
      client_id,
      redirect_uri,
      client_secret,
      isOnlyGetCode,
      isOnlyGetToken,
    ],
  );

  const handlePostMessage = useCallback(
    async ({ type, code, provider }: objectType) =>
      type === 'code' &&
      provider === 'instagram' &&
      code &&
      getAccessToken(code),
    [getAccessToken],
  );

  const onChangeLocalStorage = useCallback(() => {
    window.removeEventListener('storage', onChangeLocalStorage, false);
    const code = localStorage.getItem('instagram');
    if (code) {
      handlePostMessage({ provider: 'instagram', type: 'code', code });
      localStorage.removeItem('instagram');
    }
  }, [handlePostMessage]);

  const onLogin = useCallback(() => {
    onLoginStart && onLoginStart();
    window.addEventListener('storage', onChangeLocalStorage, false);
    const oauthUrl = `${INSTAGRAM_URL}/oauth/authorize?response_type=${response_type}&client_id=${client_id}&scope=${scope}&state=${state + '_instagram'
      }&redirect_uri=${redirect_uri}`;
    const width = 450;
    const height = 730;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      oauthUrl,
      'Instagram',
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
    onLoginStart,
    response_type,
    onChangeLocalStorage,
  ]);

  return (
    <div className={className} onClick={onLogin}>
      {children}
    </div>
  );
};

export default memo(LoginSocialInstagram);
