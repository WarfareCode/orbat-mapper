<template>
  <div class="space-y-4 p-1">
    <ToggleField v-model="uiSettings.showToolbar">Show toolbar</ToggleField>
    <ToggleField v-model="uiSettings.showTimeline">Show timeline</ToggleField>
    <ToggleField v-model="uiSettings.showOrbatBreadcrumbs"
      >Show ORBAT breadcrumbs</ToggleField
    >
    <ToggleField v-model="settings.showScaleLine">Show scale line</ToggleField>
    <ToggleField v-model="settings.showLocation"
      >Show location of mouse cursor
    </ToggleField>
    <section>
      <p class="text-base leading-loose font-medium text-gray-900">Coordinate format</p>
      <RadioGroupList
        v-model="settings.coordinateFormat"
        :items="coordinateFormatItems"
      />
    </section>

    <section>
      <p class="text-base leading-loose font-medium text-gray-900">Measurement unit</p>
      <RadioGroupList
        v-model="measurementStore.measurementUnit"
        :items="measurementItems"
      />
    </section>
  </div>
</template>
<script setup lang="ts">
import ToggleField from "@/components/ToggleField.vue";
import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import type { RadioGroupItem } from "@/components/types";
import type { CoordinateFormatType } from "@/composables/geoShowLocation";
import RadioGroupList from "@/components/RadioGroupList.vue";
import { useUiStore } from "@/stores/uiStore";
import { useMeasurementsStore } from "@/stores/geoStore";
import { type MeasurementUnit } from "@/composables/geoMeasurement";

const settings = useMapSettingsStore();
const measurementStore = useMeasurementsStore();
const uiSettings = useUiStore();

const coordinateFormatItems: RadioGroupItem<CoordinateFormatType>[] = [
  { name: "DG", description: "Decimal degrees", value: "DecimalDegrees" },
  { name: "DMS", description: "Degree Minutes Seconds", value: "DegreeMinuteSeconds" },
  { name: "MGRS", description: "Military grid reference system", value: "MGRS" },
];

const measurementItems: RadioGroupItem<MeasurementUnit>[] = [
  { name: "Metric", value: "metric" },
  { name: "Imperial", value: "imperial" },
  { name: "Nautical", value: "nautical" },
];
</script>
