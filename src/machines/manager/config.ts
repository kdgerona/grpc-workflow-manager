import { MachineConfig, send } from 'xstate'
import { IManagerContext, IManagerSchema, IManagerEvents } from './interfaces'

const context: IManagerContext = {
    clients: {},
    redis: undefined,
    // workers: {}
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
                // Kafka
                {
                    id: 'kafka-consumer',
                    src: 'startKafkaConsumer'
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
                // Kafka
                KAFKA_CONSUMER_CONNECTED: {
                    // actions: ['startGrpcServer']
                    actions: (_:any, event) => console.log('##%%%%% START',)
                },
                // RECEIVED_MESSAGE_KAFKA: {
                //     actions: ['sendTaskToScheduler']
                //     // actions: (_:any, event) => console.log('##%%%%%', event)
                // },
                RECEIVED_MESSAGE_KAFKA: [
                    {
                        actions: ['sendTaskToScheduler'],
                        cond: 'isWorkflowTopic'
                    },
                    {
                        actions: () => console.log('### FROM DOMAIN RES'),
                    }
                ],
                // CONSUMED_FROM_DOMAIN_RES: {
                //     actions: ['sendDomainResponse']
                // },
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
                    actions: [
                        'logTaskReceived',
                        'pushToTaskQueueRedis',
                        'checkQueues' // No need to use an event to trigger
                    ]
                },
                // Tracker
                READY: {
                    actions: [
                        'logReadyWorker',
                        'pushToWorkerQueue',
                        'checkQueues'  // No need to use an event to trigger
                    ]
                },
                TASK_ACK: [
                    {
                        actions: [
                            'setActiveTask'
                        ],
                        cond: 'isTaskAcknowledge'
                    },
                    {
                        actions: ['requeueTask']
                    }
                ],
                PRODUCE_MESSAGE_TO_DOMAIN: {},
                WORK_PROGRESS: {},
                TASK_DONE: {
                    actions: ['produceResultToSession']
                },
                // Logic queue checking
                CHECK_QUEUES: {
                    actions: ['checkQueues']
                },
                // *** Commented for now ***
                // PRESENT_TASK: {
                //     actions: ['presentTaskToWorker']
                // }
            }
        }
    }
}

export default config