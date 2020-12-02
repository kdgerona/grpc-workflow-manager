export interface IManagerContext {}

export interface IManagerSchema {
    states: {
        start: {}
    }
}

export interface IManagerEvents {
    type:
        | 'KAFKA_CONSUMER_CONNECTED'
        | 'REDIS_CLIENT_READY'
        | 'RECEIVED_MESSAGE_KAFKA'
}