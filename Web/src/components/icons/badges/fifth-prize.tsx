const FifthPrize = ({ className }: { className?: string }) => {
  return (
    <svg
      width="44"
      height="48"
      viewBox="0 0 44 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g filter="url(#filter0_d_24834_16032)">
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
        d="M21.4302 25.1924C20.2569 25.1924 19.3182 24.8724 18.6142 24.2324C17.9209 23.5817 17.5742 22.7017 17.5742 21.5924H19.5422C19.5422 22.2111 19.7129 22.7071 20.0542 23.0804C20.3956 23.4431 20.8542 23.6244 21.4302 23.6244C21.9956 23.6244 22.4436 23.4377 22.7742 23.0644C23.1049 22.6911 23.2702 22.1417 23.2702 21.4164C23.2702 20.7657 23.1049 20.2697 22.7742 19.9284C22.4542 19.5764 22.0222 19.4004 21.4782 19.4004C21.1049 19.4004 20.7689 19.4857 20.4702 19.6564C20.1822 19.8271 19.9422 20.0564 19.7502 20.3444L17.9422 20.1044L18.3902 14.0244H24.6942V15.7684H20.0542L19.8782 18.5204C20.4649 18.0831 21.1689 17.8644 21.9902 17.8644C22.9502 17.8644 23.7342 18.1684 24.3422 18.7764C24.9502 19.3737 25.2542 20.2537 25.2542 21.4164C25.2542 22.6111 24.9129 23.5391 24.2302 24.2004C23.5476 24.8617 22.6142 25.1924 21.4302 25.1924Z"
        fill="#3D4863"
      />
      <defs>
        <filter
          id="filter0_d_24834_16032"
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
            result="effect1_dropShadow_24834_16032"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_24834_16032"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

export default FifthPrize;
