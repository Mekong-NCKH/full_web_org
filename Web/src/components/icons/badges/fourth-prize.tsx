const FourthPrize = ({ className }: { className?: string }) => {
  return (
    <svg
      width="44"
      height="48"
      viewBox="0 0 44 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g filter="url(#filter0_d_24834_16020)">
        <path
          d="M22 0L39.3205 10V30L22 40L4.67949 30V10L22 0Z"
          fill="#A3ACC2"
        />
        <path
          d="M6.67949 11.1547L22 2.3094L37.3205 11.1547V28.8453L22 37.6906L6.67949 28.8453V11.1547Z"
          stroke="#3D4863"
          stroke-width="4"
        />
      </g>
      <path
        d="M22.1836 22.536H17.3516V20.952C18.6849 18.7334 19.6662 16.36 20.2956 13.832H22.2956C22.0929 14.7067 21.7836 15.6347 21.3676 16.616C20.9516 17.5974 20.5249 18.4827 20.0876 19.272C19.6609 20.0614 19.3196 20.6267 19.0636 20.968H22.1836V18.136C22.5676 17.3574 22.9036 16.4667 23.1916 15.464H24.1036V20.968H25.4796V22.536H24.1036V25H22.1836V22.536Z"
        fill="#3D4863"
      />
      <defs>
        <filter
          id="filter0_d_24834_16020"
          x="0.679688"
          y="0"
          width="42.6406"
          height="48"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_24834_16020"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_24834_16020"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

export default FourthPrize;
