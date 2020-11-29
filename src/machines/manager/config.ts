import { MachineConfig } from 'xstate'
import { IManagerContext, IManagerSchema, IManagerEvents } from './interfaces'

const config: MachineConfig<IManagerContext, IManagerSchema, IManagerEvents> = {
    id: 'manager',
    initial: 'start',
    states: {
        start: {
            invoke: [
                {
                    id: 'grpc-server',
                    src: 'initGrpcServer'
                }
            ],
            on: {
                KAFKA_CONSUMER_CONNECTED: {
                    actions: ['startGrpcServer']
                }
            }
        }
    }
}

export default config