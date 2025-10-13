import { AsyncLocalStorage } from 'node:async_hooks'

export type RequestContext = {
  actor: string | null
  requestId: string
  method: string
  url: string
  ip: string | undefined
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>()

export function getRequestContext() {
  return requestContextStorage.getStore()
}

export function runWithRequestContext<T>(context: RequestContext, callback: () => Promise<T> | T) {
  return requestContextStorage.run(context, callback)
}

export function setRequestActor(actor: string | null) {
  const context = requestContextStorage.getStore()
  if (context) {
    context.actor = actor
  }
}
