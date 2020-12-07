import { interpret } from 'xstate'
import Manager from './machines/manager'

const managerService = interpret(Manager)

managerService.onTransition(state => {
    console.log('!!!@@@#@##@#', state.context.worker_queue)
})

managerService.start()

