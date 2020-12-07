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
    },
    services: {
        initializeClient: (context) => async () => {
            const { host, port, proto_path } = context

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

            const connection_proto: any = loadPackageDefinition(packageDefinition).connection

            const client = await new connection_proto.Connection(
                `${host}:${port}`,
                credentials.createInsecure()
            )

            return client
        },
        startClientService: ({ grpc_client, data }) => (send) => {
            grpc_client!.sendMessage({
                payload: JSON.stringify(data)
            }, () => send('DATA_SENT'))
        }
    },
    guards: {
        hasReachedMaxClientRetry: ({ retry_count, max_retry_count }: any) => retry_count >= max_retry_count,
    },
    activities: {},
    delays: {}
}

export default implementation