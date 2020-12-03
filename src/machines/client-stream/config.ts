import { MachineConfig } from 'xstate'
import {IClientStreamContext, IClientStreamSchema, IClientStreamEvents} from './interfaces'

const context: IClientStreamContext = {
    client_id: undefined,
    stream: undefined
}

const config: MachineConfig<IClientStreamContext,IClientStreamSchema,IClientStreamEvents> = {
    id: 'client-stream',
    initial: 'listening',
    context,
    states: {
        listening: {
            entry: 'logClientListening',
            invoke: [
                {
                    id: 'client-listeners',
                    src: 'clientListeners'
                }
            ],
            on: {
                SEND_EVENT_TO_PARENT: {
                    actions: ['sendEventToParent']
                },
                SEND_TO_CLIENT: {
                    actions: ['sendEventToClient']
                },
                CONNECTION_CLOSED: {
                    target: 'error',
                    actions: [
                        'logClientDisconnected',
                        'sendParentDisconnectedClient'
                    ]
                },
                STREAM_ERROR: {
                    actions: [
                        'logStreamError'
                    ]
                }
            }
        },
        error: {
            type: 'final'
        }
    }
}

export default config