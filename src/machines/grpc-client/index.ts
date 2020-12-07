import { Machine } from 'xstate'
import config from './config'
import implementation from './implementation'

const spawnMachine = (context) => {
    return Machine({
        ...config,
        context: {
            ...config.context,
            ...context
        }
    }, implementation)
}

export default spawnMachine