<script setup lang="ts">
import { type RadioGroupItem } from "@/components/types";

const props = defineProps<{ items: RadioGroupItem<string>[] }>();
const choice = defineModel<string>({ required: true });
</script>
<template>
  <div class="space-y-6 sm:flex sm:items-center sm:space-y-0 sm:space-x-10">
    <div v-for="{ value, name } in items" :key="value" class="flex items-center">
      <input
        :id="value"
        type="radio"
        :value="value"
        v-model="choice"
        class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600 disabled:opacity-50"
      />
      <label
        :for="value"
        class="ml-3 block text-sm leading-6 font-medium text-gray-900"
        >{{ name }}</label
      >
    </div>
  </div>
</template>
