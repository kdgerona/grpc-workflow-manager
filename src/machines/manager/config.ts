import { MachineConfig, send } from 'xstate'
import { IManagerContext, IManagerSchema, IManagerEvents } from './interfaces'

const context: IManagerContext = {
    clients: {},
    redis: undefined,
}

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
                // {
                //     id: 'start-scheduler',
                //     src: 'startScheduler'
                // },
                // {
                //     id: 'start-tracker',
                //     src: 'startTracker'
                // },
                {
                    id: 'queue-checker',
                    src: 'queueChecker'
                }
            ],
            on: {
                // TEST
                TEST: {
                    actions: send('', { to: 'queue-checker'})
                },
                // END
                KAFKA_CONSUMER_CONNECTED: {
                    actions: ['startGrpcServer']
                },
                RECEIVED_MESSAGE_KAFKA: {
                    actions: ['sendTaskToScheduler']
                },
                REDIS_CLIENT_READY: {
                    actions: [
                        // 'sendRedisConnectionToScheduler',
                        // 'sendRedisConnectionToTracker',
                        'assignRedisClient'
                    ]
                },
                // GRPC Server
                NEW_CONNECTION: {
                    actions: [
                        'spawnClientStream',
                        'setWorker' // TBD
                    ]
                },
                SEND_TO_CLIENT: {
                    actions: ['sendToClient']
                },
                CONNECTION_CLOSED: {
                    actions: [
                        'removeDisconnectedClient'
                    ]
                },
                // Scheduler
                ENQUEUE_TASK: {
                    actions: ['pushToTaskQueueRedis']
                },
                // Tracker
                READY: {
                    actions: ['pushToWorkerQueue']
                },
                TASK_ACK: {},
                WORK_PROGRESS: {},
                TASK_DONE: {},
                // Logic Promised Guarded Event
                // CHECK_QUEUES: [
                //     {
                //         actions: [],
                //         cond: 'hasAvailableTaskandWorker'
                //     },
                //     {
                //         actions: []
                //     }
                // ]
            }
        }
    }
}

export default config