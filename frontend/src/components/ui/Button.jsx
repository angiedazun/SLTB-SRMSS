import { motion } from 'framer-motion';

const variantClasses = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  success: 'btn-success',
  ghost: 'btn-ghost',
};

const sizeClasses = {
  sm: 'px-3.5 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight,
  fullWidth,
  className = '',
  disabled,
  ...props
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      className={`${variantClasses[variant]} ${size !== 'md' ? sizeClasses[size] : ''} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current/80 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {Icon && !iconRight && (
            <span className="btn-icon-badge">
              <Icon size={16} />
            </span>
          )}
          {children}
          {Icon && iconRight && (
            <span className="btn-icon-badge">
              <Icon size={16} />
            </span>
          )}
        </>
      )}
    </motion.button>
  );
}
