import { MachineConfig, send } from 'xstate'
import { IManagerContext, IManagerSchema, IManagerEvents } from './interfaces'

const context: IManagerContext = {
    clients: {},
    redis: undefined,
    worker_queue: [],
    worker_data: {},
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
                {
                    id: 'kafka-producer',
                    src: 'startKafkaProducer'
                },
                {
                    id: 'queue-checker',
                    src: 'queueChecker'
                },
                {
                    id: 'queue-task',
                    src: 'pushToTaskQueueRedis'
                },
                {
                    id: 'get-worker',
                    src: 'getWorkerId'
                }
            ],
            on: {
                // Kafka
                CONSUMER_KAFKA_READY: {
                    actions: ['startGrpcServer']
                },
                // RECEIVED_MESSAGE_KAFKA: {
                //     actions: ['sendTaskToScheduler']
                //     // actions: (_:any, event) => console.log('##%%%%%', event)
                // },
                RECEIVED_MESSAGE_KAFKA: [
                    {
                        actions: ['sendTaskToScheduler'],
                        cond: 'isWorkflowTopic' // WORKFLOW topic
                    },
                    {
                        actions: ['getWorker']
                    }
                ],
                SEND_DOMAIN_RESPONSE: {
                    actions: ['sendDomainResponse'] // DOMAIN_RESPONSE
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
                        'assignWorkerToQueue',
                        'checkQueues'
                    ]
                },
                SEND_TO_CLIENT: {
                    actions: [
                        'sendToClient',
                    ]
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
                        'pushTaskQueue',
                        // 'checkQueues' // No need to use an event to trigger
                    ]
                },
                // Tracker
                // READY: {
                //     actions: [
                //         'logReadyWorker',
                //         'pushToWorkerQueue',
                //         'checkQueues'  // No need to use an event to trigger
                //     ]
                // },
                TASK_ACK: [
                    {
                        actions: [
                            'setActiveTask'
                        ],
                        // actions: (_, event) => console.log(`HI!!!`, event),
                        cond: 'isTaskAcknowledge'
                    },
                    {
                        actions: ['requeueTask']
                        // actions: (_, event) => console.log(`HELLO!!!`, event)
                    }
                ],
                PRODUCE_MESSAGE_TO_DOMAIN: {
                    // actions: (_, event) => console.log('LOVE!!!!!', event)
                    actions: ['produceToDomain']
                },
                WORK_PROGRESS: {
                    actions: ['updateTaskData']
                },
                TASK_DONE: {
                    actions: [
                        'produceResultToSession',
                        'deleteTaskToActive',
                        'pushWorkerToQueue',
                        'checkQueues'
                    ]
                },
                // Logic queue checking
                CHECK_QUEUES: {
                    actions: ['checkQueues']
                },
                SHIFT_WORKER: {
                    actions: ['shiftWorkerFromList']
                },
                // PUSH_WORKER: {
                //     actions: ['pushWorkerToQueue']
                // }
                // *** Commented for now ***
                // PRESENT_TASK: {
                //     actions: ['presentTaskToWorker']
                // }
            }
        }
    }
}

export default config