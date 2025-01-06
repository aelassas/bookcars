/* eslint-disable camelcase */
/**
 *
 * LoginSocialPinterest
 *
 */
// import { PASS_CORS_KEY } from 'helper/constants';
import React, { memo, useCallback, useEffect } from 'react';
import { IResolveParams, objectType } from '..';

interface Props {
  state?: string;
  scope?: string;
  client_id: string;
  client_secret: string;
  className?: string;
  redirect_uri: string;
  children?: React.ReactNode;
  isOnlyGetCode?: boolean;
  isOnlyGetToken?: boolean;
  onLoginStart?: () => void;
  onReject: (reject: string | objectType) => void;
  onResolve: ({ provider, data }: IResolveParams) => void;
}

const PINTEREST_URL: string = 'https://www.pinterest.com/oauth';
const PINTEREST_URL_API: string = 'https://api.pinterest.com/v5';
// const PREVENT_CORS_URL: string = 'https://cors.bridged.cc';

export const LoginSocialPinterest = ({
  state = '',
  scope = 'boards:read,pins:read,user_accounts:read',
  client_id,
  client_secret,
  className = '',
  redirect_uri,
  isOnlyGetCode = false,
  isOnlyGetToken = false,
  children,
  onLoginStart,
  onReject,
  onResolve,
}: Props) => {
  useEffect(() => {
    const popupWindowURL = new URL(window.location.href);
    const code = popupWindowURL.searchParams.get('code');
    const state = popupWindowURL.searchParams.get('state');
    if (state?.includes('_pinterest') && code) {
      localStorage.setItem('pinterest', code);
      window.close();
    }
  }, []);

  const getProfile = useCallback(
    (data: objectType) => {
      fetch(
        // `${PREVENT_CORS_URL}/${PINTEREST_URL_API}/user_account`,
        `${PINTEREST_URL_API}/user_account`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${data.access_token}`,
            // 'x-cors-grida-api-key': PASS_CORS_KEY,
          },
        })
        .then(res => res.json())
        .then(res => {
          onResolve({ provider: 'pinterest', data: { ...data, ...res } });
        })
        .catch(err => onReject(err));
    },
    [onReject, onResolve],
  );

  const getAccessToken = useCallback(
    async (code: string) => {
      if (isOnlyGetCode) onResolve({ provider: 'pinterest', data: { code } });
      else {
        var details: Record<string, string> = {
          code,
          redirect_uri,
          grant_type: `authorization_code`,
        };
        var formBody: string | string[] = [];
        for (var property in details) {
          var encodedKey = encodeURIComponent(property);
          var encodedValue = encodeURIComponent(details[property]);
          formBody.push(encodedKey + '=' + encodedValue);
        }
        formBody = formBody.join('&');

        const data = await fetch(
          // `${PREVENT_CORS_URL}/${PINTEREST_URL_API}/oauth/token`,
          `${PINTEREST_URL_API}/oauth/token`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${btoa(client_id + ':' + client_secret)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              // 'x-cors-grida-api-key': PASS_CORS_KEY,
            },
            body: formBody,
          },
        )
          .then(data => data.json())
          .catch(err => onReject(err));

        if (data.access_token) {
          if (isOnlyGetToken) onResolve({ provider: 'pinterest', data });
          else getProfile(data);
        }
      }
    },
    [
      onReject,
      client_id,
      getProfile,
      onResolve,
      redirect_uri,
      client_secret,
      isOnlyGetCode,
      isOnlyGetToken,
    ],
  );

  const handlePostMessage = useCallback(
    async ({ type, code, provider }: objectType) =>
      type === 'code' &&
      provider === 'pinterest' &&
      code &&
      getAccessToken(code),
    [getAccessToken],
  );

  const onChangeLocalStorage = useCallback(() => {
    window.removeEventListener('storage', onChangeLocalStorage, false);
    const code = localStorage.getItem('pinterest');
    if (code) {
      handlePostMessage({ provider: 'pinterest', type: 'code', code });
      localStorage.removeItem('pinterest');
    }
  }, [handlePostMessage]);

  const onLogin = useCallback(() => {
    onLoginStart && onLoginStart();
    window.addEventListener('storage', onChangeLocalStorage, false);
    const oauthUrl = `${PINTEREST_URL}/?client_id=${client_id}&scope=${scope}&state=${state + '_pinterest'
      }&redirect_uri=${redirect_uri}&response_type=code`;
    const width = 450;
    const height = 730;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      oauthUrl,
      'Pinterest',
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
    onChangeLocalStorage,
  ]);

  return (
    <div className={className} onClick={onLogin}>
      {children}
    </div>
  );
};

export default memo(LoginSocialPinterest);
