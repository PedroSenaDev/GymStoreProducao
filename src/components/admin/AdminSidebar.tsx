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
  open: boolean;
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

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen}>
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

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className={cn(
        "h-full px-4 py-6 hidden md:flex md:flex-col bg-sidebar flex-shrink-0 transition-all duration-300 ease-in-out",
        open ? "w-[260px]" : "w-[72px]",
        className
      )}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </div>
  );
};

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


export const SidebarHeader = ({ children }: { children: React.ReactNode }) => {
    const { open } = useSidebar();
    return (
        <div 
            className={cn(
                "flex items-center gap-2 px-2 mb-10 h-8 overflow-hidden",
                open ? "justify-start" : "justify-center"
            )}
        >
            {children}
        </div>
    );
}

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  const { open, setOpen } = useSidebar();
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
        "flex items-center justify-start gap-4 group/sidebar p-3 rounded-lg transition-colors",
        isActive 
          ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" 
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        !open && "justify-center",
        className
      )}
      {...props}
    >
      <div className="flex-shrink-0">{link.icon}</div>
      <span
        className={cn(
            "text-sm font-medium whitespace-pre transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {link.label}
      </span>
    </Link>
  );
};