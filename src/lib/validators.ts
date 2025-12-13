// Basic CPF validation (checks for format 000.000.000-00)
export const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/[^\d]/g, "");
  
  // 1. Check if it has 11 digits
  if (cleaned.length !== 11) return false;

  // 2. Checks for repeated digits (e.g., 11111111111)
  if (/^(\d)\1+$/.test(cleaned)) return false; 
  
  // Note: We skip the full complex CPF algorithm check for simplicity, 
  // relying on length and repetition checks for basic validation.
  
  return true;
};

// Basic phone validation (Brazilian format: (00) 00000-0000 or (00) 0000-0000)
export const isValidPhone = (phone: string): boolean => {
  // Regex para (00) 00000-0000 (celular) ou (00) 0000-0000 (fixo)
  const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/;
  
  // Garante que o número de dígitos seja 10 (fixo) ou 11 (celular)
  const cleaned = phone.replace(/[^\d]/g, "");
  if (cleaned.length !== 10 && cleaned.length !== 11) return false;

  return phoneRegex.test(phone);
};