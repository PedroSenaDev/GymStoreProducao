"use client";

import React, { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface ShineButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export const ShineButton = ({
  children,
  className,
  ...props
}: ShineButtonProps) => {
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <button
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-black px-6 py-3 font-medium text-white transition-all duration-300",
        "hover:shadow-[0_0_20px_5px_rgba(255,255,255,0.2)]",
        className
      )}
      style={
        {
          "--mouse-x": "0px",
          "--mouse-y": "0px",
        } as CSSProperties
      }
      {...props}
    >
      {/* Spotlight effect */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(300px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.2), transparent)",
        }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
};