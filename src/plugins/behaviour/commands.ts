import { createCommand } from 'lexical'

import type {
  DeleteCardPayload,
  FocusCardPayload,
  LinkMatchPayload,
  OpenCardInEditModePayload,
  SelectCardPayload,
} from './types'

export const INSERT_CARD_COMMAND = createCommand<OpenCardInEditModePayload>('INSERT_CARD_COMMAND')
export const SELECT_CARD_COMMAND = createCommand<SelectCardPayload>('SELECT_CARD_COMMAND')
export const DESELECT_CARD_COMMAND = createCommand<SelectCardPayload>('DESELECT_CARD_COMMAND')
export const EDIT_CARD_COMMAND = createCommand<FocusCardPayload>('EDIT_CARD_COMMAND')
export const DELETE_CARD_COMMAND = createCommand<DeleteCardPayload>('DELETE_CARD_COMMAND')
export const PASTE_LINK_COMMAND = createCommand<LinkMatchPayload>('PASTE_LINK_COMMAND')
export const SHOW_CARD_VISIBILITY_SETTINGS_COMMAND = createCommand<SelectCardPayload>(
  'SHOW_CARD_VISIBILITY_SETTINGS_COMMAND',
)
export const HIDE_CARD_VISIBILITY_SETTINGS_COMMAND = createCommand<SelectCardPayload>(
  'HIDE_CARD_VISIBILITY_SETTINGS_COMMAND',
)
