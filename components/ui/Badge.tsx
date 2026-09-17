import { cn } from "@/lib/cn";

const colors: Record<string, string> = {
  green: "bg-secondary text-white",
  blue: "bg-primary text-white",
  amber: "bg-accent text-white",
  red: "bg-red-500 text-white",
  gray: "bg-gray-300 text-gray-900",
};

export default function Badge({
  color = "gray",
  children,
  className,
}: {
  color?: keyof typeof colors;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
        colors[color] ?? colors.gray,
        className
      )}
    >
      {children}
    </span>
  );
}