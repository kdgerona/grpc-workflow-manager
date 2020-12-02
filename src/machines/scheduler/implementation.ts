import { actions, assign } from 'xstate'
import { v4 as uuidv4 } from 'uuid'
const { log } = actions

const implementation = {
    actions: {
        logSchedulerWaitingRedisConn: log('*** Scheduler is waiting for redis connection ***'),
        assignRedisClient: assign<any, any>({
            redis: (_: any, { payload }: any) => payload
        }),
        logSchedulerListening: log('*** Scheduler is listening for queues ***'),
        pushToTaskQueueRedis: async ({ redis }: any, { payload }: any) => {
            const task_id = uuidv4()

            const queued_task = await redis.lpush('task_queue', JSON.stringify({
                ...payload,
                task_id
            })) // Redis array index is the returned value

            console.log('@@@@@I am here', queued_task)
        }
    },
    services: {},
    guards: {},
    activities: {},
    delays: {}
}

export default implementation