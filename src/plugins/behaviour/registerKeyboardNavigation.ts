import type { LexicalEditor } from 'lexical'

import { mergeRegister } from '@lexical/utils'

import type { KeyboardNavigationDeps } from './keyboard-navigation/types'

import {
  registerArrowDownCommand,
  registerArrowLeftCommand,
  registerArrowRightCommand,
  registerArrowUpCommand,
} from './keyboard-navigation/arrows'
import { registerBackspaceCommand } from './keyboard-navigation/backspace'
import { registerDeleteCommand } from './keyboard-navigation/delete'
import { registerDeleteLineCommand } from './keyboard-navigation/delete-line'
import { registerEnterCommand } from './keyboard-navigation/enter'
import { registerEscapeCommand } from './keyboard-navigation/escape'
import { registerKeyDownPassthrough } from './keyboard-navigation/key-down'
import { registerModifierCommand } from './keyboard-navigation/modifier'
import { registerTabCommand } from './keyboard-navigation/tab'

export function registerKeyboardNavigation(editor: LexicalEditor, deps: KeyboardNavigationDeps) {
  return mergeRegister(
    registerKeyDownPassthrough(editor, deps),
    registerEnterCommand(editor, deps),
    registerArrowUpCommand(editor, deps),
    registerArrowDownCommand(editor, deps),
    registerArrowLeftCommand(editor, deps),
    registerArrowRightCommand(editor, deps),
    registerModifierCommand(editor, deps),
    // backspace when card isn't selected
    registerBackspaceCommand(editor, deps),
    registerDeleteCommand(editor, deps),
    registerDeleteLineCommand(editor, deps),
    registerTabCommand(editor, deps),
    registerEscapeCommand(editor, deps),
  )
}
