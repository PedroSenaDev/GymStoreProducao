// Basic CPF validation (doesn't check digits, just format)
export const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/[^\d]/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false; // Checks for repeated digits
  return true;
};

// Basic phone validation (Brazilian format)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
  return phoneRegex.test(phone);
};