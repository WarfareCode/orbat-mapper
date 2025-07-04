<template>
  <div class="relative flex min-h-0 flex-auto flex-col">
    <div class="relative flex flex-auto flex-col">
      <NewScenarioMap class="flex-auto" @mapReady="onMapReady" />
      <main
        v-if="mapRef"
        class="pointer-events-none absolute inset-0 flex flex-col justify-between"
      >
        <header class="flex flex-none items-center justify-end p-2">
          <MapTimeController
            class="pointer-events-auto"
            :show-controls="isMobile ? ui.mobilePanelOpen : false"
            @open-time-modal="openTimeDialog()"
            @show-settings="emit('show-settings')"
            @inc-day="onIncDay()"
            @dec-day="onDecDay()"
            @next-event="goToNextScenarioEvent()"
            @prev-event="goToPrevScenarioEvent()"
          />
          <IconButton
            @click.stop="onShowPlaceSearch"
            class="pointer-events-auto ml-2"
            title="Search"
          >
            <MagnifyingGlassIcon class="h-5 w-5 text-gray-500" />
          </IconButton>
        </header>
        <section v-if="!isMobile" class="flex flex-auto justify-between p-2">
          <MapEditorDesktopPanel v-if="showLeftPanel" @close="toggleLeftPanel()" />
          <div v-else>
            <button
              type="button"
              @click="toggleLeftPanel()"
              title="Show panel"
              class="bg-opacity-70 pointer-events-auto absolute -my-12 rounded bg-white p-1 text-gray-600 hover:text-gray-900"
            >
              <ShowPanelIcon class="h-7 w-7" />
            </button>
          </div>
          <MapEditorDetailsPanel v-if="showDetailsPanel" @close="onCloseDetailsPanel()">
            <ScenarioFeatureDetails
              v-if="activeDetailsPanel === 'feature'"
              :selected-ids="selectedFeatureIds"
            />
            <UnitDetails
              v-else-if="activeDetailsPanel === 'unit'"
              :unit-id="activeUnitId || [...selectedUnitIds][0]"
            />
            <ScenarioEventDetails
              v-else-if="activeDetailsPanel === 'event'"
              :event-id="activeScenarioEventId!"
            />
            <ScenarioMapLayerDetails
              v-else-if="activeDetailsPanel === 'mapLayer'"
              :layer-id="activeMapLayerId!"
            />
            <ScenarioInfoPanel v-else-if="activeDetailsPanel === 'scenario'" />
          </MapEditorDetailsPanel>
          <div v-else></div>
        </section>
      </main>
      <footer
        v-if="mapRef && ui.showToolbar"
        class="pointer-events-none flex justify-center sm:absolute sm:bottom-2 sm:w-full sm:p-2"
      >
        <MapEditorMainToolbar
          @open-time-modal="openTimeDialog()"
          @inc-day="onIncDay()"
          @dec-day="onDecDay()"
          @next-event="goToNextScenarioEvent()"
          @prev-event="goToPrevScenarioEvent()"
          @show-settings="emit('show-settings')"
        />
        <MapEditorMeasurementToolbar
          class="absolute bottom-14 sm:bottom-16"
          v-if="toolbarStore.currentToolbar === 'measurements'"
        />
        <MapEditorDrawToolbar
          class="absolute bottom-14 sm:bottom-16"
          v-if="toolbarStore.currentToolbar === 'draw'"
        />
        <MapEditorUnitTrackToolbar
          class="absolute bottom-14 sm:bottom-16"
          v-if="toolbarStore.currentToolbar === 'track'"
        />
      </footer>
    </div>
    <template v-if="isMobile">
      <UnitBreadcrumbs v-if="ui.showOrbatBreadcrumbs" />
      <MapEditorMobilePanel
        @open-time-modal="openTimeDialog()"
        @inc-day="onIncDay()"
        @dec-day="onDecDay()"
        @next-event="goToNextScenarioEvent()"
        @prev-event="goToPrevScenarioEvent()"
        @show-settings="emit('show-settings')"
      />
    </template>
    <KeyboardScenarioActions v-if="mapRef" />
    <SearchScenarioActions v-if="mapRef" />
    <GlobalEvents
      v-if="ui.shortcutsEnabled"
      :filter="inputEventFilter"
      @keyup.t="openTimeDialog"
      @keyup.s="ui.showSearch = true"
    />
    <UnitBreadcrumbs v-if="ui.showOrbatBreadcrumbs && !isMobile" />
    <ScenarioTimeline v-if="ui.showTimeline" />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onActivated,
  onUnmounted,
  provide,
  type ShallowRef,
  shallowRef,
  watch,
} from "vue";
import { useActiveUnitStore } from "@/stores/dragStore";
import {
  activeFeatureSelectInteractionKey,
  activeMapKey,
  activeScenarioKey,
  timeModalKey,
} from "@/components/injects";
import { IconChevronRightBoxOutline as ShowPanelIcon } from "@iconify-prerendered/vue-mdi";
import { injectStrict } from "@/utils";
import MapTimeController from "@/components/MapTimeController.vue";
import MapEditorMainToolbar from "@/modules/scenarioeditor/MapEditorMainToolbar.vue";
import { useMainToolbarStore } from "@/stores/mainToolbarStore";
import MapEditorMeasurementToolbar from "@/modules/scenarioeditor/MapEditorMeasurementToolbar.vue";
import OLMap from "ol/Map";
import NewScenarioMap from "@/components/ScenarioMap.vue";
import MapEditorDrawToolbar from "@/modules/scenarioeditor/MapEditorDrawToolbar.vue";
import Select from "ol/interaction/Select";
import { breakpointsTailwind, useBreakpoints, useRafFn, useToggle } from "@vueuse/core";
import KeyboardScenarioActions from "@/modules/scenarioeditor/KeyboardScenarioActions.vue";
import ScenarioFeatureDetails from "@/modules/scenarioeditor/ScenarioFeatureDetails.vue";
import MapEditorMobilePanel from "@/modules/scenarioeditor/MapEditorMobilePanel.vue";
import MapEditorDesktopPanel from "@/modules/scenarioeditor/MapEditorDesktopPanel.vue";
import MapEditorDetailsPanel from "@/modules/scenarioeditor/MapEditorDetailsPanel.vue";
import { useUiStore } from "@/stores/uiStore";
import { inputEventFilter } from "@/components/helpers";
import { GlobalEvents } from "vue-global-events";
import SearchScenarioActions from "@/modules/scenarioeditor/SearchScenarioActions.vue";
import IconButton from "@/components/IconButton.vue";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/solid";
import ScenarioEventDetails from "@/modules/scenarioeditor/ScenarioEventDetails.vue";
import { useSelectedItems } from "@/stores/selectedStore";
import ScenarioMapLayerDetails from "@/modules/scenarioeditor/ScenarioMapLayerDetails.vue";
import UnitDetails from "@/modules/scenarioeditor/UnitDetails.vue";
import ScenarioInfoPanel from "@/modules/scenarioeditor/ScenarioInfoPanel.vue";
import ScenarioTimeline from "@/modules/scenarioeditor/ScenarioTimeline.vue";
import MapEditorUnitTrackToolbar from "@/modules/scenarioeditor/MapEditorUnitTrackToolbar.vue";
import { storeToRefs } from "pinia";
import { usePlaybackStore } from "@/stores/playbackStore";
import UnitBreadcrumbs from "@/modules/scenarioeditor/UnitBreadcrumbs.vue";

const emit = defineEmits(["showExport", "showLoad", "show-settings"]);
const activeScenario = injectStrict(activeScenarioKey);

const { getModalTimestamp } = injectStrict(timeModalKey);
const { state, update } = activeScenario.store;
const {
  time: { setCurrentTime, add, subtract, goToNextScenarioEvent, goToPrevScenarioEvent },
} = activeScenario;
const toolbarStore = useMainToolbarStore();
const activeUnitStore = useActiveUnitStore();
const ui = useUiStore();
const playback = usePlaybackStore();

const mapRef = shallowRef<OLMap>();
const featureSelectInteractionRef = shallowRef<Select>();
provide(activeMapKey, mapRef as ShallowRef<OLMap>);
provide(
  activeFeatureSelectInteractionKey,
  featureSelectInteractionRef as ShallowRef<Select>,
);

const breakpoints = useBreakpoints(breakpointsTailwind);

const isMobile = breakpoints.smallerOrEqual("md");

function onMapReady({
  olMap,
  featureSelectInteraction,
}: {
  olMap: OLMap;
  featureSelectInteraction: Select;
}) {
  mapRef.value = olMap;
  featureSelectInteractionRef.value = featureSelectInteraction;
}

const {
  selectedUnitIds,
  selectedFeatureIds,
  activeUnitId,
  activeScenarioEventId,
  activeMapLayerId,
  showScenarioInfo,
  activeDetailsPanel,
  clear: clearSelected,
} = useSelectedItems();

const { showLeftPanel } = storeToRefs(ui);
const toggleLeftPanel = useToggle(showLeftPanel);

const showDetailsPanel = computed(() => {
  return Boolean(
    selectedFeatureIds.value.size ||
      selectedUnitIds.value.size ||
      activeScenarioEventId.value ||
      activeMapLayerId.value ||
      showScenarioInfo.value,
  );
});

onUnmounted(() => {
  activeUnitStore.clearActiveUnit();
  playback.playbackRunning = false;
});

onActivated(() => {
  mapRef.value?.updateSize();
  playback.playbackRunning = false;
});

function onCloseDetailsPanel() {
  clearSelected();
}

const openTimeDialog = async () => {
  const newTimestamp = await getModalTimestamp(state.currentTime, {
    timeZone: state.info.timeZone,
  });
  if (newTimestamp !== undefined) {
    setCurrentTime(newTimestamp);
  }
};

function onIncDay() {
  add(1, "day", true);
}

function onDecDay() {
  subtract(1, "day", true);
}

function onShowPlaceSearch() {
  ui.searchGeoMode = true;
  ui.showSearch = true;
}

const { pause, resume, isActive } = useRafFn(
  ({ delta }) => {
    if (
      playback.playbackLooping &&
      playback.endMarker !== undefined &&
      playback.startMarker !== undefined
    ) {
      if (state.currentTime >= playback.endMarker) {
        setCurrentTime(playback.startMarker);
        return;
      }
    }

    const newTime = state.currentTime + playback.playbackSpeed;
    setCurrentTime(newTime);
  },
  { immediate: false, fpsLimit: 60 },
);

watch(
  () => playback.playbackRunning,
  (running) => {
    if (running) {
      resume();
    } else {
      pause();
    }
  },
  { immediate: true },
);
</script>
