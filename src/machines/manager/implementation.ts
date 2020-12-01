import { MachineOptions, send, assign } from 'xstate'
import { IManagerContext } from './interfaces'

// Machines
import GrpcServer from '../grpc-server'
import RedisClient from '../redis'
import Scheduler from '../scheduler'

const implementation: MachineOptions<IManagerContext, any> = {
    actions: {
        startGrpcServer: send('START_GRPC_SERVER', { to: 'grpc-server'}),
        sendRedisConnectionToScheduler: send((_, { payload }: any) => ({
            type: 'REDIS_CONNECTED',
            payload
        }), { to: 'start-scheduler'}),
        // sendRedisConnectionToTracker: send((_, { payload }: any) => ({
        //     type: 'REDIS_CONNECTED',
        //     payload
        // }), { to: 'start-tracker'})
    },
    services: {
        initGrpcServer: GrpcServer,
        initRedisClient: RedisClient,
        startScheduler: Scheduler
    },
    guards: {},
    activities: {},
    delays: {}
}

export default implementation