import { Button } from "./ui/button";

const WhatsAppIcon = () => (
    <img src="/whatsapp-icon.png" alt="WhatsApp" className="h-8 w-8" />
);

export const WhatsAppButton = () => {
    return (
        <a 
            href="https://api.whatsapp.com/send/?phone=5538998940253&text=Ol%C3%A1%2C+vim+do+instagram.+%0AGostaria%E2%80%A6&type=phone_number&app_absent=0"
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