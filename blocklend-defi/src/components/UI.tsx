import { cn } from '../lib/utils';
import React, { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  glow?: boolean;
}

export const GlassCard = ({ children, className, elevated, glow }: GlassCardProps) => {
  return (
    <div className={cn(
      elevated ? "glass-elevated" : "glass-card",
      glow && "glow-subtle",
      "rounded-xl p-6 relative overflow-hidden",
      className
    )}>
      {children}
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  ...props 
}: ButtonProps) => {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_0_20px_rgba(125,211,252,0.2)]",
    secondary: "bg-tertiary text-on-tertiary hover:brightness-110",
    outline: "border border-primary/20 text-primary hover:bg-primary/10",
    ghost: "text-on-surface-variant hover:text-on-surface hover:bg-white/5",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2 text-sm",
    lg: "px-8 py-3 text-base",
  };

  return (
    <button 
      className={cn(
        "rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Badge = ({ children, className, variant = 'info' }: { children: ReactNode, className?: string, variant?: 'info' | 'success' | 'warning' | 'error' }) => {
  const variants = {
    info: "bg-primary/10 text-primary border-primary/20",
    success: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    warning: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    error: "bg-error/10 text-error border-error/20",
  };

  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};
