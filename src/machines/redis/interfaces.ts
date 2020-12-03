export interface IRedisContext {
    redis_host: string
    redis_port: string | number
}

export interface IRedisSchema {
    states: {
        initialize: {}
    }
}

export interface IRedisEvents {
    type: 
        | 'REDIS_CLIENT_CONNECTED'
        | 'REDIS_CLIENT_CONN_ERROR'
    payload?: any
}