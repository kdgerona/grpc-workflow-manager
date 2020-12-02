import { MachineOptions, send, assign, spawn } from 'xstate'
import { v4 as uuidv4 } from 'uuid'
import { IManagerContext } from './interfaces'

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

                const set_worker = await redis.set(`worker-${client_id}`)

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
        pushToTaskQueueRedis: async ({ redis }: any, { payload }: any) => {
            try {
                const task_id = uuidv4()

                const set_task = await redis.set(`task-${task_id}`, JSON.stringify({
                    ...payload,
                    task_id
                }))

                const queue_task = await redis.rpush('task_queue', task_id) // Redis array index is the returned value

                console.log(`@@@@@I am here ${task_id}`, queue_task, set_task)
            }catch(e) {
                console.log('!!!!!', e)
            }
        },
        pushToWorkerQueue: async ({ redis }, { client_id }) => {
            try {
                const queue_worker = await redis.rpush('worker_queue', client_id)

                console.log(`!!! Worker queue`, queue_worker)
            }catch(e){
                console.log('@@@', e)
            }
        }
    },
    services: {
        initGrpcServer: GrpcServer,
        initRedisClient: RedisClient,
        startScheduler: Scheduler,
        queueChecker: ({ redis }) => (send, onEvent) => {
            // Bug: by the time this service is invoked,
            // the redis instace is still undefined,
            // Since the it does not get the latest context,
            // need to always pass the redis instance on event
            const checkQueue = async () => {
                const task_queue = await redis.lrange('task_queue', 0, -1)
                const worker_queue = await redis.lrange('worker_queue', 0, -1)

                console.log('@@@@@@',task_queue, worker_queue)
            }

            onEvent(checkQueue)
        }
    },
    guards: {
        // hasAvailableTaskandWorker: async ({ redis }) => {
        //     return true
        // }
    },
    activities: {},
    delays: {}
}

export default implementation