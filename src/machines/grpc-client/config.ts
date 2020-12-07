import { MachineConfig, sendParent } from 'xstate'
import { IGrpcClientContext, IGrpcClientSchema, IGrpcClientEvents} from './interfaces'

const context: IGrpcClientContext = {
    // host: process.env.HOST || 'localhost' || '10.111.2.100',
    host: process.env.GRPC_CLIENT_HOST || 'localhost',
    port: +(process.env.GRPC_CLIENT_PORT || 60051),
    proto_path: process.env.GRPC_CLIENT_PROTO_PATH ||`${__dirname}/../../../protos/connection.proto`,
    max_retry_count: +(process.env.GRPC_CLIENT_RETRY_COUNT || 100),
    retry_count: 0,
    grpc_client: undefined,
    client_wait_time_ms: +(process.env.GRPC_CLIENT__WAIT_TIME_MS || 5000),
    data: undefined
}

const config: MachineConfig<IGrpcClientContext, IGrpcClientSchema, IGrpcClientEvents> = {
    id: 'grpc-client',
    initial: 'initialize',
    context,
    states: {
        initialize: {
            entry: 'logInitializingClient',
            invoke: [
                {
                    id: 'initialize-client',
                    src: 'initializeClient',
                    onDone: {
                        target: 'send_data',
                        actions: [
                            'logClientInitialized',
                            'assignGrpcClientInstance',
                            'resetRetryCount'
                        ]
                    },
                    onError: {
                         target: 'retry',
                         actions: ['logClientInitializationError']
                    }
                }
            ]
        },
        send_data: {
            invoke: [
                {
                    id: 'start-client-service',
                    src: 'startClientService'
                }
            ],
            on: {
                // DATA_SENT: 'success',
                DATA_SENT: {
                    target: 'success',
                    actions: () => console.log('Happy Done !!!')
                }
            },
        },
        retry: {
            after: {
                3000: [
                    {
                        target: 'error',
                        cond: 'hasReachedMaxClientRetry'
                    },
                    {
                        target: 'initialize',
                        actions: ['incrementRetryCount']
                    }
                ]
            },
            exit: 'retryingLog',
        },
        success: {
            type: 'final'
        },
        error: {
            entry: 'logClientStartError',
            type: 'final'
        }
    }
}

export default config