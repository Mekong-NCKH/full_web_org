const RemoveHighlightIcon = ({ className }: { className?: string }) => {
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
        d="M13.9238 16.9501L10.7418 18.0101L6.49983 13.7681L7.55983 10.5861L13.9238 16.9501ZM15.3378 15.5361L8.97383 9.17211L15.3378 2.80811C16.9038 1.24211 19.3068 1.11811 20.9948 2.80811L21.7018 3.51511C23.3918 5.20311 23.2678 7.60611 21.7018 9.17211L15.3378 15.5361ZM8.97383 19.0701L6.14583 21.9001L1.90283 19.0711L5.43883 15.5361L8.97383 19.0711V19.0701Z"
        fill="#0F172A"
      />
      <path
        d="M3 3L21 21"
        stroke="#0F172A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default RemoveHighlightIcon;
