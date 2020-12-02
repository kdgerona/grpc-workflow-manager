import { MachineConfig } from 'xstate'
import { IManagerContext, IManagerSchema, IManagerEvents } from './interfaces'

const context: IManagerContext = {}

const config: MachineConfig<IManagerContext, IManagerSchema, IManagerEvents> = {
    id: 'manager',
    initial: 'start',
    context,
    states: {
        start: {
            invoke: [
                {
                    id: 'grpc-server',
                    src: 'initGrpcServer'
                },
                {
                    id: 'redis-client',
                    src: 'initRedisClient'
                },
                {
                    id: 'start-scheduler',
                    src: 'startScheduler'
                },
                // {
                //     id: 'start-tracker',
                //     src: 'startTracker'
                // },
            ],
            on: {
                KAFKA_CONSUMER_CONNECTED: {
                    actions: ['startGrpcServer']
                },
                REDIS_CLIENT_READY: {
                    actions: [
                        'sendRedisConnectionToScheduler',
                        // 'sendRedisConnectionToTracker',
                    ]
                },
                RECEIVED_MESSAGE_KAFKA: {
                    actions: ['sendTaskToScheduler']
                }
            }
        }
    }
}

export default config