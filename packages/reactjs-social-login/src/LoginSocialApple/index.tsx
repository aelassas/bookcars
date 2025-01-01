/* eslint-disable camelcase */
/**
 *
 * LoginSocialGoogle
 *
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { objectType, IResolveParams } from '../';

interface Props {
  scope?: string;
  client_id: string;
  className?: string;
  redirect_uri?: string;
  children?: React.ReactNode;
  onLoginStart?: () => void;
  onReject: (reject: string | objectType) => void;
  onResolve: ({ provider, data }: IResolveParams) => void;
}

const JS_SRC =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
const SCRIPT_ID = 'apple-login';
const _window = window as any;

const LoginSocialApple = ({
  client_id,
  scope = 'name email',
  className = '',
  onLoginStart,
  onReject,
  onResolve,
  redirect_uri = '/',
  children,
}: // fetch_basic_profile = true,
Props) => {
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

  const insertScript = useCallback(
    (
      d: HTMLDocument,
      s: string = 'script',
      id: string,
      jsSrc: string,
      cb: () => void,
    ) => {
      const appleScriptTag: any = d.createElement(s);
      appleScriptTag.id = id;
      appleScriptTag.src = jsSrc;
      appleScriptTag.async = true;
      appleScriptTag.defer = true;
      const scriptNode = document.getElementsByTagName('script')![0];
      scriptNodeRef.current = appleScriptTag;
      scriptNode &&
        scriptNode.parentNode &&
        scriptNode.parentNode.insertBefore(appleScriptTag, scriptNode);
      appleScriptTag.onload = cb;
    },
    [],
  );

  const handleResponse = useCallback(
    (res: objectType) => {
      if (res?.access_token) {
        onResolve({
          provider: 'apple',
          data: res,
        });
      } else {
        const data: objectType = res;
        onResolve({
          provider: 'apple',
          data,
        });
      }
    },
    [onResolve],
  );

  const load = useCallback(() => {
    if (checkIsExistsSDKScript()) {
      setIsSdkLoaded(true);
    } else {
      insertScript(document, 'script', SCRIPT_ID, JS_SRC, () => {
        const options = {
          clientId: client_id, // This is the service ID we created.
          scope, // To tell apple we want the user name and emails fields in the response it sends us.
          redirectURI: redirect_uri, // As registered along with our service ID
          state: 'origin:web', // Any string of your choice that you may use for some logic. It's optional and you may omit it.
          usePopup: true, // Important if we want to capture the data apple sends on the client side.
        };
        _window.AppleID.auth.init(options);
        setIsSdkLoaded(true);
      });
    }
  }, [scope, client_id, redirect_uri, insertScript, checkIsExistsSDKScript]);

  const loginApple = useCallback(async () => {
    if (!isSdkLoaded) return;
    if (!_window.AppleID) {
      load();
      onReject("Apple SDK isn't loaded!");
    } else {
      onLoginStart && onLoginStart();
      try {
        const response = await _window.AppleID.auth.signIn();
        handleResponse(response);
      } catch (err) {
        onReject({ err });
      }
    }
  }, [handleResponse, isSdkLoaded, load, onLoginStart, onReject]);

  return (
    <div className={className} onClick={loginApple}>
      {children}
    </div>
  );
};

export default memo(LoginSocialApple);
