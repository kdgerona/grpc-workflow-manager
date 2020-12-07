import { MachineOptions, actions, assign, sendParent, send } from 'xstate'
import { loadPackageDefinition, credentials } from 'grpc'
import { loadSync } from '@grpc/proto-loader'
import { IGrpcClientContext } from './interfaces'
const { log } = actions

const implementation: MachineOptions<IGrpcClientContext, any> = {
    actions: {
        logInitializingClient: log('*** GRPC Client Initializing ***'),
        logClientInitialized: log('*** GRPC Client Initialized ***'),
        logClientInitializationError: log((_, event: any) => event.data),
        assignGrpcClientInstance: assign({
            grpc_client: (_, { data }: any) => data
        }),
        incrementRetryCount: assign({
            retry_count: (context) => context.retry_count + 1
        }),
        resetRetryCount: assign<IGrpcClientContext>({
            retry_count: 0
        }),
        logClientStartError: log(`*** GRPC Client Start Error ***`),
        retryingLog: log((context) => `*** Retrying GRPC Client ${context.retry_count}/${context.max_retry_count} ***`),
        sendToParent: sendParent((_, { payload }: any) => ({
            ...payload
        })),
        logClientStreamError: log((_, { error }: any) => error),
        logStreamEnded: log('*** STREAM ENDED ***'),
        eventLogs:  log((_:any, event: any) => `${event.type} event logs: ${JSON.stringify(event, null, 4)}`),
        streamToServer: ({ grpc_client }, { payload }) => {
            const stringfied_payload = {
                ...payload,
                payload: JSON.stringify(payload.payload)
            }
            grpc_client?.write(stringfied_payload)
        }
    },
    services: {
        initializeClient: (context) => async () => {
            const { host, port, proto_path, client_wait_time_ms } = context

            const packageDefinition = loadSync(
                proto_path,
                {
                    keepCase: true,
                    longs: String,
                    enums: String,
                    defaults: true,
                    oneofs: true
                }
            )

            const message_proto: any = loadPackageDefinition(packageDefinition).message

            const client = await new message_proto.Message(
                `${host}:${port}`,
                credentials.createInsecure()
            )

            // const stream = await new Promise((resolve,reject) => {
            //     client.waitForReady(new Date().getTime() + client_wait_time_ms, (error: any) => {
            //         if(!error) {
            //             const stream = client.connectToServer()
            //             resolve(stream)
            //         }

            //         reject(error)
            //     })
            // })

            return client
        },
        startClientService: ({ grpc_client, data }) => (send) => {
            grpc_client!.sendMessage({
                payload: JSON.stringify(data)
            }, () => {})
        }
    },
    guards: {
        hasReachedMaxClientRetry: ({ retry_count, max_retry_count }: any) => retry_count >= max_retry_count,
    },
    activities: {},
    delays: {}
}

export default implementation