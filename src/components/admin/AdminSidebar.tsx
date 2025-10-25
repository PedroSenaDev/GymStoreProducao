"use client";

import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import React, { useState, createContext, useContext } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "../Logo";
import { useIsMobile } from "@/hooks/use-mobile";

interface Links {
  label: string;
  to: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean; // This will now be for the mobile overlay
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

// The provider now just manages the mobile menu state.
export const SidebarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

// The Sidebar component is now just a wrapper for the provider.
export const Sidebar = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <SidebarProvider>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
    </>
  );
};

// DesktopSidebar is now static. No hover, no transitions.
export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "h-full px-4 py-6 hidden md:flex md:flex-col bg-sidebar flex-shrink-0 w-[260px]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// MobileSidebar still uses the context to show/hide.
export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-16 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-sidebar border-b w-full"
        )}
        {...props}
      >
        <div className="text-sidebar-foreground">
          <Logo />
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 rounded-md hover:bg-sidebar-accent">
          <Menu className="text-sidebar-foreground" />
        </button>
      </div>
      {open && (
        <div
          className={cn(
            "fixed h-full w-full inset-0 bg-background p-10 z-[100] flex flex-col justify-between",
            className
          )}
        >
          <div
            className="absolute right-10 top-10 z-50 text-foreground cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            <X />
          </div>
          {children}
        </div>
      )}
    </>
  );
};

// SidebarHeader is now static on desktop.
export const SidebarHeader = ({ children }: { children: React.ReactNode }) => {
    return (
        <div 
            className={cn(
                "flex items-center gap-2 px-2 mb-10 h-8 overflow-hidden justify-start"
            )}
        >
            {children}
        </div>
    );
}

// SidebarLink text is now always visible on desktop.
export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  const { setOpen } = useSidebar();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isActive = location.pathname === link.to;

  const handleClick = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <Link
      to={link.to}
      onClick={handleClick}
      className={cn(
        "flex items-center justify-start gap-4 group/sidebar p-3 rounded-lg",
        isActive 
          ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" 
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        className
      )}
      {...props}
    >
      <div className="flex-shrink-0">{link.icon}</div>
      <span
        className={cn(
            "text-sm font-medium whitespace-pre"
        )}
      >
        {link.label}
      </span>
    </Link>
  );
};