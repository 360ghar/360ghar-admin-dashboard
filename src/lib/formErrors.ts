/**
 * Map server / RTK Query errors onto react-hook-form fields.
 *
 * The backend returns every error in one envelope:
 *   422 → { error: { code: "VALIDATION_ERROR", message, details: { fields: [{ field, msg, type }] } } }
 *   other 4xx → { error: { code, message, details? } }  (or a network error with no body).
 *
 * `applyServerValidation` turns the former into per-field `setError` calls and
 * routes anything it can't map (plus generic failures) to the form `root`
 * error, which `<FormRootError>` renders at the top of the form.
 */
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { getErrorMessage, getFieldErrors } from '@/lib/errors'

/** `field` keeps its source prefix: `body.price`, `query.limit`, `path.id`. */
const LOC_PREFIXES = new Set(['body', 'query', 'path', 'header', 'cookie'])

function capitalize(value: string): string {
  return value.length ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

/** Pull `{ field: message }` pairs out of a 422 envelope, if any. */
export function extractFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  for (const item of getFieldErrors(error)) {
    const segments = item.field.split('.').filter((part, index) => !(index === 0 && LOC_PREFIXES.has(part)))
    const field = segments.join('.')
    if (field && !(field in result)) {
      result[field] = capitalize(item.msg)
    }
  }
  return result
}

interface ApplyServerValidationOptions {
  /**
   * If provided, only these field names are set as inline field errors; any
   * server field outside the list is folded into the root error instead. Use
   * it to avoid setting errors on fields the form doesn't render.
   */
  knownFields?: readonly string[]
  /** Rename server field names to form field names (for example `deep_link` to `route`). Applied before `knownFields`. */
  fieldMap?: Readonly<Record<string, string>>
  /** Fallback root message when nothing maps to a field. */
  fallback?: string
}

/**
 * Apply a server error to a form. Returns `true` if at least one field-level
 * error was set (useful to decide whether to also surface a toast).
 *
 * Call `form.clearErrors()` at the start of your submit handler so stale
 * server errors don't linger across attempts.
 */
export function applyServerValidation<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  options?: ApplyServerValidationOptions,
): boolean {
  const fieldErrors = extractFieldErrors(error)
  const unmapped: string[] = []
  let appliedField = false

  for (const [serverField, message] of Object.entries(fieldErrors)) {
    const field = options?.fieldMap?.[serverField] ?? serverField
    if (options?.knownFields && !options.knownFields.includes(field)) {
      unmapped.push(message)
      continue
    }
    setError(field as Path<TFieldValues>, { type: 'server', message })
    appliedField = true
  }

  let rootMessage: string | undefined
  if (unmapped.length > 0) {
    rootMessage = unmapped.join(' ')
  } else if (!appliedField) {
    rootMessage = getErrorMessage(error, options?.fallback ?? 'Something went wrong. Please try again.')
  }

  if (rootMessage) {
    setError('root', { type: 'server', message: rootMessage })
  }

  return appliedField
}
