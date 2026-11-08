import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { useEffect, useRef, useState } from 'react';
import { useWindowSize } from 'usehooks-ts';

type CustomGoogleButtonProps = {
  onSuccess: (credentialResponse: CredentialResponse) => void;
  onError?: () => void;
};

const CustomGoogleButton = ({
  onSuccess,
  onError,
}: CustomGoogleButtonProps) => {
  const [googleButtonWidth, setGoogleButtonWidth] = useState(0);

  const { width: windowWidth } = useWindowSize();

  const googleButtonContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGoogleButtonWidth(googleButtonContainerRef.current?.clientWidth ?? 0);
  }, [googleButtonContainerRef.current?.offsetWidth, windowWidth]);

  return (
    <div
      className="mt-2 w-44 md:w-56 lg:w-[300px] xl:w-[360px] 3xl:w-[480px]"
      ref={googleButtonContainerRef}
    >
      <div className="h-10 w-full md:h-12 xl:h-[56px]">
        <GoogleLogin
          size="large"
          onSuccess={onSuccess}
          onError={onError}
          width={googleButtonWidth}
          text="signin_with"
        />
      </div>
    </div>
  );
};

export default CustomGoogleButton;
