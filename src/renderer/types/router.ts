export type RouteComponentProps = {
  params: Record<string, string>
  navigate: (to: string, options?: { replace?: boolean }) => void
  query: URLSearchParams
  path: string
}
