<template>
  <RadioGroup v-model="selected">
    <RadioGroupLabel class="sr-only">{{ label }}</RadioGroupLabel>
    <div class="-space-y-px rounded-md bg-white">
      <RadioGroupOption
        as="template"
        v-for="(item, settingIdx) in items"
        :key="item.value"
        :value="item.value"
        v-slot="{ checked, active }"
      >
        <div
          :class="[
            settingIdx === 0 ? 'rounded-tl-md rounded-tr-md' : '',
            settingIdx === items.length - 1 ? 'rounded-br-md rounded-bl-md' : '',
            checked ? 'z-10 border-indigo-200 bg-indigo-50' : 'border-gray-200',
            'relative flex cursor-pointer border p-4 focus:outline-hidden',
          ]"
        >
          <span
            class="shrink-0"
            :class="[
              checked ? 'border-transparent bg-indigo-600' : 'border-gray-300 bg-white',
              active ? 'ring-2 ring-indigo-500 ring-offset-2' : '',
              'mt-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border',
            ]"
            aria-hidden="true"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <div class="ml-3 flex flex-col">
            <RadioGroupLabel
              as="span"
              :class="[
                checked ? 'text-indigo-900' : 'text-gray-900',
                'block text-sm font-medium',
              ]"
            >
              {{ item.name }}
            </RadioGroupLabel>
            <RadioGroupDescription
              as="span"
              :class="[checked ? 'text-indigo-700' : 'text-gray-500', 'block text-sm']"
            >
              {{ item.description || "" }}
            </RadioGroupDescription>
          </div>
        </div>
      </RadioGroupOption>
    </div>
  </RadioGroup>
</template>

<script setup lang="ts">
import {
  RadioGroup,
  RadioGroupDescription,
  RadioGroupLabel,
  RadioGroupOption,
} from "@headlessui/vue";
import { type RadioGroupItem } from "@/components/types";

defineProps<{
  items: RadioGroupItem[];
  label?: string;
}>();

const selected = defineModel<string>();
</script>
