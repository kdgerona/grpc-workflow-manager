import { Actor } from 'xstate'

export interface IManagerContext {
    clients: {
        [key: string]: Actor
    }
    redis?: any
    worker_queue: string[]
    worker_data: {
        [key: string]: any
    }
}

export interface IManagerSchema {
    states: {
        idle: {}
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
        | 'TASK_COMPLETE'
        | 'CHECK_QUEUES'
        | 'PRESENT_TASK'
        | 'PRODUCE_MESSAGE_TO_DOMAIN'
        | 'SHIFT_WORKER'
        | 'PUSH_WORKER'
        | 'CONSUMER_KAFKA_READY'
        | 'SEND_DOMAIN_RESPONSE'
}

export interface INewTask {
    type: "NEW_TASK"
    workflow_task_id: string
    payload: any
}