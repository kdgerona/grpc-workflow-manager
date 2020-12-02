import { interpret } from 'xstate'
import Manager from './machines/manager'

const managerService = interpret(Manager)

managerService.start()

// setInterval(() => {
//     managerService.send({
//         type: 'RECEIVED_MESSAGE_KAFKA',
//         payload: {
//             action: 'CREATE_USER_AND_SEND_EMAIL',
//             payload: {
//                 first_name: 'Test',
//                 last_name: 'Testing',
//                 message: 'Hi! Sample!'
//             }
//         }
//     })
// }, 3000)

setInterval(() => {
    managerService.send('TEST')
}, 3000)