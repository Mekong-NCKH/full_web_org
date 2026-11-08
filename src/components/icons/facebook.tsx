const FacebookIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clip-path="url(#clip0_19015_13712)">
        <mask
          id="mask0_19015_13712"
          style={{ maskType: 'luminance' }}
          maskUnits="userSpaceOnUse"
          x="-3"
          y="-3"
          width="22"
          height="22"
        >
          <path
            d="M-2.08008 -2.07991H18.0799V18.0801H-2.08008V-2.07991Z"
            fill="white"
          />
        </mask>
        <g mask="url(#mask0_19015_13712)">
          <path
            d="M10.8195 10.2004L11.2235 8.0002H8.87173V7.22205C8.87173 6.05934 9.32786 5.61217 10.5085 5.61217C10.8752 5.61217 11.1703 5.62109 11.3403 5.63898V3.64449C11.0183 3.55504 10.2312 3.46559 9.77507 3.46559C7.36915 3.46559 6.26009 4.60149 6.26009 7.05213V8.0002H4.77539V10.2004H6.26009V14.9882C6.81717 15.1264 7.39964 15.2002 7.99943 15.2002C8.29475 15.2002 8.58574 15.182 8.87173 15.1475V10.2004H10.8195Z"
            fill="#3D4863"
          />
        </g>
      </g>
      <defs>
        <clipPath id="clip0_19015_13712">
          <rect
            width="14.4"
            height="14.4"
            fill="white"
            transform="translate(0.799805 0.799805)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

export default FacebookIcon;
