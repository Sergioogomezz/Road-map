import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg shadow-[0_8px_20px_-10px_var(--primary)] hover:bg-primary-strong',
  secondary: 'bg-surface-2 text-fg hover:bg-surface-3',
  soft: 'bg-primary-soft text-primary-text hover:brightness-95',
  ghost: 'bg-transparent text-fg-2 hover:bg-surface-2',
  danger: 'bg-danger-soft text-danger-text hover:brightness-95',
  outline: 'bg-surface text-fg border border-line-strong hover:bg-surface-2',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-4 text-[15px] gap-2 rounded-2xl',
  lg: 'h-13 px-5 text-base gap-2.5 rounded-2xl',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  full?: boolean
}

export function Button({ variant = 'primary', size = 'md', icon, iconRight, full, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'press inline-flex select-none items-center justify-center font-semibold whitespace-nowrap disabled:opacity-45',
        variants[variant],
        sizes[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: 'ghost' | 'soft' | 'solid' | 'surface'
  size?: 'sm' | 'md' | 'lg'
}

const iconVariants = {
  ghost: 'text-fg-2 hover:bg-surface-2',
  soft: 'bg-surface-2 text-fg hover:bg-surface-3',
  solid: 'bg-primary text-primary-fg',
  surface: 'bg-surface text-fg shadow-card border border-line',
}
const iconSizes = { sm: 'size-8', md: 'size-10', lg: 'size-12' }

export function IconButton({ label, variant = 'ghost', size = 'md', className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn('press inline-flex shrink-0 items-center justify-center rounded-full disabled:opacity-40', iconVariants[variant], iconSizes[size], className)}
      {...rest}
    >
      {children}
    </button>
  )
}
