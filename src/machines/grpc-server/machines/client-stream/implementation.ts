import { actions, sendParent } from 'xstate'
const { log } = actions

const implementation = {
    actions: {
        logClientListening: log(({ client_id }: any) => `*** Client ${client_id} is listening ***`),
        sendEventToClient: ({ stream }: any, { payload }: any) => {
            stream.write(payload)
        },
        sendEventToParent: sendParent((_, event: any) => event.payload)
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

            stream.on('data', (data: any) => {
                // send(data)

                console.log(data)
            })

            stream.on('error', (error: any) => {
                // Send error data
                send({
                    type: 'SEND_EVENT_TO_PARENT',
                    payload: {
                        type: 'STREAM_ERROR',
                        payload: {
                            error
                        }
                    }
                })

                send({
                    type: 'SEND_EVENT_TO_PARENT',
                    payload: connection_closed
                })
            })

            stream.on('end', () => {
                send({
                    type: 'SEND_EVENT_TO_PARENT',
                    payload: connection_closed
                })
            })
        }
    },
    guards: {},
    activities: {},
    delays: {}
}

export default implementation