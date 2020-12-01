const context = {
    redis: undefined
}

const config = {
    id: 'scheduler',
    initial: 'idle',
    context,
    states: {
        idle: {
            entry: 'logSchedulerWaitingRedisConn',
            on: {
                REDIS_CONNECTED: {
                    actions: ['assignRedisClient'],
                    target: 'listening'
                }
            }
        },
        listening: {
            entry: 'logSchedulerListening',
            on: {
                ENQUEUE_TASK: {
                    actions: ['pushToTaskQueueRedis']
                }
            }
        }
    }
}

export default config