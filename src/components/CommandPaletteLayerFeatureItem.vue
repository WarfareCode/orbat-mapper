<template>
  <li
    :class="[
      'flex cursor-default items-center px-4 py-2 select-none',
      active && 'bg-army text-white',
    ]"
  >
    <div class="flex w-7 justify-center">
      <component :is="getItemsIcon(item.type)" class="h-6 w-6 text-gray-400" />
    </div>
    <p
      class="ml-3 flex-auto truncate"
      v-html="item.highlight ? item.highlight : item.name"
    />
  </li>
</template>
<script setup lang="ts">
import { type LayerFeatureSearchResult } from "@/components/types";
import { getItemsIcon } from "@/modules/scenarioeditor/featureLayerUtils";

const props = defineProps<{ item: LayerFeatureSearchResult; active?: boolean }>();
</script>
