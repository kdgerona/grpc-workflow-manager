import { interpret } from 'xstate'
import Manager from './machines/manager'

const managerService = interpret(Manager)

managerService.start()