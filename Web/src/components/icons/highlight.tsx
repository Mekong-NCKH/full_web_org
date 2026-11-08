const HighlightIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M13.9136 16.95L10.7316 18.01L6.48958 13.768L7.54958 10.586L13.9136 16.95ZM15.3276 15.536L8.96358 9.17199L15.3276 2.80799C16.8936 1.24199 19.2966 1.11799 20.9846 2.80799L21.6916 3.51499C23.3816 5.20299 23.2576 7.60599 21.6916 9.17199L15.3276 15.536ZM8.96358 19.07L6.13558 21.9L1.89258 19.071L5.42858 15.536L8.96358 19.071V19.07Z"
        fill="#5C5B51"
      />
    </svg>
  );
};

export default HighlightIcon;
