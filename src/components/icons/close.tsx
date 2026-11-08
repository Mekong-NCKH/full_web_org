const CloseIcon = ({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      onClick={onClick}
    >
      <mask
        id="mask0_18503_2574"
        style={{ maskType: 'alpha' }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="24"
        height="24"
      >
        <rect width="24" height="24" fill="current" />
      </mask>
      <g mask="url(#mask0_18503_2574)">
        <rect
          x="21.0215"
          y="4.08008"
          width="24"
          height="1.6"
          transform="rotate(135 21.0215 4.08008)"
          fill="current"
        />
        <rect
          x="19.89"
          y="21.0508"
          width="24"
          height="1.6"
          transform="rotate(-135 19.89 21.0508)"
          fill="current"
        />
      </g>
    </svg>
  );
};

export default CloseIcon;
