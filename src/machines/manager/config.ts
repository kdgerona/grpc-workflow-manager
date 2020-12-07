import { MachineConfig, send } from 'xstate'
import { IManagerContext, IManagerSchema, IManagerEvents } from './interfaces'

const context: IManagerContext = {
    clients: {},
    redis: undefined,
    worker_queue: [],
    worker_data: {},
    grpc_client_ref: {},
    manager_id: process.env.MANAGER_ID || 'manager1',
    request_timeout_sec: +(process.env.REQUEUE_TIMEOUT_SEC || 15)
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
                {
                    id: 'worker-task-presentation',
                    src: 'workerTaskPresentation'
                }
            ],
            on: {
                // Kafka
                CONSUMER_KAFKA_READY: {
                    actions: ['startGrpcServer']
                },
                RECEIVED_MESSAGE_KAFKA: [
                    {
                        actions: [
                            // 'sendTaskToScheduler',
                            'logTaskReceived',
                            'pushTaskQueue',
                        ],
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
                RECEIVE_FROM_UNARY: {
                    actions: [
                        'updateTaskWorkerData',
                        'setWorkerTask'
                    ]
                },
                // GRPC Server
                NEW_CONNECTION: {
                    actions: [
                        'spawnClientStream',
                        'assignWorkerToQueue',
                        'workerPresentation',
                        'checkQueues'
                    ]
                },
                SET_WORKER_TASK: {
                    actions: ['setWorkerTask']
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
                REMOVE_DISCONNECTED_CLIENT: { // Separated this event, because I still need to use the data before removing it.
                    actions: [
                        'removeDisconnectedClient',
                        'checkQueues' // Check again for requeued task
                    ]
                },
                // *** Commented for now ***
                // Scheduler
                // ENQUEUE_TASK: {
                //     actions: [
                //         'logTaskReceived',
                //         'pushTaskQueue',
                //     ]
                // },
                // Tracker
                TASK_ACK: [
                    {
                        actions: [
                            'setActiveTask',
                            'setWorkerTask', // TBD
                            'pushWorkerToQueue'
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
                        // 'pushWorkerToQueue', // Commented for now
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