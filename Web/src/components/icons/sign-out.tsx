const SignOut = ({
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
      onClick={onClick}
      className={className}
    >
      <path
        d="M3 3.00977L15 3.02C16.1 3.02 17 3.92 17 5.02V9.01H15V5L3 4.98977V19.0198L15 19.03V15.01H17V19.02C17 20.12 16.1 21 15 21L3 20.9898C1.9 20.9898 1 20.1098 1 19.0098V5.00977C1 3.89977 1.9 3.00977 3 3.00977ZM19 15.9998L23 11.9998L19 7.99977V10.9998H9V12.9998L19 13V15.9998Z"
        fill="#EA4335"
      />
      <path
        d="M23 11.9998L19 15.9998V13L9 12.9998V10.9998H19V7.99977L23 11.9998Z"
        fill="#EA4335"
      />
    </svg>
  );
};

export default SignOut;
