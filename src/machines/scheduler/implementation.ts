import { actions, assign } from 'xstate'
const { log } = actions

const implementation = {
    actions: {
        logSchedulerWaitingRedisConn: log('*** Scheduler is waiting for redis connection ***'),
        assignRedisClient: assign<any, any>({
            redis: (_: any, { payload }: any) => payload
        }),
        logSchedulerListening: log('*** Scheduler is listening for queues ***'),
    },
    services: {},
    guards: {},
    activities: {},
    delays: {}
}

export default implementation