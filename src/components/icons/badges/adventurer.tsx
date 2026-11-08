const AdventurerBadge = ({ className }: { className?: string }) => {
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
        clip-path="url(#paint0_diamond_24823_27696_clip_path)"
        data-figma-skip-parse="true"
      >
        <g transform="matrix(0 0.008 -0.008 0 12 12)">
          <rect
            x="0"
            y="0"
            width="1062.5"
            height="1062.5"
            fill="url(#paint0_diamond_24823_27696)"
            opacity="1"
            shape-rendering="crispEdges"
          />
          <rect
            x="0"
            y="0"
            width="1062.5"
            height="1062.5"
            transform="scale(1 -1)"
            fill="url(#paint0_diamond_24823_27696)"
            opacity="1"
            shape-rendering="crispEdges"
          />
          <rect
            x="0"
            y="0"
            width="1062.5"
            height="1062.5"
            transform="scale(-1 1)"
            fill="url(#paint0_diamond_24823_27696)"
            opacity="1"
            shape-rendering="crispEdges"
          />
          <rect
            x="0"
            y="0"
            width="1062.5"
            height="1062.5"
            transform="scale(-1)"
            fill="url(#paint0_diamond_24823_27696)"
            opacity="1"
            shape-rendering="crispEdges"
          />
        </g>
      </g>
      <path
        d="M5.50481 15.75L12 4.5L18.4952 15.75H5.50481Z"
        data-figma-gradient-fill="{&#34;type&#34;:&#34;GRADIENT_DIAMOND&#34;,&#34;stops&#34;:[{&#34;color&#34;:{&#34;r&#34;:1.0,&#34;g&#34;:1.0,&#34;b&#34;:1.0,&#34;a&#34;:1.0},&#34;position&#34;:0.0},{&#34;color&#34;:{&#34;r&#34;:0.25882354378700256,&#34;g&#34;:0.52156865596771240,&#34;b&#34;:0.95686274766921997,&#34;a&#34;:1.0},&#34;position&#34;:0.50},{&#34;color&#34;:{&#34;r&#34;:0.0,&#34;g&#34;:0.0,&#34;b&#34;:0.0,&#34;a&#34;:1.0},&#34;position&#34;:1.0}],&#34;stopsVar&#34;:[{&#34;color&#34;:{&#34;r&#34;:1.0,&#34;g&#34;:1.0,&#34;b&#34;:1.0,&#34;a&#34;:1.0},&#34;position&#34;:0.0},{&#34;color&#34;:{&#34;r&#34;:0.25882354378700256,&#34;g&#34;:0.52156865596771240,&#34;b&#34;:0.95686274766921997,&#34;a&#34;:1.0},&#34;position&#34;:0.50},{&#34;color&#34;:{&#34;r&#34;:0.0,&#34;g&#34;:0.0,&#34;b&#34;:0.0,&#34;a&#34;:1.0},&#34;position&#34;:1.0}],&#34;transform&#34;:{&#34;m00&#34;:9.7971748206813428e-16,&#34;m01&#34;:-16.0,&#34;m02&#34;:20.0,&#34;m10&#34;:16.0,&#34;m11&#34;:9.7971748206813428e-16,&#34;m12&#34;:4.0},&#34;opacity&#34;:1.0,&#34;blendMode&#34;:&#34;NORMAL&#34;,&#34;visible&#34;:true}"
        stroke="black"
        stroke-width="0.5"
      />
      <defs>
        <clipPath id="paint0_diamond_24823_27696_clip_path">
          <path
            d="M5.50481 15.75L12 4.5L18.4952 15.75H5.50481Z"
            stroke-width="0.5"
          />
        </clipPath>
        <linearGradient
          id="paint0_diamond_24823_27696"
          x1="0"
          y1="0"
          x2="500"
          y2="500"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="white" />
          <stop offset="0.5" stop-color="#4285F4" />
          <stop offset="1" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default AdventurerBadge;
