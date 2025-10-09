import type {
  FieldError,
  FieldErrors,
  FieldValues,
  Resolver,
  ResolverOptions
} from 'react-hook-form'
import type { z } from 'zod'

type FieldErrorWithTypes = FieldError & {
  types?: Record<string, string>
}

type ErrorMap = Record<string, unknown>

const getPathSegments = (path: string) => path.match(/[^.[\]]+/g) ?? []

const getFromPath = (errors: ErrorMap, path: string): FieldErrorWithTypes | undefined => {
  const segments = getPathSegments(path)
  let current: unknown = errors

  for (const segment of segments) {
    if (typeof current !== 'object' || current === null) {
      return undefined
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return current as FieldErrorWithTypes | undefined
}

const setInPath = (errors: ErrorMap, path: Array<string | number>, error: FieldErrorWithTypes) => {
  let current: ErrorMap = errors

  path.forEach((segment, index) => {
    const key = typeof segment === 'number' ? String(segment) : segment
    const isLast = index === path.length - 1

    if (isLast) {
      const existing = current[key] as FieldErrorWithTypes | undefined
      if (existing) {
        current[key] = {
          ...existing,
          message: existing.message ?? error.message,
          type: existing.type ?? error.type,
          types: {
            ...(existing.types ?? {}),
            [error.type ?? 'validation']: error.message ?? existing.message
          }
        }
        return
      }

      current[key] = error
      return
    }

    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    }

    current = current[key] as ErrorMap
  })
}

const toFieldErrors = (issues: z.ZodIssue[]): FieldErrors => {
  const errors: ErrorMap = {}

  for (const issue of issues) {
    const path = issue.path.length > 0 ? issue.path : ['root']
    setInPath(errors, path, {
      type: issue.code,
      message: issue.message
    })
  }

  return errors as FieldErrors
}

const applyNativeValidation = (errors: FieldErrors, options: ResolverOptions<FieldValues>) => {
  Object.entries(options.fields ?? {}).forEach(([name, field]) => {
    const error = getFromPath(errors as ErrorMap, name)
    const ref = field && 'ref' in field ? field.ref : undefined

    if (ref && typeof ref.setCustomValidity === 'function') {
      ref.setCustomValidity(error?.message ?? '')

      if (typeof ref.reportValidity === 'function') {
        ref.reportValidity()
      }
    }
  })
}

export function zodResolver<TSchema extends z.ZodTypeAny>(
  schema: TSchema
): Resolver<z.infer<TSchema>> {
  return async (values, _context, options) => {
    const result = await schema.safeParseAsync(values)

    if (result.success) {
      return {
        values: result.data,
        errors: {}
      }
    }

    const errors = toFieldErrors(result.error.issues)

    if (options.shouldUseNativeValidation) {
      applyNativeValidation(errors, options as ResolverOptions<FieldValues>)
    }

    return {
      values: {} as z.infer<TSchema>,
      errors
    }
  }
}
