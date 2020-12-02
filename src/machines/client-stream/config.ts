const context = {
    client_id: undefined,
    stream: undefined
}

const config = {
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
        }
    }
}

export default config