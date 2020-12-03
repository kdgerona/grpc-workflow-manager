import { MachineConfig } from 'xstate'
import { IRedisContext, IRedisSchema, IRedisEvents } from './interfaces'

const config: MachineConfig<IRedisContext, IRedisSchema, IRedisEvents> = {
    id: 'redis',
    initial: 'initialize',
    states: {
        initialize: {
            entry: 'logInitializingRedisClient',
            invoke: [
                {
                    id: 'initialize-redis',
                    src: 'initializeRedis'
                }
            ],
            on: {
                REDIS_CLIENT_CONNECTED: {
                    actions: [
                        'sendToParentRedisClient',
                        'logRedisClientInitialized'
                    ]
                },
                REDIS_CLIENT_CONN_ERROR: {
                    actions: ['logConnectionError']
                }
            }
        },
    }
}

export default config