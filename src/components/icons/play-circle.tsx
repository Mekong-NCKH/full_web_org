const PlayCircleIcon = ({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      onClick={onClick}
    >
      <path
        d="M10.0013 1.6665C5.4013 1.6665 1.66797 5.39984 1.66797 9.99984C1.66797 14.5998 5.4013 18.3332 10.0013 18.3332C14.6013 18.3332 18.3346 14.5998 18.3346 9.99984C18.3346 5.39984 14.6013 1.6665 10.0013 1.6665ZM8.33464 13.7498V6.24984L13.3346 9.99984L8.33464 13.7498Z"
        fill="current"
      />
    </svg>
  );
};

export default PlayCircleIcon;
