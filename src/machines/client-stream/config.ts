import { MachineConfig } from 'xstate'
import {IClientStreamContext, IClientStreamSchema, IClientStreamEvents} from './interfaces'

const context: IClientStreamContext = {
    client_id: undefined,
    stream: undefined,
    active_tasks: {}
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
                },
                ADD_ACTIVE_TASK: {
                    actions: [
                        'addActiveTask'
                    ]
                },
                REMOVE_ACTIVE_TASK: {
                    actions: ['removeActiveTask']
                }
            }
        },
        error: {
            type: 'final'
        }
    }
}

export default config