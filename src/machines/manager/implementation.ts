import { MachineOptions, send, assign, spawn, actions } from 'xstate'
import { v4 as uuidv4 } from 'uuid'
import { IManagerContext } from './interfaces'
import { Consumer, Producer } from 'xkafka'
const { log } = actions

// Machines
import GrpcServer from '../grpc-server'
import RedisClient from '../redis'
import Scheduler from '../scheduler'
import ClientStream from '../client-stream'
import redis from '../redis'

const implementation: MachineOptions<IManagerContext, any> = {
    actions: {
        startGrpcServer: send('START_GRPC_SERVER', { to: 'grpc-server'}),
        // Redis
        assignRedisClient: assign<any, any>({
            redis: (_: any, { payload }: any) => payload
        }),
        // sendRedisConnectionToScheduler: send((_, { payload }: any) => ({
        //     type: 'REDIS_CONNECTED',
        //     payload
        // }), { to: 'start-scheduler'}),
        // sendRedisConnectionToTracker: send((_, { payload }: any) => ({
        //     type: 'REDIS_CONNECTED',
        //     payload
        // }), { to: 'start-tracker'})
        // Kafka Consumed
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
        setWorker: async ({ redis }, event) =>  {
            try{
                const { client_id } = event.payload

                const set_worker = await redis.set(`worker-${client_id}`, JSON.stringify(event.payload))

                console.log('setWorker', set_worker)
            }catch(e){
                console.log('@@ set worker err', e)
            }
        },
        sendToClient: send((_, event) => event, { to: (_, { payload }) => payload.client_id}),
        removeDisconnectedClient: assign({
            clients: (context, event) => {
                const { client_id } = event.payload
                const { [client_id]: client_stream, ...new_clients } = context.clients

                // client_stream.stop()

                return {
                    ...new_clients
                }
            }
        }),
        // Scheduler
        logTaskReceived: log('A new task received'),
        pushToTaskQueueRedis: async ({ redis }: any, { payload }: any) => {
            try {
                const task_id = uuidv4()

                const set_task = await redis.set(`task-${task_id}`, JSON.stringify({
                    ...payload,
                    task_id
                }))

                const queue_task = await redis.rpush('task_queue', task_id) // Redis array index is the returned value

                console.log(`!!! Task queue ${task_id}`, queue_task, set_task)
            }catch(e) {
                console.log('!!!!!', e)
            }
        },
        logReadyWorker: log((_: any, { client_id }: any) => `*** Worker ${client_id} is ready ***`),
        pushToWorkerQueue: async ({ redis }, { client_id }) => {
            try {
                if(!client_id) return
                
                const queue_worker = await redis.rpush('worker_queue', client_id)

                console.log(`!!! Worker queue`, queue_worker)
            }catch(e){
                console.log('@@@', e)
            }
        },
        // Logic queue checking
        checkQueues: send(({ redis }) => ({
            type: 'QUEUE_CHECKER',
            payload: {
                redis
            }
        }), { to: 'queue-checker'}),
        // *** Commented for now ***
        // presentTaskToWorker: send(async ({ redis }) => {
        //     // const task = await redis.lpop('task_queue')
        //     // const worker = await redis.lpop('worker_queue')

        //     return {
        //         type: 'SEND_TO_CLIENT'
        //     }
        // })
        setActiveTask: async ({ redis }, { client_id, payload}) => {
            const active_task = await redis.set(`active-${payload.task_id}`, client_id)
        },
        requeueTask: async ({ redis }, { payload }) => {
            const requeue_task = await redis.rpush('task_queue', payload.task_id)
        },
        produceResultToSession: (_, event) => {
            console.log('Done', event)
        }
    },
    services: {
        initGrpcServer: GrpcServer,
        initRedisClient: RedisClient,
        startScheduler: Scheduler,
        // Kafka
        startKafkaProducer: Producer({ 
            topic: process.env.PRODUCER_TOPIC || '',
            brokers: process.env.KAFKA_BROKERS || '',
        }),
        startKafkaConsumer: Consumer({
            topics: process.env.CONSUMER_TOPIC || 'workflow1,domain_response',
            brokers: process.env.KAFKA_BROKERS || '10.111.2.100',
            consumer_config:{
                groupId: process.env.CONSUMER_GROUP || 'workflow105',
            }
        }),
        // Logic
        queueChecker: ({ redis }) => (send, onEvent) => {
            // Bug: by the time this service is invoked,
            // the redis instace is still undefined,
            // Since the it does not get the latest context,
            // need to always pass the redis instance on event
            const checkQueue = async (event: any) => {
                const { redis } = event.payload

                const task_queue = await redis.lrange('task_queue', 0, -1)
                const worker_queue = await redis.lrange('worker_queue', 0, -1)

                // if(!task_queue.length && !worker_queue.length) return
                if(task_queue.length && worker_queue.length) {
                    console.log('*** QUEUES ***',task_queue,worker_queue)
                    // Present Task, still to be acknowledge
                    const task_id = await redis.lpop('task_queue')
                    const worker_id = await redis.lpop('worker_queue')

                    const task = await redis.get(`task-${task_id}`)
                    const parsed_task = JSON.parse(task)

                    console.log('@@@@@@2',parsed_task)

                    send({
                        type: 'SEND_TO_CLIENT',
                        payload: {
                            ...parsed_task,
                            // type: 'TASK',
                            client_id: worker_id,
                            task_id
                        }
                    })

                    // console.log('@@@@@@',task_id, worker_id)
                    // console.log('@@@@@@2',parsed_task)
                }   
            }

            onEvent(checkQueue)
        }
    },
    guards: {
        // hasAvailableTaskandWorker: async ({ redis }) => {
        //     return true
        // }
        isTaskAcknowledge: (_, { payload }: any) => payload.success,
        isWorkflowTopic: (_, { message_props }) => message_props.topic === "workflow1",
    },
    activities: {},
    delays: {}
}

export default implementation