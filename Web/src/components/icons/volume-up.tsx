const VolumeIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="21"
      height="20"
      viewBox="0 0 21 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3 7.49998V12.5H6.33333L10.5 16.6667V3.33332L6.33333 7.49998H3ZM14.25 9.99998C14.25 8.52498 13.4 7.25832 12.1667 6.64165V13.35C13.4 12.7417 14.25 11.475 14.25 9.99998ZM12.1667 2.69165V4.40832C14.575 5.12498 16.3333 7.35832 16.3333 9.99998C16.3333 12.6417 14.575 14.875 12.1667 15.5917V17.3083C15.5083 16.55 18 13.5667 18 9.99998C18 6.43332 15.5083 3.44998 12.1667 2.69165Z"
        fill="current"
      />
    </svg>
  );
};

export default VolumeIcon;
