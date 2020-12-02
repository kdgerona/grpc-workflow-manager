import { actions, sendParent } from 'xstate'
const { log } = actions

const implementation = {
    actions: {
        logClientListening: log(({ client_id }: any) => `*** Client ${client_id} is listening ***`),
        sendEventToClient: ({ stream }: any, { payload }: any) => {
            stream.write(payload)
        },
        sendEventToParent: sendParent((_, event: any) => event.payload),
        logClientDisconnected: log((_, event: any) => `GRPC Client Disconnected: ${event.payload.client_id}`),
        sendParentDisconnectedClient: sendParent((_, event: any) => event),
        logStreamError: log((_, event: any) => `Stream Error: ${JSON.stringify(event.payload.error, null, 4)}`),
    },
    services: {
        clientListeners: ({ stream, client_id }: any) => (send: any) => {
            console.log('IM HERE!!!!')

            const connection_closed = {
                type: 'CONNECTION_CLOSED',
                payload: {
                    client_id
                }
            }

            stream.on('data', (payload: any) => {
                // send(data)

                console.log(payload)

                sendParent({
                    type: 'SEND_EVENT_TO_PARENT',
                    payload
                })
            })

            stream.on('error', (error: any) => {
                // Send error data
                send({
                    type: 'STREAM_ERROR',
                    payload: {
                        error
                    }
                })

                send(connection_closed)
            })

            stream.on('end', () => {
                send(connection_closed)
            })
        }
    },
    guards: {},
    activities: {},
    delays: {}
}

export default implementation