<template lang="pug">
.SearchBar(
  id="search_bar"
  :data-showed="Settings.state.searchBarMode === 'static' || Search.reactive.barIsShowed"
  :data-active="Search.reactive.barIsActive"
  :data-focused="Search.reactive.barIsFocused"
  :data-filled="!!Search.reactive.rawValue")
  .search-icon(@mousedown.stop.prevent="" @mouseup.stop.prevent="")
    svg: use(xlink:href="#icon_search")
  .placeholder {{translate('bar.search.placeholder')}}
  input.input(
    ref="textEl"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    tabindex="-1"
    v-model="Search.reactive.rawValue"
    @input.passive="onInput"
    @focus="onFocus"
    @blur="onBlur"
    @change="onChange"
    @keydown="onKD")
  .clear-btn(
    v-if="Settings.state.searchBarMode === 'dynamic' || Search.reactive.rawValue"
    @mousedown.stop="onClearBtnMouseDown"
    @mouseup.stop="onClearBtnMouseUp")
    svg: use(xlink:href="#icon_remove")
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { translate } from 'src/dict'
import { Settings } from 'src/services/settings'
import { Search } from 'src/services/search'

const textEl = ref<HTMLInputElement | null>(null)

onMounted(() => {
  if (textEl.value) Search.registerInputEl(textEl.value)
})

function onClearBtnMouseDown(e: MouseEvent): void {
  if (Search.reactive.rawValue) Search.onOutsideSearchInput('')
  else {
    Search.hideBar()
    e.preventDefault()
  }
}

function onClearBtnMouseUp(): void {
  Search.focus()
}

function onKD(e: KeyboardEvent): void {
  // Clear input, [hide the bar]
  if (Search.reactive.barIsShowed && e.key === 'Escape') return Search.stop()

  if (!Search.reactive.rawValue) return

  // Select all
  if (e.code === 'KeyA' && e.ctrlKey && e.shiftKey) {
    e.preventDefault()
    Search.selectAll()
  }

  // Down
  else if (e.key === 'ArrowDown') {
    e.preventDefault()
    Search.next()
  }

  // Up
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    Search.prev()
  }

  // Enter
  else if (e.key === 'Enter' && !e.altKey) {
    e.preventDefault()
    Search.enter()
  }

  // Menu
  else if (e.key === 'ContextMenu') {
    e.preventDefault()
    Search.menu()
  }
}

let inputTimeout: number | undefined
function onInput(e: Event): void {
  if (Search.reactive.rawValue) Search.showBar()

  clearTimeout(inputTimeout)
  inputTimeout = setTimeout(() => {
    Search.search((e.target as HTMLInputElement).value)
  }, Search.INPUT_TIMEOUT)
}

function onChange(e: Event): void {
  Search.search(Search.reactive.rawValue)
}

function onFocus(e: Event): void {
  Search.reactive.barIsActive = true
  Search.reactive.barIsFocused = true
}

function onBlur(e: Event): void {
  Search.reactive.barIsActive = false
  Search.reactive.barIsFocused = false
}
</script>
