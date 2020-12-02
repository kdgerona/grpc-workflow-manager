import { MachineConfig } from 'xstate'

const context = {
    redis: undefined
}

const config: MachineConfig<any, any, any> = {
    id: 'scheduler',
    initial: 'idle',
    context,
    states: {
        idle: {
            entry: 'logSchedulerWaitingRedisConn',
            on: {
                REDIS_CONNECTED: {
                    actions: ['assignRedisClient'],
                    target: 'running'
                }
            }
        },
        running: {
            type: 'parallel',
            states: {
                listening: {
                    entry: 'logSchedulerListening',
                    on: {
                        ENQUEUE_TASK: {
                            actions: ['pushToTaskQueueRedis']
                        }
                    }
                },
                matching: {
                    entry: 'logSchedulerMatching',
                    initial: 'idle',
                    states: {
                        idle: {
                            after: {
                                3000: 'check_queues'
                            }
                        },
                        check_queues: {
                            // always: [
                            //     {
                            //         target: ''
                            //         cond: ''
                            //     },
                            //     {
                            //         target: ''
                            //     }
                            // ]
                        },
                        pairing: {}
                    }
                }
            }
        }
    }
}

export default config