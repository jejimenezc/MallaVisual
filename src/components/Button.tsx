import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'secondary'
      ? 'btn-secondary'
      : '';
  const classes = ['btn', variantClass, className].filter(Boolean).join(' ');
  return <button className={classes} {...props} />;
};