import { MachineConfig, send } from 'xstate'
import { IManagerContext, IManagerSchema, IManagerEvents } from './interfaces'

const context: IManagerContext = {
    clients: {},
    redis: undefined,
    worker_queue: [],
    worker_data: {},
    grpc_client_ref: {},
}

const config: MachineConfig<IManagerContext, IManagerSchema, IManagerEvents> = {
    id: 'manager',
    initial: 'idle',
    context,
    states: {
        idle: {
            invoke: {
                id: 'redis-client',
                src: 'initRedisClient'
            },
            on: {
                REDIS_CLIENT_READY: {
                    target: 'start',
                    actions: [
                        'assignRedisClient'
                    ]
                },
            }
        },
        start: {
            invoke: [
                {
                    id: 'grpc-server',
                    src: 'initGrpcServer'
                },
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
                },
                {
                    id: 'get-task',
                    src: 'getTask'
                },
                {
                    id: 'tasks-requeue',
                    src: 'tasksRequeue'
                },
            ],
            on: {
                // Kafka
                CONSUMER_KAFKA_READY: {
                    actions: ['startGrpcServer']
                },
                RECEIVED_MESSAGE_KAFKA: [
                    {
                        actions: ['sendTaskToScheduler'],
                        cond: 'isWorkflowTopic' // WORKFLOW topic
                    },
                    {
                        actions: ['getWorker']
                    }
                ],
                // ** COMMENTED FOR NOW, Because unary call is implemented ***
                // SEND_DOMAIN_RESPONSE: {
                //     actions: [
                //         'sendDomainResponse', // DOMAIN_RESPONSE
                //         'updateResponseTaskData'
                //     ]
                // },
                SEND_DOMAIN_RESPONSE: [
                    {
                        actions: [
                            'sendDomainResponse', // DOMAIN_RESPONSE
                            'updateResponseTaskData'
                        ],
                        cond: 'isWorkerExistInManager'
                    },
                    {
                        actions: [
                            'unaryCallOfGrpcClient'
                        ]
                    }
                ],
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
                        'requeueTasksDiconnectedClient'
                    ]
                },
                REMOVE_DISCONNECTED_CLIENT: {
                    actions: ['removeDisconnectedClient']
                },
                // Scheduler
                ENQUEUE_TASK: {
                    actions: [
                        'logTaskReceived',
                        'pushTaskQueue',
                    ]
                },
                // Tracker
                TASK_ACK: [
                    {
                        actions: [
                            'setActiveTask',
                            'setWorkerTask' // TBD
                        ],
                        cond: 'isTaskAcknowledge'
                    },
                    {
                        actions: ['requeueTask']
                    }
                ],
                PRODUCE_MESSAGE_TO_DOMAIN: {
                    actions: [
                        'produceToDomain',
                        'updateTaskData'
                    ]
                },
                // WORK_PROGRESS: {
                //     actions: ['updateTaskData']
                // },
                TASK_COMPLETE: {
                    actions: [
                        'logCompletedTask',
                        // 'produceResultToSession',
                        'getTaskData',
                        'deleteTaskToActive',
                        'removeWorkerTask', // Test
                        'pushWorkerToQueue',
                        'checkQueues'
                    ]
                },
                // DEV
                PRODUCE_TO_SESSION: {
                    actions: ['produceResultToSession']
                },
                // END
                // Logic Queue Checking
                CHECK_QUEUES: {
                    actions: ['checkQueues']
                },
                SHIFT_WORKER: {
                    actions: ['shiftWorkerFromList']
                },
            }
        }
    }
}

export default config