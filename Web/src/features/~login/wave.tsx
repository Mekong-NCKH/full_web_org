const WaveLeft = ({ className }: { className?: string }) => {
  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="560"
        height="400"
        viewBox="0 0 560 400"
        fill="none"
        className={className}
      >
        <path
          d="M0 0C0 0 235.5 17.8809 291 197.881C337.026 347.156 560 400 560 400H0V0Z"
          fill="#9DA9C9"
        />
        <path
          d="M0 80C0 80 235.5 94.3047 291 238.305C337.026 357.725 560 400 560 400H0V80Z"
          fill="#6D7EAE"
        />
        <path
          d="M0 160C0 160 235.5 170.729 291 278.729C337.026 368.294 560 400 560 400H0V160Z"
          fill="#0b2878"
        />
      </svg>
    </>
  );
};

const WaveRight = ({ className }: { className?: string }) => {
  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="560"
        height="400"
        viewBox="0 0 560 400"
        fill="none"
        className={className}
        // className="medium:w-52 absolute bottom-0 right-0 hidden h-fit lg:flex lg:w-64 xl:w-80 3xl:h-[400px] 3xl:w-[560px]"
      >
        <path
          d="M560 0C560 0 324.5 17.8809 269 197.881C222.974 347.156 0 400 0 400H560V0Z"
          fill="#9DA9C9"
        />
        <path
          d="M560 80C560 80 324.5 94.3047 269 238.305C222.974 357.725 0 400 0 400H560V80Z"
          fill="#6D7EAE"
        />
        <path
          d="M560 160C560 160 324.5 170.729 269 278.729C222.974 368.294 0 400 0 400H560V160Z"
          fill="#0b2878"
        />
      </svg>
    </>
  );
};

const WaveRightRotated = ({ className }: { className?: string }) => {
  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="560"
        height="400"
        viewBox="0 0 560 400"
        fill="none"
        className={className}
        // className="medium:w-52 absolute right-0 top-0 h-fit w-44 rotate-180 sm:w-48 lg:hidden"
      >
        <path
          d="M0 0C0 0 235.5 17.8809 291 197.881C337.026 347.156 560 400 560 400H0V0Z"
          fill="#9DA9C9"
        />
        <path
          d="M0 80C0 80 235.5 94.3047 291 238.305C337.026 357.725 560 400 560 400H0V80Z"
          fill="#6D7EAE"
        />
        <path
          d="M0 160C0 160 235.5 170.729 291 278.729C337.026 368.294 560 400 560 400H0V160Z"
          fill="#0b2878"
        />
      </svg>
    </>
  );
};

export { WaveLeft, WaveRight, WaveRightRotated };
