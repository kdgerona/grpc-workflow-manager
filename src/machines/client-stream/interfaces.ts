import { ServerDuplexStream } from 'grpc'

export interface IClientStreamContext {
    client_id?: string
    stream?: ServerDuplexStream<IMessageEvent,IMessageEvent>
}

export interface IClientStreamSchema {
    states: {
        listening: {}
        error: {}
    }
}

export interface IClientStreamEvents {
    type:
        | 'SEND_EVENT_TO_PARENT'
        | 'SEND_TO_CLIENT'
        | 'CONNECTION_CLOSED'
        | 'STREAM_ERROR'
}

export interface IMessageEvent {
    type: string
    client_id: string
    task_id: string
    payload: string
    topic?: string 
}