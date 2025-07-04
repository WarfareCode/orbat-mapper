<script setup lang="ts">
import { ChevronRightIcon } from "@heroicons/vue/20/solid";
import BaseButton from "@/components/BaseButton.vue";
import type { TableColumn } from "@/modules/scenarioeditor/types";
import type { NSideGroup } from "@/types/internalModels";
import GridEditableCell from "@/modules/scenarioeditor/GridEditableCell.vue";

interface Props {
  sideGroup: NSideGroup;
  columns: TableColumn[];
  sgOpen: Map<NSideGroup, boolean>;
  itemIndex: number;
  isActive: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits([
  "toggle",
  "expand",
  "updateSideGroup",
  "nextCell",
  "activeItem",
]);

function toggleOpen() {
  emit("toggle", props.sideGroup);
}
</script>
<template>
  <tr class="bg-gray-100">
    <td class="relative">
      <div v-if="isActive" class="absolute inset-y-0 right-0 w-0.5 bg-indigo-600"></div>
    </td>
    <td class="hover:cursor-pointer" @click="emit('toggle', sideGroup)">
      <div
        :id="`cell-${itemIndex}-0`"
        tabindex="0"
        class="flex h-12 items-center border-2 border-gray-100 bg-gray-100 py-2 pr-3 text-sm font-medium whitespace-nowrap text-gray-900 focus-within:border-red-800"
        @click.self="toggleOpen()"
        @keydown.enter.exact="toggleOpen()"
      >
        <button
          tabindex="0"
          @click.stop="emit('toggle', sideGroup)"
          class="ml-0 flex items-center"
        >
          <ChevronRightIcon
            class="h-6 w-6 transform text-gray-500 transition-transform group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-100"
            :class="{
              'rotate-90': sgOpen.get(sideGroup) ?? true,
            }"
          />
        </button>
        <button class="ml-2 hover:underline">{{ sideGroup.name }}</button>
      </div>
    </td>
    <td class="">
      <GridEditableCell
        :value="sideGroup.name"
        :row-index="itemIndex"
        :col-index="1"
        @update="emit('updateSideGroup', sideGroup.id, { name: $event })"
        @next-cell="emit('nextCell', $event)"
        @active="emit('activeItem', 'name')"
      />
    </td>
    <td :colspan="columns.length - 1" class="">
      <div
        class="flex h-12 items-center py-2 pr-3 text-sm font-medium whitespace-nowrap text-gray-900"
      >
        <BaseButton small class="ml-2" @click="emit('expand', sideGroup)"
          >Expand/collapse
        </BaseButton>
      </div>
    </td>
  </tr>
</template>
