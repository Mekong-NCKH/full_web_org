const UnderlinedPen = ({ className }: { className?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <g clip-path="url(#clip0_22714_14181)">
      <path d="M14.7904 5.83346L11.6654 2.70846L3.33203 11.0418V14.1668H6.45703L14.7904 5.83346ZM17.257 3.3668C17.582 3.0418 17.582 2.5168 17.257 2.1918L15.307 0.241797C14.982 -0.0832031 14.457 -0.0832031 14.132 0.241797L12.4987 1.87513L15.6237 5.00013L17.257 3.3668Z" />
      <path d="M0 16.667H20V20.0003H0V16.667Z" />
    </g>
    <defs>
      <clipPath id="clip0_22714_14181">
        <rect width="20" height="20" />
      </clipPath>
    </defs>
  </svg>
);

export default UnderlinedPen;
