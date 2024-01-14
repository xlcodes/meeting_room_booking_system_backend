export interface UserAccessTokenOpt {
    userId: number
    username: string
    roles: string[]
    permissions: string[]
}

export interface UserRefreshTokenOpt {
    userId: number
}

export interface FindUsersByPageParams {
    pageNo: number
    pageSize: number
    username: string
    nickName: string
    email: string
}