const ThirdPrize = ({ className }: { className?: string }) => {
  return (
    <svg
      width="44"
      height="48"
      viewBox="0 0 44 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M22 24L32.3923 30V42L22 48L11.6077 42V30L22 24Z"
        fill="#34A853"
      />
      <path
        d="M13.8397 31.2887L22 26.5774L30.1603 31.2887V40.7113L22 45.4227L13.8397 40.7113V31.2887Z"
        stroke="#EA4335"
      />
      <g filter="url(#filter0_d_24834_16005)">
        <path
          d="M22 0L39.3205 10V30L22 40L4.67949 30V10L22 0Z"
          fill="#471D00"
        />
        <path
          d="M6.67949 11.1547L22 2.3094L37.3205 11.1547V28.8453L22 37.6906L6.67949 28.8453V11.1547Z"
          stroke="#893700"
          stroke-width="4"
        />
      </g>
      <path
        d="M21.479 25.192C20.2203 25.192 19.2496 24.8987 18.567 24.312C17.8843 23.7147 17.543 22.9094 17.543 21.896V21.656H19.495V21.944C19.495 22.488 19.6603 22.904 19.991 23.192C20.3216 23.48 20.7963 23.624 21.415 23.624C22.0123 23.624 22.4816 23.4854 22.823 23.208C23.1643 22.92 23.335 22.488 23.335 21.912C23.335 20.7707 22.6523 20.2 21.287 20.2H20.359V18.632H21.335C21.847 18.632 22.2683 18.488 22.599 18.2C22.9296 17.912 23.095 17.5014 23.095 16.968C23.095 16.4454 22.9456 16.056 22.647 15.8C22.3483 15.5334 21.9483 15.4 21.447 15.4C20.9136 15.4 20.4923 15.5334 20.183 15.8C19.8736 16.0667 19.719 16.4614 19.719 16.984V17.24H17.783V16.84C17.783 16.2427 17.9376 15.72 18.247 15.272C18.5563 14.8134 18.983 14.4614 19.527 14.216C20.0816 13.96 20.711 13.832 21.415 13.832C22.5243 13.832 23.4096 14.0934 24.071 14.616C24.743 15.1387 25.079 15.88 25.079 16.84C25.079 17.448 24.9243 17.9494 24.615 18.344C24.3056 18.728 23.8736 19.048 23.319 19.304V19.368C23.9163 19.5494 24.3963 19.8694 24.759 20.328C25.1216 20.7867 25.303 21.3627 25.303 22.056C25.303 22.696 25.1376 23.256 24.807 23.736C24.487 24.2054 24.039 24.568 23.463 24.824C22.887 25.0694 22.2256 25.192 21.479 25.192Z"
        fill="#893700"
      />
      <defs>
        <filter
          id="filter0_d_24834_16005"
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
            result="effect1_dropShadow_24834_16005"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_24834_16005"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

export default ThirdPrize;
