import { Session, Database } from 'koishi-core'
import {} from 'koishi-plugin-mysql'
import {} from 'koishi-plugin-mongo'

export interface ActiveData {
  activeUsers: number
  activeGroups: number
}

declare module 'koishi-core' {
  interface User {
    lastCall: Date
  }

  interface Database {
    getActiveData(): Promise<ActiveData>
  }

  interface Tables {
    schedule: Schedule
  }
}

export interface Schedule {
  id: number
  assignee: number
  time: Date
  interval: number
  command: string
  session: Session
}

Database.extend('koishi-plugin-mysql', {
  async getActiveData() {
    const [[{ 'COUNT(*)': activeUsers }], [{ 'COUNT(*)': activeGroups }]] = await this.query<[{ 'COUNT(*)': number }][]>([
      'SELECT COUNT(*) FROM `user` WHERE CURRENT_TIMESTAMP() - `lastCall` < 1000 * 3600 * 24',
      'SELECT COUNT(*) FROM `channel` WHERE `assignee`',
    ])
    return { activeGroups, activeUsers }
  },
})

Database.extend('koishi-plugin-mysql', ({ tables, Domain }) => {
  tables.user.lastCall = 'timestamp'
  tables.channel.name = 'varchar(50)'
  tables.channel.activity = new Domain.Json()
})

Database.extend('koishi-plugin-mongo', {
  async getActiveData() {
    const $gt = new Date(new Date().getTime() - 1000 * 3600 * 24)
    const [activeGroups, activeUsers] = await Promise.all([
      this.channel.find({ assignee: { $ne: null } }).count(),
      this.user.find({ lastCall: { $gt } }).count(),
    ])
    return { activeGroups, activeUsers }
  },
})
