export const USER_ROLES = ['OPERADOR', 'SUPERVISOR', 'ADMIN'] as const

export type UserRoleName = (typeof USER_ROLES)[number]

export type AuthenticatedUser = {
  id: string
  email: string
  name: string
  roles: UserRoleName[]
}

export type AuthSession = {
  user: AuthenticatedUser
  accessToken: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  user: AuthenticatedUser
  accessToken: string
}

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
}

export type ResetPasswordRequest = {
  userId: string
  newPassword?: string
}

export type CreateUserRequest = {
  email: string
  name: string
  password: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export type UpdateUserRequest = {
  email?: string
  name?: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export type UpdateUserRolesRequest = {
  roles: UserRoleName[]
}

export type UserListItem = {
  id: string
  email: string
  name: string
  status: 'ACTIVE' | 'INACTIVE'
  roles: UserRoleName[]
  lastLoginAt: string | null
}

export type PaginatedUsersResponse = {
  data: UserListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
