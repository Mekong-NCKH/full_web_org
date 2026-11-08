const VocabularyIcon = ({
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
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      onClick={onClick}
    >
      <g clip-path="url(#clip0_26227_14959)">
        <path
          d="M10.8514 12.6499H13.1514L12.0014 8.99994L10.8514 12.6499ZM20.0014 8.68994V3.99994H15.3114L12.0014 0.689941L8.69141 3.99994H4.00141V8.68994L0.691406 11.9999L4.00141 15.3099V19.9999H8.69141L12.0014 23.3099L15.3114 19.9999H20.0014V15.3099L23.3114 11.9999L20.0014 8.68994ZM14.3014 15.9999L13.6014 13.9999H10.4014L9.70141 15.9999H7.80141L11.0014 6.99994H13.0014L16.2014 15.9999H14.3014Z"
          fill="current"
        />
      </g>
      <defs>
        <clipPath id="clip0_26227_14959">
          <rect width="24" height="24" fill="current" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default VocabularyIcon;
