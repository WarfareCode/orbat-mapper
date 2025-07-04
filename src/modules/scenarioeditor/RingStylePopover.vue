<script setup lang="ts">
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type RangeRingStyle } from "@/types/scenarioGeoModels";
import DrawRangeRingMarker from "@/components/DrawRangeRingMarker.vue";
import { computed } from "vue";
import { type SimpleStyleSpec } from "@/geo/simplestyle";
import { useUiStore } from "@/stores/uiStore";
import { PopoverClose } from "reka-ui";
import CloseButton from "@/components/CloseButton.vue";
import PopoverColorPicker from "@/components/PopoverColorPicker.vue";
import { Slider } from "@/components/ui/slider";

interface Props {
  ringStyle: Partial<RangeRingStyle>;
  disabled?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(["update"]);
const rStyle = computed((): RangeRingStyle => {
  return {
    fill: props.ringStyle.fill ?? null,
    "fill-opacity": props.ringStyle["fill-opacity"] ?? 0.5,
    stroke: props.ringStyle.stroke ?? "#f43f5e",
    "stroke-width": props.ringStyle["stroke-width"] ?? 2,
    "stroke-opacity": props.ringStyle["stroke-opacity"] ?? 1,
    "stroke-style": props.ringStyle["stroke-style"] ?? "solid",
  };
});

const uiStore = useUiStore();

const width = computed({
  get: () => [rStyle.value["stroke-width"]],
  set: ([v]) => emit("update", { "stroke-width": v }),
});

const strokeOpacity = computed({
  get: () => [rStyle.value["stroke-opacity"]],
  set: ([v]) => emit("update", { "stroke-opacity": v }),
});

const strokeOpacityAsPercent = computed(() => (strokeOpacity.value[0]! * 100).toFixed(0));

const fillOpacity = computed({
  get: () => [rStyle.value["fill-opacity"]],
  set: ([v]) => emit("update", { "fill-opacity": v }),
});

const fillOpacityAsPercent = computed(() => (fillOpacity.value[0]! * 100).toFixed(0));

function updateValue(name: keyof SimpleStyleSpec, value: string | number) {
  emit("update", { [name]: value });
}

function onOpen(isOpen: boolean) {
  if (isOpen) {
    uiStore.popperCounter++;
  } else {
    uiStore.popperCounter--;
  }
}
</script>
<template>
  <Popover @update:open="onOpen">
    <PopoverTrigger
      title="Change style"
      class="hover:bg-gray-100 disabled:opacity-50"
      :disabled="disabled"
    >
      <DrawRangeRingMarker :styling="rStyle" />
    </PopoverTrigger>
    <PopoverContent class="relative" side="left" align="start">
      <div class="flex items-center justify-between text-sm font-bold">
        <h3>Set range ring style</h3>
        <div />
      </div>
      <section
        class="text-foreground mt-4 grid w-full grid-cols-[max-content_1fr] gap-4 pb-1 text-sm"
      >
        <div class="col-span-2 -mb-2 font-semibold">Stroke</div>
        <div>Color</div>
        <PopoverColorPicker
          :model-value="rStyle['stroke'] as string | undefined"
          @update:model-value="updateValue('stroke', $event)"
        />
        <label for="stroke-width" class="">Width</label>
        <div class="grid grid-cols-[1fr_5ch] gap-4">
          <Slider
            id="stroke-width"
            v-model="width"
            :min="1"
            :max="10"
            :step="1"
            class="min-w-20"
          />
          <span class="">{{ rStyle["stroke-width"] }} px</span>
        </div>
        <label for="stroke-opacity">Opacity</label>
        <div class="grid grid-cols-[1fr_5ch] gap-4">
          <Slider
            id="stroke-opacity"
            v-model="strokeOpacity"
            :min="0"
            :max="1"
            :step="0.01"
            class="min-w-20"
          />
          <span class="">{{ strokeOpacityAsPercent }}%</span>
        </div>
      </section>

      <section
        class="text-foreground mt-4 grid w-full grid-cols-[max-content_1fr] gap-4 pb-1 text-sm"
      >
        <div class="col-span-2 -mb-2 font-semibold">Fill</div>
        <div>Color</div>
        <PopoverColorPicker
          :model-value="rStyle['fill'] as string | undefined"
          @update:model-value="updateValue('fill', $event)"
          showNone
        />

        <label for="stroke-opacity">Opacity</label>
        <div class="grid grid-cols-[1fr_5ch] gap-4">
          <Slider
            id="stroke-opacity"
            v-model="fillOpacity"
            :min="0"
            :max="1"
            :step="0.01"
            class="min-w-20"
          />
          <span class="">{{ fillOpacityAsPercent }}%</span>
        </div>
      </section>
      <PopoverClose as-child>
        <CloseButton class="absolute top-4 right-4" />
      </PopoverClose>
    </PopoverContent>
  </Popover>
</template>
