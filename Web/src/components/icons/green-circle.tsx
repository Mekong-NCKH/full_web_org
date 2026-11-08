const GreenCircle = ({ className }: { className?: string }) => {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="4" cy="4" r="4" fill="#34A853" />
    </svg>
  );
};

export default GreenCircle;
