const Icon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      fill="none"
      className={className}
      viewBox="0 0 20 20"
    >
      <path
        fill="#3D4863"
        d="M15.833 2.5H4.167c-.925 0-1.667.75-1.667 1.667v11.666c0 .917.742 1.667 1.667 1.667h11.666c.917 0 1.667-.75 1.667-1.667V4.167c0-.917-.75-1.667-1.667-1.667Zm-1.666 8.333h-3.334v3.334H9.167v-3.334H5.833V9.167h3.334V5.833h1.666v3.334h3.334v1.666Z"
      />
    </svg>
  );
};

export default Icon;
