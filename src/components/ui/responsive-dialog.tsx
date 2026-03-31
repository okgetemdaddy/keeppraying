import * as React from "react";
import { useIsTouch } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
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
interface ResponsiveDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ResponsiveDialog({ children, ...props }: ResponsiveDialogProps) {
  const isTouch = useIsTouch();
  if (isTouch) return <Drawer {...props}>{children}</Drawer>;
  return <Dialog {...props}>{children}</Dialog>;
}

/* ── Content ── */
export const ResponsiveDialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { [key: string]: any }
>(({ children, className, ...props }, ref) => {
  const isTouch = useIsTouch();
  if (isTouch) {
    return (
      <DrawerContent ref={ref} className={cn("max-h-[85vh] px-4 pb-6", className)} {...props}>
        {children}
      </DrawerContent>
    );
  }
  return (
    <DialogContent ref={ref} className={className} {...props}>
      {children}
    </DialogContent>
  );
});
ResponsiveDialogContent.displayName = "ResponsiveDialogContent";

/* ── Header ── */
export function ResponsiveDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const isTouch = useIsTouch();
  if (isTouch) return <DrawerHeader className={className} {...props} />;
  return <DialogHeader className={className} {...props} />;
}

/* ── Title ── */
export const ResponsiveDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const isTouch = useIsTouch();
  if (isTouch) return <DrawerTitle ref={ref} className={className} {...props} />;
  return <DialogTitle ref={ref} className={className} {...props} />;
});
ResponsiveDialogTitle.displayName = "ResponsiveDialogTitle";

/* ── Description ── */
export const ResponsiveDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const isTouch = useIsTouch();
  if (isTouch) return <DrawerDescription ref={ref} className={className} {...props} />;
  return <DialogDescription ref={ref} className={className} {...props} />;
});
ResponsiveDialogDescription.displayName = "ResponsiveDialogDescription";

/* ── Footer ── */
export function ResponsiveDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const isTouch = useIsTouch();
  if (isTouch) return <DrawerFooter className={className} {...props} />;
  return <DialogFooter className={className} {...props} />;
}

/* ── Close ── */
export const ResponsiveDialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const isTouch = useIsTouch();
  if (isTouch) return <DrawerClose ref={ref} className={className} {...props} />;
  return <DialogClose ref={ref} className={className} {...props} />;
});
ResponsiveDialogClose.displayName = "ResponsiveDialogClose";

/* ── Trigger ── */
export const ResponsiveDialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const isTouch = useIsTouch();
  if (isTouch) return <DrawerTrigger ref={ref} className={className} {...props} />;
  return <DialogTrigger ref={ref} className={className} {...props} />;
});
ResponsiveDialogTrigger.displayName = "ResponsiveDialogTrigger";
