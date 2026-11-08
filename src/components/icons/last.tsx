const Last = ({
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
      <path
        d="M6 7.41L10.58 12L6 16.59L7.41 18L13.41 12L7.41 6L6 7.41Z"
        fill="current"
      />
      <path
        d="M10.5898 7.41L15.1698 12L10.5898 16.59L11.9998 18L17.9998 12L11.9998 6L10.5898 7.41Z"
        fill="current"
      />
    </svg>
  );
};

export default Last;
