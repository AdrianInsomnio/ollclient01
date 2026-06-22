/**
 * Configuracion del modo de autenticacion en el cliente.
 *
 * NEXT_PUBLIC_AUTH_VIA_COOKIE sincroniza con el flag del backend
 * (AUTH_VIA_COOKIE). Si esta en 'true':
 *   - El cliente NO envia Authorization header.
 *   - El cliente envia credentials: 'include' para que el navegador
 *     incluya la cookie HttpOnly en cada request.
 *   - El login/logout se hace contra los endpoints del backend que
 *     setean/limpian la cookie.
 *
 * Si esta en 'false' (default durante la transicion): el cliente sigue
 * usando el token en localStorage y lo envia en Authorization.
 *
 * IMPORTANTE: el switch debe hacerse en backend y frontend al mismo
 * tiempo, sino las requests fallan con 401.
 */
export const AUTH_VIA_COOKIE: boolean =
  String(process.env.NEXT_PUBLIC_AUTH_VIA_COOKIE || 'false').toLowerCase() === 'true'
