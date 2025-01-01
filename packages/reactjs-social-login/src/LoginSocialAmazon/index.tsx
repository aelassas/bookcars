/* eslint-disable camelcase */
/**
 *
 * LoginSocialAmazon
 *
 */
import React, { memo, useEffect, useState, useCallback, useRef } from 'react';
import { IResolveParams, objectType } from '../';

interface Props {
  scope?: string;
  state?: string;
  client_id: string;
  className?: string;
  redirect_uri?: string;
  response_type?: string;
  scope_data?: objectType;
  isOnlyGetToken?: boolean;
  children?: React.ReactNode;
  onLoginStart?: () => void;
  onReject: (reject: string | objectType) => void;
  onResolve: ({ provider, data }: IResolveParams) => void;
}

const JS_SRC = 'https://assets.loginwithamazon.com/sdk/na/login1.js';
const SCRIPT_ID = 'amazon-login';
const _window = window as any;

export const LoginSocialAmazon = ({
  state = '',
  client_id,
  className,
  redirect_uri,
  scope = 'profile',
  isOnlyGetToken: onlyGetToken = false,
  scope_data = {
    profile: { essential: true },
  },
  response_type = 'token',
  children,
  onReject,
  onResolve,
  onLoginStart,
}: Props) => {
  const scriptNodeRef = useRef<HTMLScriptElement>(null!);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);

  useEffect(() => {
    !isSdkLoaded && load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSdkLoaded]);

  useEffect(
    () => () => {
      if (scriptNodeRef.current) scriptNodeRef.current.remove();
    },
    [],
  );

  const checkIsExistsSDKScript = useCallback(() => {
    return !!document.getElementById(SCRIPT_ID);
  }, []);

  const insertScriptGoogle = useCallback(
    (
      d: HTMLDocument,
      s: string = 'script',
      id: string,
      jsSrc: string,
      cb: () => void,
    ) => {
      const ggScriptTag: any = d.createElement(s);
      ggScriptTag.id = id;
      ggScriptTag.src = jsSrc;
      ggScriptTag.async = true;
      ggScriptTag.defer = true;
      const scriptNode = document.getElementsByTagName('script')![0];
      scriptNodeRef.current = ggScriptTag;
      scriptNode &&
        scriptNode.parentNode &&
        scriptNode.parentNode.insertBefore(ggScriptTag, scriptNode);
      ggScriptTag.onload = cb;
    },
    [],
  );

  const getUserInfo = useCallback(
    async (res: objectType) => {
      fetch(`https://api.amazon.com/user/profile`, {
        headers: {
          Authorization: `Bearer ${res.access_token}`,
        },
      })
        .then(data => data.json())
        .then(data => {
          onResolve({ provider: 'amazon', data: { ...data, ...res } });
        })
        .catch(err => {
          onReject(err);
        })
        .finally(() => {});
    },
    [onReject, onResolve],
  );

  const handleResponse = useCallback(
    (res: objectType) => {
      if (onlyGetToken) onResolve({ provider: 'amazon', data: { ...res } });
      else getUserInfo(res);
    },
    [getUserInfo, onResolve, onlyGetToken],
  );

  const handleError = useCallback(
    (err: objectType | string) => {
      onReject(err);
    },
    [onReject],
  );

  const load = useCallback(() => {
    if (checkIsExistsSDKScript()) {
      setIsSdkLoaded(true);
    } else {
      insertScriptGoogle(document, 'script', SCRIPT_ID, JS_SRC, () => {
        _window.amazon.Login.setClientId(client_id);
        setIsSdkLoaded(true);
      });
    }
  }, [checkIsExistsSDKScript, client_id, insertScriptGoogle]);

  const onLogin = useCallback(() => {
    if (!isSdkLoaded) return;
    if (!_window.amazon) {
      load();
      onReject("Google SDK isn't loaded!");
    } else {
      onLoginStart && onLoginStart();
      _window.amazon.Login.authorize(
        { scope, scope_data, response_type, redirect_uri, state },
        (res: objectType) => {
          if (res.error) handleError(res.error);
          else handleResponse(res);
        },
      );
    }
  }, [
    load,
    scope,
    state,
    onReject,
    scope_data,
    isSdkLoaded,
    handleError,
    onLoginStart,
    redirect_uri,
    response_type,
    handleResponse,
  ]);

  return (
    <div className={className} onClick={onLogin}>
      {children}
    </div>
  );
};

export default memo(LoginSocialAmazon);
