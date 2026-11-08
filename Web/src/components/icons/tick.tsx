const Tick = ({
  className,
  tickColor = 'white',
}: {
  className?: string;
  tickColor?: string;
}) => {
  return (
    <svg
      width="17"
      height="16"
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="8.5" cy="8" r="8" fill="current" />
      <path
        d="M6.99813 10.0849L4.91312 7.99992L4.20312 8.70492L6.99813 11.4999L12.9981 5.49992L12.2931 4.79492L6.99813 10.0849Z"
        fill={tickColor}
      />
    </svg>
  );
};

export default Tick;
