const ChallengeIcon = ({
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
        d="M17.143 12.3832L18.3346 11.1915L17.143 9.99984L14.168 12.9748L7.0263 5.83317L10.0013 2.85817L8.80964 1.6665L7.61797 2.85817L6.4263 1.6665L4.64297 3.44984L3.4513 2.25817L2.25964 3.44984L3.4513 4.6415L1.66797 6.42484L2.85964 7.6165L1.66797 8.80817L2.85964 9.99984L5.83464 7.02484L12.9763 14.1665L10.0013 17.1415L11.193 18.3332L12.3846 17.1415L13.5763 18.3332L15.3596 16.5498L16.5513 17.7415L17.743 16.5498L16.5513 15.3582L18.3346 13.5748L17.143 12.3832Z"
        fill="current"
      />
    </svg>
  );
};

export default ChallengeIcon;
