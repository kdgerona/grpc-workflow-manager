import { Actor } from 'xstate'
import { Server, ServerDuplexStream } from 'grpc'

export interface IGrpcServerContext {
    host: string
    port: number
    proto_path: string
    max_retry_count: number
    retry_count: number
    grpc_server?: Server
    // clients: {
    //     [key: string]: ServerDuplexStream<IMessageEvent,IMessageEvent>
    // }
    clients: {
        [key: string]: Actor
    }
}

export interface IGrpcServerSchema {
    states: {
        idle: {}
        initialize: {}
        running: {}
        retry: {}
        error: {}
    }
}

export interface IGrpcServerEvents {
    type: 
        | 'START_GRPC_SERVER'
        | 'NEW_CONNECTION'
        | 'SEND_TO_CLIENT'
        | 'CONNECTION_CLOSED'
        | 'STREAM_ERROR'
}

export interface IMessageEvent {
    type: string
    client_id: string
    payload: Object // { action: 'SOMETHING_WORKFLOW_ACTION' }
}