import { interpret } from 'xstate'
import Manager from './machines/manager'

const managerService = interpret(Manager)

managerService.start()

// setInterval(() => {
//     managerService.send({
//         type: 'RECEIVED_MESSAGE_KAFKA',
//         payload: { 
//             type: 'TASK' , 
//             payload: {
//               type: 'CREATE_USER',
//             //   client_id: 'test-id',
//             //   task_id: 'task-id-1',
//             //   spawn_id: 'test-spawn-id-1',
//               payload: {
//                 first_name: 'Test First name',
//                 last_name: 'Test Last name',
//                 email: 'test@gmail.com'
//               }
//             }
//         }
//     })
// }, 3000)

//     managerService.send({
//         type: 'READY',
//         client_id: '1',
//         payload: {
//             client_id: '1',
//             type: 'CREATE_USER_AND_SEND_EMAIL'
//         }
//     })

// setInterval(() => {
//     managerService.send('CHECK_QUEUES')
// }, 3000)

// TEST DATA

// {"type": "TASK","payload": {"type": "CREATE_USER","payload": {"first_name": "Test First name","last_name": "Test Last name","email": "test@gmail.com"}}}