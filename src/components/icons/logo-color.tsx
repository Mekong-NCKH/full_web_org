const LogoColored = ({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <svg
      width="320"
      height="160"
      viewBox="0 0 320 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      onClick={onClick}
    >
      <rect x="104.49" width="26.1224" height="144" fill="#F9BA08" />
      <rect
        x="130.612"
        width="50"
        height="130.612"
        transform="rotate(90 130.612 0)"
        fill="#F9BA08"
      />
      <rect
        x="130.612"
        y="56"
        width="50"
        height="104.49"
        transform="rotate(90 130.612 56)"
        fill="#F9BA08"
      />
      <rect x="135.51" y="28" width="66.9388" height="22" fill="#0329E9" />
      <rect x="135.51" width="27.7551" height="50" fill="#0329E9" />
      <rect
        x="202.449"
        y="22"
        width="66.9388"
        height="22"
        transform="rotate(180 202.449 22)"
        fill="#0329E9"
      />
      <rect
        x="202.449"
        y="50"
        width="26.1224"
        height="50"
        transform="rotate(180 202.449 50)"
        fill="#0329E9"
      />
      <path d="M135.51 56L163.265 56V72L135.51 106V56Z" fill="#0329E9" />
      <path d="M176.327 56H202.449L135.51 138V106L176.327 56Z" fill="#0329E9" />
      <path
        d="M208.98 56H235.102L215.51 80H189.388L208.98 56Z"
        fill="#0329E9"
      />
      <path
        d="M208.979 56H235.102L150.204 160H124.082L208.979 56Z"
        fill="#F9BA08"
      />
      <path d="M235.102 56L262.857 90H207.347L235.102 56Z" fill="#F9BA08" />
      <path
        d="M202.449 96H267.755L295.51 130H174.694L202.449 96Z"
        fill="#F9BA08"
      />
      <path
        d="M169.796 136H300.408L320 160H150.204L169.796 136Z"
        fill="#F9BA08"
      />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M130.612 144V112L52.2446 112V160L117.551 160L130.612 144Z"
        fill="#F9BA08"
      />
    </svg>
  );
};

export default LogoColored;
