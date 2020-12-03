import { MachineOptions, actions, sendParent } from 'xstate'
import {IClientStreamContext} from './interfaces'
const { log } = actions

const implementation: MachineOptions<IClientStreamContext, any> = {
    actions: {
        logClientListening: log(({ client_id }) => `*** Client ${client_id} is listening ***`),
        sendEventToClient: ({ stream }, { payload }) => {
            const data = {
                ...payload,
                payload: JSON.stringify(payload.payload)
            }

            stream?.write(data)
        },
        sendEventToParent: sendParent((_, event) => event.payload),
        logClientDisconnected: log((_, event) => `GRPC Client Disconnected: ${event.payload.client_id}`),
        sendParentDisconnectedClient: sendParent((_, event) => event),
        logStreamError: log((_, event) => `Stream Error: ${JSON.stringify(event.payload.error, null, 4)}`),
    },
    services: {
        clientListeners: ({ stream, client_id }) => (send) => {
            const connection_closed = {
                type: 'CONNECTION_CLOSED',
                payload: {
                    client_id
                }
            }

            stream!.on('data', (payload) => {
                send({
                    type: 'SEND_EVENT_TO_PARENT',
                    payload
                })
            })

            stream!.on('error', (error) => {
                // Send error data
                send({
                    type: 'STREAM_ERROR',
                    payload: {
                        error
                    }
                })

                send(connection_closed)
            })

            stream!.on('end', () => {
                send(connection_closed)
            })
        }
    },
    guards: {},
    activities: {},
    delays: {}
}

export default implementation