import { Machine } from 'xstate'
import config from './config'
import implementation from './implementation'

export default Machine(config,implementation)