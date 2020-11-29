import { MachineOptions, send } from 'xstate'
import GrpcServer from '../grpc-server'
import { IManagerContext } from './interfaces'

const implementation: MachineOptions<IManagerContext, any> = {
    actions: {
        startGrpcServer: send('START_GRPC_SERVER', { to: 'grpc-server'})
    },
    services: {
        initGrpcServer: GrpcServer
    },
    guards: {},
    activities: {},
    delays: {}
}

export default implementation