/* eslint-disable camelcase */
/**
 *
 * LoginSocialFacebook
 *
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { objectType, IResolveParams } from '../';

interface Props {
  appId: string;
  scope?: string;
  state?: boolean;
  xfbml?: boolean;
  cookie?: boolean;
  version?: string;
  language?: string;
  auth_type?: string;
  className?: string;
  isDisabled?: boolean;
  isOnlyGetToken?: boolean;
  onLoginStart?: () => void;
  onLogoutSuccess?: () => void;
  onReject: (reject: string | objectType) => void;
  onResolve: ({ provider, data }: IResolveParams) => void;
  redirect_uri?: string;
  fieldsProfile?: string;
  response_type?: string;
  return_scopes?: boolean;
  children?: React.ReactNode;
}

const SDK_URL: string = 'https://connect.facebook.net/en_EN/sdk.js';
const SCRIPT_ID: string = 'facebook-jssdk';
const _window = window as any;

const LoginSocialFacebook = ({
  appId,
  scope = 'email,public_profile',
  state = true,
  xfbml = true,
  cookie = true,
  version = 'v2.7',
  language = 'en_EN',
  auth_type = '',
  className,
  onLoginStart,
  onReject,
  onResolve,
  redirect_uri,
  fieldsProfile = 'id,first_name,last_name,middle_name,name,name_format,picture,short_name,email,gender',
  response_type = 'code',
  return_scopes = true,
  isOnlyGetToken = false,
  children,
}: Props) => {
  const scriptNodeRef = useRef<HTMLElement>(null!);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const insertSDKScript = useCallback(
    (document: HTMLDocument, cb: () => void) => {
      const fbScriptTag = document.createElement('script');
      fbScriptTag.id = SCRIPT_ID;
      fbScriptTag.src = SDK_URL;
      const scriptNode = document.getElementsByTagName('script')![0];
      scriptNode &&
        scriptNode.parentNode &&
        scriptNode.parentNode.insertBefore(fbScriptTag, scriptNode);
      cb();
    },
    [],
  );

  const checkIsExistsSDKScript = useCallback(() => {
    return !!document.getElementById(SCRIPT_ID);
  }, []);

  const initFbSDK = useCallback(
    (config: objectType, document: HTMLDocument) => {
      const _window = window as any;
      _window.fbAsyncInit = function () {
        _window.FB && _window.FB.init({ ...config });
        setIsSdkLoaded(true);
        let fbRoot = document.getElementById('fb-root');
        if (!fbRoot) {
          fbRoot = document.createElement('div');
          fbRoot.id = 'fb-root';
          document.body.appendChild(fbRoot);
        }
        scriptNodeRef.current = fbRoot;
      };
    },
    [],
  );

  const getMe = useCallback(
    (authResponse: objectType) => {
      _window.FB.api(
        '/me',
        { locale: language, fields: fieldsProfile },
        (me: any) => {
          onResolve({
            provider: 'facebook',
            data: { ...authResponse, ...me },
          });
        },
      );
    },
    [fieldsProfile, language, onResolve],
  );

  const handleResponse = useCallback(
    (response: objectType) => {
      if (response.authResponse) {
        if (isOnlyGetToken)
          onResolve({
            provider: 'facebook',
            data: { ...response.authResponse },
          });
        else getMe(response.authResponse);
      } else {
        onReject(response);
      }
      setIsProcessing(false);
    },
    [getMe, isOnlyGetToken, onReject, onResolve],
  );

  const load = useCallback(() => {
    if (checkIsExistsSDKScript()) {
      setIsSdkLoaded(true);
    } else {
      insertSDKScript(document, () => {
        initFbSDK(
          {
            appId,
            xfbml,
            version,
            state,
            cookie,
            redirect_uri,
            response_type,
          },
          document,
        );
      });
    }
  }, [
    state,
    appId,
    xfbml,
    cookie,
    version,
    initFbSDK,
    redirect_uri,
    response_type,
    insertSDKScript,
    checkIsExistsSDKScript,
  ]);

  const loginFB = useCallback(() => {
    if (!isSdkLoaded || isProcessing) return;

    if (!_window.FB) {
      load();
      onReject("Fb isn't loaded!");
      setIsProcessing(false);
    } else {
      setIsProcessing(true);
      onLoginStart && onLoginStart();
      _window.FB.login(handleResponse, {
        scope,
        return_scopes,
        auth_type,
      });
    }
  }, [
    load,
    scope,
    onReject,
    auth_type,
    isSdkLoaded,
    onLoginStart,
    isProcessing,
    return_scopes,
    handleResponse,
  ]);

  return (
    <div className={className} onClick={loginFB}>
      {children}
    </div>
  );
};

export default memo(LoginSocialFacebook);
