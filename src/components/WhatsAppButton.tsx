import { Button } from "./ui/button";

const WhatsAppIcon = () => (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8 text-white"
      fill="currentColor"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.38 1.25 4.82l-1.34 4.88 5-1.32c1.37.76 2.91 1.18 4.51 1.18h.01c5.46 0 9.91-4.45 9.91-9.91s-4.45-9.91-9.91-9.91zM17.43 14.39c-.21-.11-1.25-.62-1.44-.69-.2-.07-.34-.11-.49.11-.15.22-.55.69-.67.83-.13.14-.25.16-.46.05-.21-.11-1.04-.38-1.98-1.22-.73-.66-1.22-1.47-1.36-1.72-.14-.25-.02-.38.1-.5.11-.11.25-.28.37-.42.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.42-.06-.11-.49-1.17-.67-1.6-.18-.42-.36-.36-.49-.37-.12-.01-.26-.01-.4-.01-.14 0-.38.05-.57.27-.2.22-.76.75-.76 1.83 0 1.08.78 2.12.89 2.27.11.15 1.51 2.3 3.66 3.21.52.22.93.35 1.25.45.52.16.99.14 1.36.08.42-.06 1.25-.51 1.42-.99.18-.48.18-.89.12-.99-.05-.1-.2-.16-.41-.27z"/>
    </svg>
);

export const WhatsAppButton = () => {
    return (
        <a 
            href="https://wa.me/5511999999999" // Replace with your WhatsApp number
            target="_blank" 
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50"
        >
            <Button
                size="icon"
                className="bg-[#25D366] hover:bg-[#128C7E] rounded-full w-14 h-14 shadow-lg flex items-center justify-center"
            >
                <WhatsAppIcon />
            </Button>
        </a>
    )
}