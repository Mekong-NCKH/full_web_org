const DescriptionIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      className={className}
    >
      <path
        d="M23.3346 3.33334H10.0013C8.16797 3.33334 6.68464 4.83334 6.68464 6.66667L6.66797 33.3333C6.66797 35.1667 8.1513 36.6667 9.98463 36.6667H30.0013C31.8346 36.6667 33.3346 35.1667 33.3346 33.3333V13.3333L23.3346 3.33334ZM26.668 30H13.3346V26.6667H26.668V30ZM26.668 23.3333H13.3346V20H26.668V23.3333ZM21.668 15V5.83334L30.8346 15H21.668Z"
        fill="#3D4863"
      />
    </svg>
  );
};

export default DescriptionIcon;
