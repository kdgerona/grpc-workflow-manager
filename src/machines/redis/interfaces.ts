export interface IRedisContext {}

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