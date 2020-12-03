import { MachineOptions, sendParent, actions } from 'xstate'
import asyncRedis from 'async-redis'
import { IRedisContext, IRedisEvents } from './interfaces'
const { log } = actions

const implementation: MachineOptions<IRedisContext, IRedisEvents> = {
    actions: {
        sendToParentRedisClient: sendParent((_, event) => ({
            type: 'REDIS_CLIENT_READY',
            payload: event.payload
        })),
        logConnectionError: log((_, event) => `Redis Connection Error: ${event.payload}`),
        logInitializingRedisClient: log('*** Initializing Redis Client ***'),
        logRedisClientInitialized: log('*** Redis Client Initialized ***'),
    },
    services: {
        initializeRedis: () => (send) => {
            const redis = asyncRedis.createClient()

            redis.on('error', error => {
                send({
                    type: 'REDIS_CLIENT_CONN_ERROR',
                    payload: error
                })

                return
            })

            send({
                type: 'REDIS_CLIENT_CONNECTED',
                payload: redis
            })
        }
    },
    guards: {},
    activities: {},
    delays: {},
}

export default implementation