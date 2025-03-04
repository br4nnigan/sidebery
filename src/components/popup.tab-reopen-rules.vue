<template lang="pug">
.TabReopenRulesPopup.popup-container(@mousedown.stop.self="onCancel" @mouseup.stop)
  .popup(v-if="Sidebar.reactive.tabReopenRulesPopup")
    h2(v-if="rules.length") {{translate('popup.tab_reopen_rules.title')}}
    .rules(v-if="rules.length" :data-active="Sidebar.reactive.tabReopenRulesPopup.container.reopenRulesActive")
      .rule(
        v-for="rule of rules"
        :key="rule.id"
        :data-active="rule.active"
        :data-edit="rule.id === editing"
        :data-type="rule.type"
        :data-color="rule.type === 'include' ? 'green' : 'red'"
        @click="editRule(rule)")
        .url-box
          .icon-box
            svg.icon: use(:xlink:href="rule.type === 'include' ? '#icon_ctr_include' : '#icon_ctr_exclude'")
          .url {{rule.url}}
          .controls-box(v-if="!editing")
            .btn-up(@click.stop="shortcutUp(rule)"): svg: use(xlink:href="#icon_expand")
            .btn-down(@click.stop="shortcutDown(rule)"): svg: use(xlink:href="#icon_expand")
            .btn-rm(@click.stop="removeRule(rule)"): svg: use(xlink:href="#icon_remove")
    ToggleField.-compact(
      v-if="rules.length"
      label="popup.tab_reopen_rules.enable_label"
      :value="Sidebar.reactive.tabReopenRulesPopup.container.reopenRulesActive"
      @update:value="toggleEnableRules")
    .space
    h2 {{editing ? translate('popup.tab_reopen_rules.editor_title.edit') : translate('popup.tab_reopen_rules.editor_title.new')}}
    .type-selector
      .type-opt(
        data-color="green"
        :data-active="newRuleType === 'include'"
        @click="newRuleType = 'include'")
        svg.icon: use(xlink:href="#icon_ctr_include")
        .label {{translate('popup.tab_reopen_rules.rule_type_include')}}
      .type-opt(
        data-color="red"
        :data-active="newRuleType === 'exclude'"
        @click="newRuleType = 'exclude'")
        svg.icon: use(xlink:href="#icon_ctr_exclude")
        .label {{translate('popup.tab_reopen_rules.rule_type_exclude')}}
    TextField.-no-separator.-compact(
      label="popup.tab_reopen_rules.rule_url_label"
      v-model:value="newRuleURL"
      :or="'URL...'"
      :line="true")

    .note(v-if="newRuleType === 'include'").
      {{translate('popup.tab_reopen_rules.rule_suffix_include', Sidebar.reactive.tabReopenRulesPopup.container.name)}}
    .note(v-else).
      {{translate('popup.tab_reopen_rules.rule_suffix_exclude', Sidebar.reactive.tabReopenRulesPopup.container.name)}}

    .ctrls(v-if="editing")
      .btn(:class="{ '-inactive': !addBtnActive }" @click="onSave").
        {{translate('popup.tab_reopen_rules.edit_rule_btn.save')}}
      .btn(@click="onEditCancel").
        {{translate('popup.tab_reopen_rules.edit_rule_btn.cancel')}}
    .ctrls(v-else)
      .btn.-wide(:class="{ '-inactive': !addBtnActive }" @click="onAdd").
        {{translate('popup.tab_reopen_rules.add_rule_btn')}}
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { translate } from 'src/dict'
import { TabReopenRuleConfig, TabReopenRuleType } from 'src/types'
import { Sidebar } from 'src/services/sidebar'
import { Containers } from 'src/services/containers'
import * as Utils from 'src/utils'
import TextField from './text-field.vue'
import ToggleField from './toggle-field.vue'
import { Permissions } from 'src/services/permissions'

interface ReopenRulePreview {
  id: ID
  type: 'include' | 'exclude'
  active: boolean
  url: string
  urlIcon?: string
}

const rules = ref<ReopenRulePreview[]>([])
const newRuleType = ref<'include' | 'exclude'>('include')
const newRuleURL = ref('')
const editing = ref<ID | null>(null)

const addBtnActive = computed<boolean>(() => {
  return !!newRuleURL.value
})

onMounted(() => {
  initPopupState()
})

function initPopupState() {
  if (!Sidebar.reactive.tabReopenRulesPopup) return []

  const output: ReopenRulePreview[] = []
  const ruleConfigs = Sidebar.reactive.tabReopenRulesPopup.container.reopenRules

  for (const conf of ruleConfigs) {
    output.push(createRulePreview(conf))
  }

  rules.value = output
}

function createRulePreview(ruleConfig: TabReopenRuleConfig): ReopenRulePreview {
  const rule: ReopenRulePreview = {
    id: ruleConfig.id,
    type: ruleConfig.type === TabReopenRuleType.Include ? 'include' : 'exclude',
    url: ruleConfig.url,
    active: ruleConfig.active,
  }

  if (ruleConfig.url) {
    rule.url = ruleConfig.url
    rule.urlIcon = '#icon_ff'
  }

  return rule
}

async function onAdd() {
  if (!Sidebar.reactive.tabReopenRulesPopup) return
  if (!addBtnActive.value) return
  if (!newRuleURL.value) return

  const container = Sidebar.reactive.tabReopenRulesPopup.container

  if (!Permissions.reactive.webData && !container.reopenRulesActive) {
    const result = await Permissions.request('<all_urls>')
    if (!result) return
  }

  // Add new rule to container config
  const ruleConfig: TabReopenRuleConfig = {
    id: Utils.uid(),
    active: true,
    type: newRuleType.value === 'include' ? TabReopenRuleType.Include : TabReopenRuleType.Exclude,
    url: newRuleURL.value,
  }
  if (!container.reopenRules.length) container.reopenRulesActive = true
  container.reopenRules.push(ruleConfig)

  // Add new rule in local rules list
  rules.value.push(createRulePreview(ruleConfig))

  // Reset inputs
  newRuleType.value = 'include'
  newRuleURL.value = ''

  Containers.saveContainers(1000)
}

function onCancel(): void {
  if (!Sidebar.reactive.tabReopenRulesPopup) return

  Sidebar.closeTabReopenRulesPopup()
}

function shortcutUp(rule: ReopenRulePreview): void {
  if (!Sidebar.reactive.tabReopenRulesPopup) return
  const container = Sidebar.reactive.tabReopenRulesPopup.container

  const index = container.reopenRules.findIndex(r => r.id === rule.id)
  if (index !== -1 && index > 0) {
    const ruleConfig = container.reopenRules.splice(index, 1)[0]
    if (ruleConfig) container.reopenRules.splice(index - 1, 0, ruleConfig)
  }

  const localIndex = rules.value.findIndex(r => r.id === rule.id)
  if (localIndex !== -1 && localIndex > 0) {
    rules.value.splice(localIndex, 1)
    rules.value.splice(localIndex - 1, 0, rule)
  }

  Containers.saveContainers(1000)
}

function shortcutDown(rule: ReopenRulePreview): void {
  if (!Sidebar.reactive.tabReopenRulesPopup) return
  const container = Sidebar.reactive.tabReopenRulesPopup.container

  const index = container.reopenRules.findIndex(r => r.id === rule.id)
  if (index !== -1 && index < container.reopenRules.length - 1) {
    const ruleConfig = container.reopenRules.splice(index, 1)[0]
    if (ruleConfig) container.reopenRules.splice(index + 1, 0, ruleConfig)
  }

  const localIndex = rules.value.findIndex(r => r.id === rule.id)
  if (localIndex !== -1 && localIndex < container.reopenRules.length - 1) {
    rules.value.splice(localIndex, 1)
    rules.value.splice(localIndex + 1, 0, rule)
  }

  Containers.saveContainers(1000)
}

function removeRule(rule: ReopenRulePreview): void {
  if (!Sidebar.reactive.tabReopenRulesPopup) return
  const container = Sidebar.reactive.tabReopenRulesPopup.container

  // Remove rule from container config
  const index = container.reopenRules.findIndex(r => r.id === rule.id)
  if (index !== -1) container.reopenRules.splice(index, 1)
  if (!container.reopenRules.length) container.reopenRulesActive = false

  // Remove rule from local list
  const localIndex = rules.value.findIndex(r => r.id === rule.id)
  if (localIndex !== -1) rules.value.splice(localIndex, 1)

  Containers.saveContainers(1000)
}

function editRule(rule: ReopenRulePreview) {
  if (editing.value === rule.id) {
    return onEditCancel()
  }

  editing.value = rule.id

  if (rule.url) newRuleURL.value = rule.url
  else newRuleURL.value = ''
  newRuleType.value = rule.type
}

function onEditCancel() {
  editing.value = null

  // Reset inputs
  newRuleURL.value = ''
  newRuleType.value = 'include'
}

function onSave() {
  if (!editing.value) return
  if (!newRuleURL.value) return

  if (!Sidebar.reactive.tabReopenRulesPopup) return
  const container = Sidebar.reactive.tabReopenRulesPopup.container

  const rule = rules.value.find(r => r.id === editing.value)
  if (!rule) return

  // Update rule in container config
  const ruleConfig = container.reopenRules.find(r => r.id === rule.id)
  if (ruleConfig) {
    ruleConfig.active = true
    ruleConfig.url = newRuleURL.value
    const isIncludeRule = newRuleType.value === 'include'
    ruleConfig.type = isIncludeRule ? TabReopenRuleType.Include : TabReopenRuleType.Exclude
    Containers.saveContainers(1000)
  }

  // Update rule in local list
  rule.url = newRuleURL.value
  rule.type = newRuleType.value
  rule.active = true

  // Reset inputs
  newRuleURL.value = ''
  newRuleType.value = 'include'
  editing.value = null
}

async function toggleEnableRules() {
  const container = Sidebar.reactive.tabReopenRulesPopup?.container
  if (!container) return

  if (!Permissions.reactive.webData && !container.reopenRulesActive) {
    const result = await Permissions.request('<all_urls>')
    if (!result) return
  }

  container.reopenRulesActive = !container.reopenRulesActive
  Containers.saveContainers(1000)
}
</script>
