"use client";

import React, { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  opacity: number;
}

const COLORS = ["#2F5DFF", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#38BDF8"];

export function triggerConfetti() {
  const event = new CustomEvent("keel-confetti-trigger");
  window.dispatchEvent(event);
}

export default function ConfettiCelebration() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const handleTrigger = () => {
      const newParticles: Particle[] = [];
      const count = 50;
      for (let i = 0; i < count; i++) {
        newParticles.push({
          id: Math.random(),
          x: window.innerWidth / 2 + (Math.random() * 200 - 100),
          y: window.innerHeight * 0.7,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: Math.random() * 8 + 6,
          vx: (Math.random() - 0.5) * 14,
          vy: -(Math.random() * 12 + 10),
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 20,
          opacity: 1,
        });
      }
      setParticles((prev) => [...prev, ...newParticles]);
    };

    window.addEventListener("keel-confetti-trigger", handleTrigger);
    return () => window.removeEventListener("keel-confetti-trigger", handleTrigger);
  }, []);

  useEffect(() => {
    if (particles.length === 0) return;

    const frame = requestAnimationFrame(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.5, // gravity
            rotation: p.rotation + p.vRot,
            opacity: p.opacity - 0.015,
          }))
          .filter((p) => p.opacity > 0 && p.y < window.innerHeight)
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [particles]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            borderRadius: "2px",
            transform: `rotate(${p.rotation}deg)`,
            opacity: p.opacity,
            transition: "none",
          }}
        />
      ))}
    </div>
  );
}
