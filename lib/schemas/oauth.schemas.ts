import { z } from "zod";

export const registerClientSchema = z.object({
  redirect_uris: z.array(z.string().url()).min(1),
  client_name: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
});

export const authorizeQuerySchema = z.object({
  state: z.string().min(1),
  redirect_uri: z.string().url(),
  client_id: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.string().optional(),
});

export const callbackParamsSchema = z.object({
  flowId: z.string().uuid(),
});

export const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export const tokenExchangeSchema = z.object({
  code: z.string().min(1),
  grant_type: z.string().min(1),
  redirect_uri: z.string().url(),
  code_verifier: z.string().optional(),
});

export type RegisterClientInput = z.infer<typeof registerClientSchema>;
export type AuthorizeQueryInput = z.infer<typeof authorizeQuerySchema>;
export type CallbackParamsInput = z.infer<typeof callbackParamsSchema>;
export type CallbackQueryInput = z.infer<typeof callbackQuerySchema>;
export type TokenExchangeInput = z.infer<typeof tokenExchangeSchema>;
