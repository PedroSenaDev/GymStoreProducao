const errorMap: { [key: string]: string } = {
  'For security purposes, you can only request this after': 'Por motivos de segurança, aguarde um momento antes de tentar novamente.',
  'Email not confirmed': 'Sua conta precisa ser confirmada. Verifique seu e-mail.',
  'Invalid login credentials': 'E-mail ou senha inválidos. Por favor, tente novamente.',
  'User already registered': 'Este e-mail já está cadastrado. Tente fazer login ou recuperar sua senha.',
  'Unable to validate email address: invalid format': 'O formato do e-mail é inválido.',
  'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres.',
  'Invalid OTP': 'Código de verificação inválido ou expirado. Tente novamente.',
  'Token has expired or is invalid': 'O código de verificação é inválido ou expirou. Por favor, solicite um novo.',
};

export const translateSupabaseError = (errorMessage: string): string => {
  for (const key in errorMap) {
    if (errorMessage.includes(key)) {
      return errorMap[key];
    }
  }
  return errorMessage; // Fallback to the original message if no translation is found
};