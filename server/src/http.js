import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (msg) => new HttpError(400, msg);
export const forbidden = (msg = 'No autorizado') => new HttpError(403, msg);
export const notFound = (msg = 'No encontrado') => new HttpError(404, msg);

/** Valide `data` avec un schéma zod et lève une 400 lisible en cas d'échec. */
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw badRequest(`${issue.path.join('.') || 'datos'}: ${issue.message}`);
  }
  return result.data;
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message ?? 'Datos inválidos' });
  }
  if (err?.type === 'entity.too.large' || err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Archivo demasiado grande' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error del servidor' });
}
