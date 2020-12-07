import { MachineOptions, send, assign, spawn, actions } from 'xstate'
import { v4 as uuidv4 } from 'uuid'
import { IManagerContext, INewTask } from './interfaces'
import { Consumer, Producer } from 'xkafka'
const { log } = actions

// Machines
import GrpcServer from '../grpc-server'
import RedisClient from '../redis'
import ClientStream from '../client-stream'
import GrpcClient from '../grpc-client'

const implementation: MachineOptions<IManagerContext, any> = {
    actions: {
        startGrpcServer: send('START_GRPC_SERVER', { to: 'grpc-server'}),
        // Redis
        assignRedisClient: assign<IManagerContext, any>({
            redis: (_, { payload }) => payload
        }),
        // Kafka Consumed
        sendDomainResponse: send((_, { payload }) => {
            const { worker_data, task_id, response} = payload
            const { client_id } = worker_data
            const { type, ...response_data } = response
            
            return {
                type: 'SEND_TO_CLIENT',
                payload: {
                    type, // TASK_DONE
                    client_id,
                    task_id,
                    payload: JSON.stringify(response_data)
                }
            }
        }, { to: (_, { payload }) => {
            const { client_id } = payload

            return client_id
        }}),
        updateResponseTaskData: async ({ redis }, { payload }) => {
            const { task_id, response } = payload
            const { type, ...response_data } = response
            const task = await redis.get(`task-${task_id}`)
            const parsed_task = JSON.parse(task)
            const update_task_data = await redis.set(`task-${task_id}`, JSON.stringify({
                ...parsed_task,
                current: response_data
            }))
        },
        unaryCallOfGrpcClient: assign<IManagerContext, any>({
            grpc_client_ref: ({ grpc_client_ref }, { payload }) => {
                const { worker_data, task_id, response} = payload
                const { client_id } = worker_data
                const { type, ...response_data } = response
                
                console.log('@@@@@@', worker_data)

                return {
                    ...grpc_client_ref,
                    [task_id]: spawn(GrpcClient({
                        host: worker_data.host,
                        port: worker_data.port,
                        data: {
                            type, // TASK_DONE
                            client_id,
                            task_id,
                            payload: JSON.stringify(response_data)
                        }
                    }))
                }
            }
        }),
        // getWorker: send(({ redis }, { payload }) => ({
        //     type: 'GET_WORKER',
        //     payload: {
        //         response: payload
        //     }
        // }), { to: 'get-worker'}),
        getWorker: send(({ redis }, { payload }) => {
            return {
            type: 'GET_WORKER',
            payload: {
                response: payload
            }
        }}, { to: 'get-worker'}),
        sendTaskToScheduler: send((_, { payload }) => ({
            type: 'ENQUEUE_TASK',
            payload
        })),
        // GRPC Server
        spawnClientStream: assign({
            clients: (context, event) => {
                const {client_id, stream} = event.payload
                
                return {
                    ...context.clients,
                    [client_id]: spawn(ClientStream.withContext({
                        client_id,
                        stream
                    }), client_id)
                }
            }
        }),
        assignWorkerToQueue: assign(({ worker_queue }, event) => {
            const { client_id, } = event.payload

            return {
                worker_queue: [...worker_queue, client_id],
                worker_data: {
                    [client_id]: event.payload
                }
            }
        }),
        sendToClient: send((_, event) => event, { to: (_, { payload }) => payload.client_id}),
        shiftWorkerFromList: assign<IManagerContext,any>({
            worker_queue: ({ worker_queue }) => {
                const [shifted_worker, ...new_worker_queue] = worker_queue

                return [...new_worker_queue]
            }
        }),
        pushWorkerToQueue: assign({
            worker_queue: ({ worker_queue }, { client_id }) => [...worker_queue, client_id]
        }),
        removeDisconnectedClient: assign((context, event) => {
            const { clients, worker_data, worker_queue } = context
            const { client_id } = event.payload
            // Client/Worker References
            const { [client_id]: client_stream, ...new_clients } = clients

            // client_stream.stop()

            // Worker data
            const { [client_id]: worker, ...new_worker_data } = worker_data

            // Worker Queue
            const new_worker_queue = worker_queue.filter(worker_id => worker_id !== client_id)

            return {
                clients: {
                    ...new_clients
                },
                worker_data: {
                    ...new_worker_data
                },
                worker_queue: new_worker_queue
            }
        }),
        requeueTasksDiconnectedClient: send(({ worker_data }, { payload }) => ({
            type: 'TASKS_REQUEUE_DISCONNECTED',
            payload: {
                worker_data,
                client_id: payload.client_id
            }
        }), { to: 'tasks-requeue'}),
        // Scheduler
        logTaskReceived: log('A new task received'),
        pushTaskQueue: send(({ redis }, { payload }) => ({
            type: 'PUSH_TASK',
            payload
        }), { to: 'queue-task'}),
        logReadyWorker: log((_, { client_id }) => `*** Worker ${client_id} is ready ***`),
        // Logic queue checking
        checkQueues: send(({ redis, worker_queue, worker_data }) => ({
            type: 'QUEUE_CHECKER',
            payload: {
                worker_queue,
                worker_data
            }
        }), { to: 'queue-checker'}),
        setActiveTask: async ({ redis }, { client_id, task_id}) => {
            const active_task = await redis.set(`active-${task_id}`, client_id)
        },
        setWorkerTask: assign({
            worker_data: ({ worker_data }, { client_id, task_id}) => {
                const { [client_id]: worker } = worker_data

                return {
                    ...worker_data,
                    [client_id]: {
                        ...worker,
                        tasks: {
                            ...worker.tasks, 
                            [task_id]: client_id
                        }
                    }
                }
            }
        }),
        removeWorkerTask: assign({
            worker_data: ({ worker_data }, { client_id, task_id}) => {
                const { [client_id]: worker } = worker_data
                const { [task_id]: task, ...new_worker_tasks } = worker.tasks

                return {
                    ...worker_data,
                    [client_id]: {
                        ...worker,
                        tasks: {
                            ...new_worker_tasks
                        }
                    }
                }
            }
        }),
        requeueTask: async ({ redis }, { task_id }) => {
            const requeue_task = await redis.rpush('task_queue', task_id)
        },
        deleteTaskToActive: async ({ redis }, { task_id }) => {
            const delete_task = await redis.del(`active-${task_id}`)
        },
        produceResultToSession: send((_, event) => {
            const { payload } = event

            return {
                type: 'SEND_MESSAGE',
                payload: {
                    topic: 'WORKFLOW_RESPONSE',
                    messages: [
                        {value: JSON.stringify(payload)}
                    ]
                }
            }
        }, {to: 'kafka-producer'}),
        // DEV
        getTaskData: send((_, event) => event, { to: 'get-task'}),
        // END
        produceToDomain: send((_, event) => {
            const { topic, task_id, payload } = event
            const parsed_payload = JSON.parse(payload)

            const message: INewTask = {
                type: "NEW_TASK",
                workflow_task_id: task_id,
                payload: parsed_payload
            }

            return {
                type: 'SEND_MESSAGE',
                payload: {
                    topic,
                    messages: [
                        {value: JSON.stringify(message)}
                    ]
                }
            }
        }, {to: 'kafka-producer'}),
        updateTaskData: async ({ redis }, { task_id, payload }) => {
            const parsed_payload = JSON.parse(payload)
            const task = await redis.get(`task-${task_id}`)
            const parsed_task = JSON.parse(task)
            const update_task_data = await redis.set(`task-${task_id}`, JSON.stringify({
                ...parsed_task,
                current: parsed_payload
            }))
        },
        logCompletedTask: log((_, event) => `COMPLETED: ${JSON.stringify(event, null, 4)}`),
    },
    services: {
        initGrpcServer: GrpcServer,
        initRedisClient: RedisClient,
        // Kafka
        startKafkaProducer: Producer({ 
            topic: process.env.PRODUCER_TOPIC || 'DEFAULT',
            brokers: process.env.KAFKA_BROKERS || '10.111.2.100',
        }),
        startKafkaConsumer: Consumer({
            topics: process.env.CONSUMER_TOPIC || 'WORKFLOW,DOMAIN_RESPONSE',
            brokers: process.env.KAFKA_BROKERS || '10.111.2.100',
            consumer_config:{
                groupId: process.env.CONSUMER_GROUP || 'workflow14',
            }
        }),
        pushToTaskQueueRedis: ({ redis }) => (send, onEvent) => {
            const push_to_redis = async (event) => {
                try {
                    const { payload } = event.payload
                    const task_id = uuidv4()

                    console.log(`HI!!!`, event.payload)

                    const event_data = {
                        type: 'TASK',
                        payload: event.payload
                    }
    
                    const set_task = await redis.set(`task-${task_id}`, JSON.stringify({
                        ...event_data,
                        task_id
                    }))
    
                    const queue_task = await redis.rpush('task_queue', task_id) // Redis array index is the returned value

                    send('CHECK_QUEUES')
                }catch(e) {
                    console.log(e)
                }
            }

            onEvent(push_to_redis)
        },
        getWorkerId: ({ redis }) => (send, onEvent) => {
            const getWorker = async (event) => {
                const { response } = event.payload

                const { workflow_task_id } = response

                // const client_id = await redis.get(`active-${workflow_task_id}`)

                // NEW - Getting workerid from task, worker data property
                const { worker_data } = JSON.parse(await redis.get(`task-${workflow_task_id}`))

                console.log('getWorkerId #####', worker_data)

                send({
                    type: 'SEND_DOMAIN_RESPONSE',
                    payload: {
                        response,
                        // client_id,
                        task_id: workflow_task_id,
                        worker_data,
                    }
                })
            }

            onEvent(getWorker)
        },
        getTask: ({ redis }) => (send, onEvent) => {
            const getTaskData = async (event) => {
                const { task_id, payload } = event
                const parsed_payload = JSON.parse(payload)
                const get_task = JSON.parse(await redis.get(`task-${task_id}`))

                send({
                    type: 'PRODUCE_TO_SESSION',
                    payload: {
                        ...get_task.payload,
                        payload: parsed_payload
                    }
                })
            }

            onEvent(getTaskData)
        },
        // Logic
        queueChecker: ({ redis }) => (send, onEvent) => {
            const checkQueue = async (event: any) => {
                const { worker_queue, worker_data } = event.payload

                const task_queue = await redis.lrange('task_queue', 0, 0)

                if(task_queue.length && worker_queue.length) {
                    console.log('*** QUEUES ***',task_queue,worker_queue)
                    
                    // Presention Phase, task is still to be acknowledge
                    const task_id = await redis.lpop('task_queue')
                    const worker_id = worker_queue[0]
                    send('SHIFT_WORKER')

                    const task = await redis.get(`task-${task_id}`)
                    // const { session_id, ...parsed_task} = JSON.parse(task)
                    const parsed_task = JSON.parse(task)

                    console.log('Hello: @@@@@@', parsed_task)

                    // Adding worker data on task
                    const { [worker_id]: worker } = worker_data
                    const update_task_data = await redis.set(`task-${task_id}`, JSON.stringify({
                        ...parsed_task,
                        worker_data: worker
                    }))

                    send({
                        type: 'SEND_TO_CLIENT',
                        payload: {
                            ...parsed_task,
                            client_id: worker_id,
                            task_id
                        }
                    })
                }   
            }

            onEvent(checkQueue)
        },
        tasksRequeue: ({ redis }) => (send, onEvent) => {
            const requeueTask = async (event) => {
                const { worker_data, client_id } = event.payload
                const { [client_id]: worker } = worker_data

                if(worker.tasks){
                    await Promise.all(Object.keys(worker.tasks).map(async (task_id) => {
                        const delete_task = await redis.del(`active-${task_id}`)
                        const requeue_task = await redis.rpush('task_queue', task_id)
                    }))
                }

                send({
                    type: 'REMOVE_DISCONNECTED_CLIENT',
                    payload: {
                        client_id
                    }
                })
            }

            onEvent(requeueTask)
        }
    },
    guards: {
        isTaskAcknowledge: (_, { payload }) => {
            const parsed_payload = JSON.parse(payload)

            return parsed_payload.success
        },
        isWorkflowTopic: (_, { message_props }) => message_props.topic === "WORKFLOW",
        isWorkerExistInManager: ({ worker_data }, { payload }) => {
            const { client_id } = payload.worker_data

            if(!worker_data[client_id]) return false

            return true
        },
    },
    activities: {},
    delays: {}
}

export default implementation