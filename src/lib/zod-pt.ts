import { z, ZodErrorMap, ZodIssueCode } from 'zod';

const customErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.expected === 'string') {
        return { message: 'Este campo deve ser um texto.' };
      }
      if (issue.expected === 'number') {
        return { message: 'Este campo deve ser um número.' };
      }
      return { message: `Tipo inválido. Esperado ${issue.expected}, recebido ${issue.received}` };
    
    case ZodIssueCode.too_small:
      if (issue.type === 'string') {
        if (issue.minimum === 1) {
          return { message: 'Este campo é obrigatório.' };
        }
        return { message: `Deve conter no mínimo ${issue.minimum} caractere(s).` };
      }
      if (issue.type === 'number') {
        return { message: `O número deve ser no mínimo ${issue.minimum}.` };
      }
      return { message: `Inválido: deve conter no mínimo ${issue.minimum} item(ns).` };

    case ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: `Deve conter no máximo ${issue.maximum} caractere(s).` };
      }
      if (issue.type === 'number') {
        return { message: `O número deve ser no máximo ${issue.maximum}.` };
      }
      return { message: `Inválido: deve conter no máximo ${issue.maximum} item(ns).` };

    case ZodIssueCode.invalid_string:
      if (issue.validation === 'email') {
        return { message: 'E-mail inválido.' };
      }
      if (issue.validation === 'uuid') {
        return { message: 'UUID inválido.' };
      }
      if (issue.validation === 'url') {
        return { message: 'URL inválida.' };
      }
      break;

    case ZodIssueCode.invalid_enum_value:
      return { message: `Valor inválido. Valores esperados: ${issue.options.join(', ')}` };
    
    case ZodIssueCode.custom:
        return { message: `Erro customizado` };
  }

  return { message: ctx.defaultError };
};

z.setErrorMap(customErrorMap);

export { z };