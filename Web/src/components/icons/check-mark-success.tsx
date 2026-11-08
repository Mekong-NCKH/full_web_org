import * as React from 'react';
import { SVGProps } from 'react';
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="20" cy="20" r="20" fill="#34A853" />
    <path
      d="M17.0002 24.1698L12.8302 19.9998L11.4102 21.4098L17.0002 26.9998L29.0002 14.9998L27.5902 13.5898L17.0002 24.1698Z"
      fill="white"
    />
  </svg>
);
export default SvgComponent;
