import { Actor } from 'xstate'

export interface IManagerContext {
    clients: {
        [key: string]: Actor
    }
    redis: any
}

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
        | 'NEW_CONNECTION'
        | 'SEND_TO_CLIENT'
        | 'CONNECTION_CLOSED'
        | 'ENQUEUE_TASK'
        | 'READY'
        | 'TASK_ACK'
        | 'WORK_PROGRESS'
        | 'TASK_DONE'
        | 'CHECK_QUEUES'
        | 'PRESENT_TASK'
}