const Chevron = ({ className }: { className?: string }) => {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M23.4102 15.41L18.8302 20L23.4102 24.59L22.0002 26L16.0002 20L22.0002 14L23.4102 15.41Z"
        fill="#A3ACC2"
      />
    </svg>
  );
};

export default Chevron;
