
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef } from 'react';
import { SparklesIcon, SunIcon, MoonIcon } from '@heroicons/react/24/solid';

interface HeroProps {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
}

export const Hero: React.FC<HeroProps> = ({ theme, toggleTheme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef(theme);

  // Sync theme ref for the animation loop
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // --- Advanced "Big Bang" to "Ascension" Animation ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0, height = 0;
    let particles: Particle[] = [];
    let animationFrameId: number;
    let mouse = { x: -1000, y: -1000 };
    
    // Global animation state
    let frameCount = 0;

    // Configuration - Tuned for deeper, smoother, more transparent feel
    const properties = {
        particleCount: 180, 
        connectDistance: 200, 
        mouseRadius: 350,
        baseSpeed: 0.2, 
        explosionForce: 40, 
        drag: 0.94, 
        depth: 8, 
    };

    class Particle {
        x: number;
        y: number;
        z: number;
        vx: number;
        vy: number;
        baseSize: number;
        phase: number;
        spawnScale: number;
        
        // Physics state
        mode: 'exploding' | 'drifting';
        
        constructor(w: number, h: number) {
            // Start AT CENTER (The Singularity / Black Hole)
            this.x = w / 2;
            this.y = h / 2;
            this.z = Math.random() * properties.depth + 0.5;
            this.spawnScale = 0; // Start invisible and scale up

            // Explosion Velocity (Radial)
            const angle = Math.random() * Math.PI * 2;
            // Velocity varies by depth (parallax explosion)
            const force = properties.explosionForce * (Math.random() * 0.6 + 0.4);
            this.vx = Math.cos(angle) * force;
            this.vy = Math.sin(angle) * force;

            this.baseSize = Math.random() * 1.5 + 0.5;
            this.phase = Math.random() * Math.PI * 2;
            this.mode = 'exploding';
        }

        resetToBottom(w: number, h: number) {
            this.x = Math.random() * w;
            this.y = h + 20;
            this.z = Math.random() * properties.depth + 0.5;
            this.spawnScale = 0; // Reset animation
            // Gentle ascending velocity
            this.vx = (Math.random() - 0.5) * properties.baseSpeed * 0.5;
            this.vy = -(Math.random() * properties.baseSpeed + 0.15) * (1 / this.z);
            this.mode = 'drifting';
        }

        update(w: number, h: number) {
            // Scale up animation
            if (this.spawnScale < 1) {
                this.spawnScale += 0.02;
                if (this.spawnScale > 1) this.spawnScale = 1;
            }

            // Move
            this.x += this.vx;
            this.y += this.vy;

            if (this.mode === 'exploding') {
                // Apply drag to slow down the explosion
                this.vx *= properties.drag;
                this.vy *= properties.drag;

                // Transition to drifting when slow enough
                if (Math.abs(this.vx) < properties.baseSpeed * 2 && Math.abs(this.vy) < properties.baseSpeed * 2) {
                    this.mode = 'drifting';
                    // Seamlessly blend velocities to upward drift
                    this.vy = -(Math.random() * properties.baseSpeed + 0.15) * (1 / this.z);
                }
            } else {
                // Drifting Mode (Ascension)
                // If it goes off top, reset to bottom (Infinite Loop)
                if (this.y < -50) {
                    this.resetToBottom(w, h);
                }
                
                // Wrap X only in drifting mode
                if (this.x > w + 50) this.x = -50;
                if (this.x < -50) this.x = w + 50;

                // Mouse Interaction (Fluid magnetic field)
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance < properties.mouseRadius) {
                    const force = (properties.mouseRadius - distance) / properties.mouseRadius;
                    const push = force * 2 * (1/this.z); 
                    this.x -= (dx / distance) * push;
                    this.y -= (dy / distance) * push;
                }
            }

            this.phase += 0.005; // Slower pulse
        }

        draw(isDark: boolean, particles: Particle[]) {
            if (!ctx) return;

            // Opacity Logic
            let alpha = 0;

            if (this.mode === 'exploding') {
                 // Fade in during explosion
                 const speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
                 const excitement = Math.min(speed / 5, 1); 
                 alpha = 0.5 * excitement * (1/this.z); // Slightly reduced max brightness
            } else {
                // Drifting opacity (Standard)
                // 1. Vertical Fade (Top is bright, bottom is dim)
                const verticalFade = 1 - (this.y / height) * 0.5;
                // 2. Depth Fade
                const depthFade = Math.min(this.z / properties.depth, 1);
                // 3. Pulse
                const pulse = 1 + Math.sin(this.phase) * 0.15;
                
                // REDUCED GLOW: Lowered base alpha and multipliers
                alpha = 0.01 + (0.09 * depthFade * verticalFade * pulse);
            }

            // Colors
            const r = isDark ? 0 : 30;
            const g = isDark ? 210 : 60;
            const b = isDark ? 255 : 120;

            // Draw Particle (Soft Glow)
            const size = this.baseSize * this.z * this.spawnScale; // Apply spawn scale
            
            // Only draw larger particles as gradients to save performance
            if (size > 0.8) {
                const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size * 2.5);
                grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
                grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, size * 2, 0, Math.PI * 2);
            ctx.fill();

            // Connections
            // Only connect if drifting OR if exploding and close
            // And only if connected particle is also visible enough
            if (this.spawnScale > 0.2) {
                for (let j = 0; j < particles.length; j++) {
                    const p2 = particles[j];
                    if (this === p2) continue;
                    
                    // Skip connections to scaling-up particles if they are too small
                    if (p2.spawnScale < 0.2) continue;

                    // Don't connect different depths too much
                    if (Math.abs(this.z - p2.z) > 1.2) continue;

                    let dx = this.x - p2.x;
                    let dy = this.y - p2.y;
                    let dist = Math.sqrt(dx*dx + dy*dy);

                    const threshold = properties.connectDistance * (this.z * 0.8);

                    if (dist < threshold) {
                        // Darkened grid lines: Reduced multiplier from 0.3 to 0.15
                        const lineAlpha = (1 - (dist / threshold)) * alpha * 0.15 * Math.min(this.spawnScale, p2.spawnScale); 
                        if (lineAlpha > 0.005) {
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${lineAlpha})`;
                            ctx.lineWidth = 0.3 * this.z;
                            ctx.moveTo(this.x, this.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    }
                }
            }
        }
    }

    const init = () => {
        particles = [];
        for (let i = 0; i < properties.particleCount; i++) {
            particles.push(new Particle(width, height));
        }
    };

    const animate = () => {
        ctx.fillStyle = themeRef.current === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(249, 250, 251, 0.1)'; 
        ctx.fillRect(0, 0, width, height); 
        
        const isDark = themeRef.current === 'dark';

        particles.sort((a, b) => a.z - b.z);

        for (let i = 0; i < particles.length; i++) {
            particles[i].update(width, height);
            particles[i].draw(isDark, particles);
        }
        
        frameCount++;
        animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        init(); 
    };

    const handleMouseMove = (e: MouseEvent) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    // Initial Setup
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    init();
    animate();

    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        cancelAnimationFrame(animationFrameId);
    };
  }, []); 

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start pt-10 md:pt-14 overflow-hidden">
      {/* Background Canvas */}
      <canvas 
        ref={canvasRef} 
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      />
      
      {/* 1. Linear Gradient Overlay (Vertical Fade) */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 bg-gradient-to-t from-black/10 via-transparent to-transparent dark:from-black/30 dark:to-transparent" />

      {/* 2. Radial Gradient Overlay (Deep Vignette) */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.0)_20%,rgba(0,0,0,0.05)_100%)] dark:bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.3)_40%,rgba(0,0,0,0.95)_100%)]" />

      <div className="absolute top-4 right-4 z-20">
            <button 
                onClick={toggleTheme} 
                className="p-3 bg-white/10 dark:bg-black/20 hover:bg-black/10 dark:hover:bg-white/10 backdrop-blur-md rounded-full transition-all border border-black/5 dark:border-white/5 shadow-lg"
                title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {theme === 'dark' ? (
                    <SunIcon className="w-6 h-6 text-yellow-400" />
                ) : (
                    <MoonIcon className="w-6 h-6 text-slate-700" />
                )}
            </button>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-7xl mx-auto">
        
        {/* 1. Team Signature Badge */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500 mb-6 md:mb-8">
          <span className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/60 dark:bg-[#0a1428]/40 border border-blue-500/20 dark:border-[rgba(0,243,255,0.1)] shadow-lg backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:bg-white/80 dark:hover:bg-[#0a1428]/60">
            <span className="text-[#ff4d4d] font-mono tracking-widest font-bold drop-shadow-sm text-[10px] sm:text-xs md:text-sm">
              By Focus Media Team
            </span>
            <div className="relative flex items-center justify-center w-6 h-6">
                 <SparklesIcon className="w-6 h-6 text-yellow-500 dark:text-yellow-400 animate-pulse" />
                 <SparklesIcon className="absolute -bottom-1 -left-1 w-3 h-3 text-blue-500 dark:text-[#00f3ff] animate-bounce delay-75" />
            </div>
          </span>
        </div>

        {/* 2. Main Title */}
        <h1 className="text-5xl md:text-7xl font-black font-orbitron mb-2 tracking-tight animate-in slide-in-from-bottom-8 duration-1000 delay-300">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 drop-shadow-2xl">
            SVU AI STUDIO
          </span>
        </h1>

        {/* 3. Subtitle */}
        <h2 className="text-2xl md:text-3xl font-bold font-orbitron mb-6 tracking-wide animate-in slide-in-from-bottom-8 duration-1000 delay-500">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            Hedra Academic Zameel
          </span>
        </h2>

        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl font-medium leading-relaxed mb-12 animate-in slide-in-from-bottom-8 duration-1000 delay-700">
          رفيقك الأكاديمي الذكي للدراسة والتحليل
          <br />
          <span className="text-sm opacity-60 mt-2 block font-mono tracking-tight">
            نورٌ يُضيء درب تفوقك في الجامعة الافتراضية
          </span>
        </p>

      </div>
    </div>
  );
};
