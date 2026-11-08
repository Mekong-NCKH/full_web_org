const TestIcon = ({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      onClick={onClick}
    >
      <g clipPath="url(#clip0_20849_38789)">
        <path
          d="M17.75 6.99957L14 3.24957L4 13.2496V16.9996H7.75L17.75 6.99957ZM20.71 4.03957C21.1 3.64957 21.1 3.01957 20.71 2.62957L18.37 0.28957C17.98 -0.10043 17.35 -0.10043 16.96 0.28957L15 2.24957L18.75 5.99957L20.71 4.03957Z"
          fill="current"
        />
        <path d="M0 20H24V24H0V20Z" fill="current" />
      </g>
      <defs>
        <clipPath id="clip0_20849_38789">
          <rect width="24" height="24" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default TestIcon;
