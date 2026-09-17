import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const inputBase =
  "w-full rounded-md bg-muted px-4 h-12 text-sm font-medium text-foreground placeholder:text-gray-400 outline-none border-2 border-transparent transition-all duration-200 focus:bg-white focus:border-primary";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputBase, className)} {...props} />;
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputBase, "h-auto min-h-24 py-3", className)} {...props} />;
});