import React from "react";

export const createMarkerIconStyle = (
  isHub = false,
  sizeOverride?: number
): React.CSSProperties => {
  const baseSize = isHub ? 18 : 14;
  const size = sizeOverride || baseSize;
  return {
    width: `${size}px`,
    height: `${size}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };
};

export const AirportSVGIcon: React.FC<{
  color: string;
  resolvedTheme: "light" | "dark";
  isHub?: boolean;
  size?: number;
}> = ({ color, resolvedTheme, isHub = false, size: customSize }) => {
  const baseSize = isHub ? 18 : 14;
  const size = customSize || baseSize;
  const strokeColor = resolvedTheme === "dark" ? "#FFFFFF" : "#000000";
  const strokeWidth = 1.5;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible" }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={(size - strokeWidth) / 2}
        fill={color}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {isHub && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 4}
          fill={strokeColor}
        />
      )}
    </svg>
  );
};

export const AircraftSVGIcon: React.FC<{
  heading: number;
  color?: string;
  stroke?: string;
  size?: number;
}> = ({ heading, color = "white", stroke = "black", size = 22 }) => {
  return (
    <div
      style={{
        transform: `rotate(${heading}deg)`,
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
      >
        <path
          d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
          fill={color}
          stroke={stroke}
          strokeWidth={0.5}
        />
      </svg>
    </div>
  );
};
