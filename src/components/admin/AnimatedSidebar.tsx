"use client";

import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  animate: boolean;
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
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-6 hidden md:flex md:flex-col bg-sidebar w-[260px] flex-shrink-0",
        className
      )}
      animate={{
        width: animate ? (open ? "260px" : "72px") : "260px",
      }}
      onMouseEnter={() => animate && setOpen(true)}
      onMouseLeave={() => animate && setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
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
          <Menu
            className="text-sidebar-foreground"
          />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const SidebarHeader = ({ children }: { children: React.ReactNode }) => {
    const { open, animate } = useSidebar();
    return (
        <motion.div 
            className="flex items-center gap-2 px-2 mb-10 h-8"
            animate={{
                justifyContent: animate ? (open ? "flex-start" : "center") : "flex-start",
            }}
        >
            {children}
        </motion.div>
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
  const { open, animate, setOpen } = useSidebar();
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
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm font-medium whitespace-pre"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};