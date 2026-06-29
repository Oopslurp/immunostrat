import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  className = "",
  variant = "secondary",
  type = "button",
  ...props
}: ButtonProps) {
  const variantClass = variant === "primary" ? "button-primary" : "";

  return (
    <button
      className={`button ${variantClass} ${className}`.trim()}
      type={type}
      {...props}
    />
  );
}
