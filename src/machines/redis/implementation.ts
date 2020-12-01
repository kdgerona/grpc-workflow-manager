import { sendParent, actions } from 'xstate'
import asyncRedis from 'async-redis'
const { log } = actions

const implementation = {
    actions: {
        sendToParentRedisClient: sendParent((_:any, event: any) => ({
            type: 'REDIS_CLIENT_READY',
            payload: event.payload
        })),
        logConnectionError: log((_:any, event: any) => `Redis Connection Error: ${event.payload}`),
        logInitializingRedisClient: log('*** Initializing Redis Client ***'),
        logRedisClientInitialized: log('*** Redis Client Initialized ***'),
    },
    services: {
        initializeRedis: () => (send: any) => {
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