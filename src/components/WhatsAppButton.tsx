import { Button } from "./ui/button";

const WhatsAppIcon = () => (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8 text-white"
      fill="currentColor"
    >
      <path d="M12 2.04C6.5 2.04 2.04 6.5 2.04 12c0 1.8 0.5 3.5 1.4 5l-1.1 4.1 4.2-1.1c1.4 0.8 3 1.3 4.6 1.3h0.1c5.5 0 9.9-4.5 9.9-9.9S17.5 2.04 12 2.04zM16.5 13.5c-0.2-0.1-1.2-0.6-1.4-0.7s-0.4-0.1-0.5 0.1-0.5 0.7-0.7 0.8c-0.1 0.1-0.3 0.2-0.5 0.1s-1-0.4-1.9-1.1c-0.7-0.6-1.2-1.4-1.3-1.6s0-0.3 0.1-0.4c0.1-0.1 0.2-0.3 0.4-0.4 0.1-0.1 0.2-0.2 0.2-0.3s0-0.2-0.1-0.3c-0.1-0.1-0.5-1.2-0.7-1.6s-0.4-0.4-0.5-0.4-0.3 0-0.5 0c-0.2 0-0.4 0.1-0.6 0.3s-0.8 0.8-0.8 1.9c0 1.1 0.8 2.2 1 2.3s1.6 2.5 3.9 3.4c0.5 0.2 0.9 0.3 1.2 0.4 0.5 0.1 1 0.1 1.4-0.1 0.4-0.2 1.2-0.5 1.3-1s0.2-0.9 0.1-1c-0.1-0.1-0.2-0.2-0.4-0.3z"/>
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
                className="bg-[#25D366] hover:bg-[#128C7E] rounded-full w-14 h-14 shadow-lg"
            >
                <WhatsAppIcon />
            </Button>
        </a>
    )
}