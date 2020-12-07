import { ClientDuplexStream } from 'grpc'

export interface IGrpcClientContext {
    host: string
    port: number
    proto_path: string
    max_retry_count: number
    retry_count: number
    grpc_client?: any
    client_wait_time_ms: number
    data: any
}

export interface IGrpcClientSchema {
    states: {
        initialize: {}
        listening: {}
        retry: {}
        error: {}
    }
}

export interface IGrpcClientEvents {
    type: 
        | 'SEND_MESSAGE_TO_PARENT'
        | 'CLIENT_STREAM_ERROR'
        | 'STREAM_ENDED'
        | 'STREAM_TO_SERVER'
}

export interface IMessageEvent {
    type: string
    client_id: string
    payload: Object // { action: 'SOMETHING_WORKFLOW_ACTION' }
}