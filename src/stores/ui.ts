// 纯界面状态：面板、弹窗队列、提示
import { defineStore } from 'pinia'

export type PanelId =
  | 'lab'
  | 'cellar'
  | 'taps'
  | 'shop'
  | 'encyclopedia'
  | 'research'
  | 'equipment'
  | 'decor'
  | 'staff'
  | 'map'
  | 'achievements'
  | 'quests'
  | 'feed'
  | 'settings'
  | 'brew'
  | 'stats'

export interface Toast {
  id: number
  text: string
  icon?: string
  kind?: 'info' | 'good' | 'bad' | 'gold'
}

export type Modal =
  | { kind: 'tasting'; batchId: string }
  | { kind: 'discovery'; styleId: string; batchId?: string; name: string }
  | { kind: 'npc'; npcId: string; lines: string[]; gift?: string }
  | { kind: 'report'; day: number }
  | { kind: 'bankrupt' }
  | { kind: 'levelup'; level: number }
  | { kind: 'achievement'; id: string }
  | { kind: 'dbupdate'; added: number; version: string }
  | { kind: 'confirm'; text: string; onYes: () => void }

let toastId = 1

export const useUi = defineStore('ui', {
  state: () => ({
    panel: null as PanelId | null,
    panelArg: null as any,
    modals: [] as Modal[],
    toasts: [] as Toast[],
    /** 正在进行的酿造（酿造对话框参数） */
    brewRecipeId: null as string | null,
    encyclopediaStyle: null as string | null,
    labRecipeId: null as string | null,
    highlight: null as string | null,
  }),
  actions: {
    open(p: PanelId, arg?: any) {
      this.panel = p
      this.panelArg = arg ?? null
    },
    close() {
      this.panel = null
      this.panelArg = null
    },
    toast(text: string, icon?: string, kind: Toast['kind'] = 'info') {
      const t = { id: toastId++, text, icon, kind }
      this.toasts.push(t)
      if (this.toasts.length > 6) this.toasts.shift()
      setTimeout(() => {
        this.toasts = this.toasts.filter((x) => x.id !== t.id)
      }, 4200)
    },
    push(m: Modal) {
      this.modals.push(m)
    },
    pop() {
      this.modals.shift()
    },
  },
})
