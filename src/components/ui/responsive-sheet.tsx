import * as React from "react";
import { useIsTouch } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

/* ── Root ── */
interface ResponsiveSheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ResponsiveSheet({ children, ...props }: ResponsiveSheetProps) {
  const isTouch = useIsTouch();
  if (isTouch) return <Drawer {...props}>{children}</Drawer>;
  return <Sheet {...props}>{children}</Sheet>;
}

/* ── Content ── */
interface ResponsiveSheetContentProps {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  [key: string]: any;
}

export const ResponsiveSheetContent = React.forwardRef<
  HTMLDivElement,
  ResponsiveSheetContentProps
>(({ children, className, side = "right", ...props }, ref) => {
  const isTouch = useIsTouch();
  if (isTouch) {
    return (
      <DrawerContent ref={ref} className={cn("max-h-[85vh]", className)} {...props}>
        {children}
      </DrawerContent>
    );
  }
  return (
    <SheetContent ref={ref} side={side} className={className} {...props}>
      {children}
    </SheetContent>
  );
});
ResponsiveSheetContent.displayName = "ResponsiveSheetContent";

/* ── Header ── */
export function ResponsiveSheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const isTouch = useIsTouch();
  if (isTouch) return <DrawerHeader className={className} {...props} />;
  return <SheetHeader className={className} {...props} />;
}

/* ── Title ── */
export const ResponsiveSheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const isTouch = useIsTouch();
  if (isTouch) return <DrawerTitle ref={ref} className={className} {...props} />;
  return <SheetTitle ref={ref} className={className} {...props} />;
});
ResponsiveSheetTitle.displayName = "ResponsiveSheetTitle";

/* ── Description ── */
export const ResponsiveSheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const isTouch = useIsTouch();
  if (isTouch) return <DrawerDescription ref={ref} className={className} {...props} />;
  return <SheetDescription ref={ref} className={className} {...props} />;
});
ResponsiveSheetDescription.displayName = "ResponsiveSheetDescription";

/* ── Footer ── */
export function ResponsiveSheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const isTouch = useIsTouch();
  if (isTouch) return <DrawerFooter className={className} {...props} />;
  return <SheetFooter className={className} {...props} />;
}

/* ── Close ── */
export const ResponsiveSheetClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const isTouch = useIsTouch();
  if (isTouch) return <DrawerClose ref={ref} className={className} {...props} />;
  return <SheetClose ref={ref} className={className} {...props} />;
});
ResponsiveSheetClose.displayName = "ResponsiveSheetClose";

/* ── Trigger ── */
export const ResponsiveSheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const isTouch = useIsTouch();
  if (isTouch) return <DrawerTrigger ref={ref} className={className} {...props} />;
  return <SheetTrigger ref={ref} className={className} {...props} />;
});
ResponsiveSheetTrigger.displayName = "ResponsiveSheetTrigger";
