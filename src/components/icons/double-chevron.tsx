const DoubleChevron = ({ className }: { className?: string }) => {
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
        d="M26 15.41L21.42 20L26 24.59L24.59 26L18.59 20L24.59 14L26 15.41Z"
        fill="#A3ACC2"
      />
      <path
        d="M21.4102 15.41L16.8302 20L21.4102 24.59L20.0002 26L14.0002 20L20.0002 14L21.4102 15.41Z"
        fill="#A3ACC2"
      />
    </svg>
  );
};

export default DoubleChevron;
