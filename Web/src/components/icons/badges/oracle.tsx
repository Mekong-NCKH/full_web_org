const OracleBadge = ({ className }: { className?: string }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="11"
        fill="#CE9801"
        stroke="#F9BA08"
        stroke-width="2"
      />
      <g
        clip-path="url(#paint0_diamond_24823_27702_clip_path)"
        data-figma-skip-parse="true"
      >
        <g transform="matrix(0 0.008 -0.008 0 12 12)">
          <rect
            x="0"
            y="0"
            width="1062.5"
            height="1062.5"
            fill="url(#paint0_diamond_24823_27702)"
            opacity="1"
            shape-rendering="crispEdges"
          />
          <rect
            x="0"
            y="0"
            width="1062.5"
            height="1062.5"
            transform="scale(1 -1)"
            fill="url(#paint0_diamond_24823_27702)"
            opacity="1"
            shape-rendering="crispEdges"
          />
          <rect
            x="0"
            y="0"
            width="1062.5"
            height="1062.5"
            transform="scale(-1 1)"
            fill="url(#paint0_diamond_24823_27702)"
            opacity="1"
            shape-rendering="crispEdges"
          />
          <rect
            x="0"
            y="0"
            width="1062.5"
            height="1062.5"
            transform="scale(-1)"
            fill="url(#paint0_diamond_24823_27702)"
            opacity="1"
            shape-rendering="crispEdges"
          />
        </g>
      </g>
      <path
        d="M7.02871 6.07545L12 4.26604L16.9713 6.07545L19.6165 10.657L18.6978 15.867L14.6452 19.2675H9.35483L5.3022 15.867L4.38354 10.657L7.02871 6.07545Z"
        data-figma-gradient-fill="{&#34;type&#34;:&#34;GRADIENT_DIAMOND&#34;,&#34;stops&#34;:[{&#34;color&#34;:{&#34;r&#34;:1.0,&#34;g&#34;:1.0,&#34;b&#34;:1.0,&#34;a&#34;:1.0},&#34;position&#34;:0.0},{&#34;color&#34;:{&#34;r&#34;:1.0,&#34;g&#34;:0.17647059261798859,&#34;b&#34;:0.33333334326744080,&#34;a&#34;:1.0},&#34;position&#34;:0.50},{&#34;color&#34;:{&#34;r&#34;:0.0,&#34;g&#34;:0.0,&#34;b&#34;:0.0,&#34;a&#34;:1.0},&#34;position&#34;:1.0}],&#34;stopsVar&#34;:[{&#34;color&#34;:{&#34;r&#34;:1.0,&#34;g&#34;:1.0,&#34;b&#34;:1.0,&#34;a&#34;:1.0},&#34;position&#34;:0.0},{&#34;color&#34;:{&#34;r&#34;:1.0,&#34;g&#34;:0.17647059261798859,&#34;b&#34;:0.33333334326744080,&#34;a&#34;:1.0},&#34;position&#34;:0.50},{&#34;color&#34;:{&#34;r&#34;:0.0,&#34;g&#34;:0.0,&#34;b&#34;:0.0,&#34;a&#34;:1.0},&#34;position&#34;:1.0}],&#34;transform&#34;:{&#34;m00&#34;:9.7971748206813428e-16,&#34;m01&#34;:-16.0,&#34;m02&#34;:20.0,&#34;m10&#34;:16.0,&#34;m11&#34;:9.7971748206813428e-16,&#34;m12&#34;:4.0},&#34;opacity&#34;:1.0,&#34;blendMode&#34;:&#34;NORMAL&#34;,&#34;visible&#34;:true}"
        stroke="black"
        stroke-width="0.5"
      />
      <defs>
        <clipPath id="paint0_diamond_24823_27702_clip_path">
          <path
            d="M7.02871 6.07545L12 4.26604L16.9713 6.07545L19.6165 10.657L18.6978 15.867L14.6452 19.2675H9.35483L5.3022 15.867L4.38354 10.657L7.02871 6.07545Z"
            stroke-width="0.5"
          />
        </clipPath>
        <linearGradient
          id="paint0_diamond_24823_27702"
          x1="0"
          y1="0"
          x2="500"
          y2="500"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="white" />
          <stop offset="0.5" stop-color="#FF2D55" />
          <stop offset="1" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default OracleBadge;
