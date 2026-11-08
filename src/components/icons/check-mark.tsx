type CheckMarkProps = {
  className?: string;
};

const CheckMark = ({ className }: CheckMarkProps) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="current"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4.50008 8.08504L2.41508 6.00004L1.70508 6.70504L4.50008 9.50004L10.5001 3.50004L9.79508 2.79504L4.50008 8.08504Z"
      fill="white"
    />
  </svg>
);

export default CheckMark;
