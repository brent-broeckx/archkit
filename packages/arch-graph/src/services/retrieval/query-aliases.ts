export const RETRIEVAL_ALIASES: Record<string, string[]> = {
  auth: ['authentication', 'authorization', 'token', 'jwt', 'login'],
  authentication: ['auth', 'authorization', 'token', 'jwt', 'login'],
  authorization: ['auth', 'authentication', 'rbac', 'acl'],
  login: ['auth', 'authentication', 'signin', 'sign-in'],
  logging: ['logger', 'log', 'observability'],
  payment: ['payments', 'billing', 'invoice', 'checkout'],
  payments: ['payment', 'billing', 'invoice', 'checkout'],
}
