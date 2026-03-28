import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const TYPE_ICONS: Record<string, string> = {
  standby_response: "🙏",
  prayer_shared: "📖",
  streak_milestone: "🔥",
  group_prayer: "👥",
  family_prayer: "🏠",
  urgent_prayer: "⚡",
  admin_prayer: "✨",
  praying_for_you: "💛",
  general: "🔔",
};

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onClose,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const icon = TYPE_ICONS[notification.type] || TYPE_ICONS.general;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors group",
        notification.is_read
          ? "bg-transparent"
          : "bg-primary/[0.04]"
      )}
    >
      {/* Icon */}
      <span className="text-lg mt-0.5 flex-shrink-0 select-none">{icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-snug",
            notification.is_read ? "text-muted-foreground" : "text-foreground font-medium"
          )}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo}</p>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.is_read && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarkRead(notification.id); }}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(notification.id); }}
          className="p-1 rounded-lg hover:bg-destructive/10 transition-colors"
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <div className="flex-shrink-0 mt-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
        </div>
      )}
    </div>
  );

  if (notification.link) {
    return (
      <Link to={notification.link} onClick={() => { onMarkRead(notification.id); onClose(); }}>
        {content}
      </Link>
    );
  }

  return <div onClick={() => onMarkRead(notification.id)} className="cursor-pointer">{content}</div>;
}

interface NotificationBellProps {
  dark?: boolean;
  scrolled?: boolean;
}

export function NotificationBell({ dark, scrolled }: NotificationBellProps) {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!user) return null;

  const bellColor = dark
    ? "text-white/70 hover:text-white"
    : scrolled
    ? "text-foreground/70 hover:text-foreground"
    : "text-white/70 hover:text-white";

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn("relative p-2 rounded-xl transition-colors", bellColor, dark ? "hover:bg-white/10" : scrolled ? "hover:bg-muted" : "hover:bg-white/10")}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1 shadow-sm"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Notification panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Mobile: full screen backdrop */}
            <div className="fixed inset-0 z-40 md:hidden bg-black/20" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "absolute right-0 top-full mt-2 z-50 rounded-2xl border border-border bg-card/98 backdrop-blur-xl shadow-xl overflow-hidden",
                "w-[calc(100vw-2rem)] max-w-[380px]",
                "md:w-[380px]"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 rounded-lg hover:bg-muted transition-colors md:hidden"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Notifications list */}
              <div className="max-h-[60vh] overflow-y-auto overscroll-contain divide-y divide-border/50">
                {notifications.length === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      When someone prays for you or shares encouragement, you'll see it here.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onMarkRead={markAsRead}
                      onDelete={deleteNotification}
                      onClose={() => setOpen(false)}
                    />
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
