import React from 'react';

interface LionIconProps {
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  size?: number | string;
}

export const LionIcon: React.FC<LionIconProps> = ({ 
  className = '', 
  style = {}, 
  color = '#FFD700', 
  size = 24 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Lion silhouette based on the Venice lion design */}
      <path
        d="M75 25c3-2 6-1 8 1 2 3 1 6-1 8-1 1-2 1-3 2 1 2 3 4 3 7 0 4-3 7-6 9-1 1-2 3-2 5 0 3 2 5 2 8 0 4-2 7-5 9-2 2-5 2-8 3-2 0-4 1-6 2-3 2-7 3-11 3-5 0-9-2-12-5-2-2-3-5-5-7-1-2-3-3-4-5-2-3-2-7-1-10 1-2 3-4 4-6 1-3 1-6 3-8 2-3 5-5 7-8 1-2 1-5 3-7 2-2 5-2 7-4 3-2 5-5 8-6 2-1 5 0 7-1 2-1 3-3 5-4z"
        fill={color}
      />
      {/* Mane details */}
      <path
        d="M20 35c2-3 5-5 8-6 2-1 5 0 7-1 1-1 2-2 4-2 2 0 4 1 5 3 1 2 0 4 1 6 1 1 3 1 4 2 2 2 2 5 1 7-1 2-3 3-4 5-1 2-1 4-2 6-1 3-3 5-5 7-2 1-4 1-6 2-2 1-4 3-7 3-2 0-4-1-5-3-1-2 0-4-1-6-1-2-3-3-3-5 0-3 2-5 2-8 0-2-1-4 0-6 1-2 3-3 4-5z"
        fill={color}
        opacity="0.8"
      />
      {/* Body */}
      <path
        d="M35 45c5-2 11-1 16 1 4 2 7 5 9 9 2 4 2 9 1 13-1 4-4 7-7 9-3 2-7 3-11 3-4 0-8-1-11-3-3-2-5-5-6-8-1-4-1-8 0-12 1-4 4-7 7-9 1-1 2-2 2-3z"
        fill={color}
      />
      {/* Legs */}
      <path
        d="M30 70c0 3 0 6 0 9 0 2 1 4 3 5 1 1 3 1 4 0 1-1 1-3 1-4 0-3 0-7 0-10z"
        fill={color}
      />
      <path
        d="M40 72c0 3 0 6 0 9 0 2 1 3 2 4 1 1 2 1 3 0 1-1 1-2 1-3 0-3 0-7 0-10z"
        fill={color}
      />
      <path
        d="M55 72c0 3 0 6 0 9 0 2 1 3 2 4 1 1 2 1 3 0 1-1 1-2 1-3 0-3 0-7 0-10z"
        fill={color}
      />
      <path
        d="M65 70c0 3 0 6 0 9 0 2 1 4 3 5 1 1 3 1 4 0 1-1 1-3 1-4 0-3 0-7 0-10z"
        fill={color}
      />
      {/* Tail */}
      <path
        d="M70 55c3 1 5 3 6 6 1 2 1 5 2 7 1 3 3 5 5 7 1 1 3 1 4 2 1 2 0 4-1 5-2 1-4 0-6-1-3-1-5-4-7-6-2-3-3-6-4-9-1-2-1-5-2-7 0-2 1-4 3-4z"
        fill={color}
        opacity="0.9"
      />
    </svg>
  );
};

export default LionIcon;