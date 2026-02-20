/* eslint-disable no-console */
import * as ansis from 'ansis'

export const log = {
  success(message: string): void {
    console.log(`${ansis.green('✔')} ${message}`)
  },
  error(message: string): void {
    console.error(`${ansis.red('✖')} ${message}`)
  },
  info(message: string): void {
    console.log(`${ansis.cyan('●')} ${message}`)
  },
}
