export interface UserAccessTokenOpt {
    userId: number
    username: string
    roles: string[]
    permissions: string[]
}

export interface UserRefreshTokenOpt {
    userId: number
}