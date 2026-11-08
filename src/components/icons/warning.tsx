import * as React from 'react';
import { memo } from 'react';
import { SVGProps } from 'react';

const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="current"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M0.833984 17.5001H19.1673L10.0007 1.66675L0.833984 17.5001ZM10.834 15.0001H9.16732V13.3334H10.834V15.0001ZM10.834 11.6667H9.16732V8.33341H10.834V11.6667Z"
      fill="current"
    />
  </svg>
);
const Memo = memo(SvgComponent);
export default Memo;
