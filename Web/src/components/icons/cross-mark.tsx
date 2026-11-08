type CrossMarkProps = {
  className?: string;
  onClick?: () => void;
};

const CrossMark = ({ className, onClick }: CrossMarkProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    onClick={onClick}
  >
    <path
      d="M12.6654 4.2735L11.7254 3.3335L7.9987 7.06016L4.27203 3.3335L3.33203 4.2735L7.0587 8.00016L3.33203 11.7268L4.27203 12.6668L7.9987 8.94016L11.7254 12.6668L12.6654 11.7268L8.9387 8.00016L12.6654 4.2735Z"
      fill="current"
    />
  </svg>
);

export default CrossMark;
