const ArrowHead = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 8 4"
      fill="current"
      className={className}
    >
      <path d="M8 4L4 -1.74846e-07L-1.74846e-07 4L8 4Z" fill="current" />
    </svg>
  );
};

export default ArrowHead;
