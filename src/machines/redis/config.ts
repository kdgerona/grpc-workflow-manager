const config = {
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