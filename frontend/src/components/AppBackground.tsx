import React from "react";
import eventdekkLogo from "@/assets/eventdekk_logo.png";

export const AppBackground = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      {/* Primary logo background */}
      <div
        className="absolute top-0 left-0 -z-10 h-[50rem] w-[90rem] -rotate-30 rounded-full opacity-10 blur-[6rem] -translate-x-1/3 -translate-y-1/3"
        style={{
          backgroundImage: `url(${eventdekkLogo})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          filter: "hue-rotate(15deg) saturate(1.2) blur(4rem)",
        }}
      />

      {/* Secondary logo background */}
      <div
        className="absolute bottom-0 right-0 -z-10 h-[55rem] w-[85rem] -rotate-200 rounded-full opacity-8 blur-[5rem] translate-x-1/3 translate-y-1/3"
        style={{
          backgroundImage: `url(${eventdekkLogo})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          filter: "hue-rotate(-10deg) saturate(0.8) blur(4rem)",
          animationDelay: "1s",
        }}
      />

      {/* Accent */}
      <div
        className="absolute top-1/3 right-1/4 -z-10 h-[30rem] w-[60rem] rotate-20 rounded-full opacity-8 blur-[8rem]"
        style={{
          backgroundImage: `url(${eventdekkLogo})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          filter: "hue-rotate(30deg) saturate(1.5) brightness(1.2) blur(5rem)",
        }}
      />

      {/* Gradient & Noise */}
      <div className="absolute inset-0 -z-5 bg-gradient-to-br from-transparent via-background/5 to-background/20" />
      <div
        className="absolute inset-0 -z-5 opacity-[0.02] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
