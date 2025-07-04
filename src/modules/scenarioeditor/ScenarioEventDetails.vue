<script setup lang="ts">
import { injectStrict } from "@/utils";
import { activeScenarioKey, timeModalKey } from "@/components/injects";
import { type EntityId } from "@/types/base";
import { computed, ref, watch } from "vue";
import EditableLabel from "@/components/EditableLabel.vue";
import { useUiStore } from "@/stores/uiStore";
import ScenarioEventDropdownMenu from "@/modules/scenarioeditor/ScenarioEventDropdownMenu.vue";
import { useTimeFormatStore } from "@/stores/timeFormatStore";
import type { ScenarioEventAction } from "@/types/constants";
import { useSelectedItems } from "@/stores/selectedStore";
import ItemMedia from "@/modules/scenarioeditor/ItemMedia.vue";
import TabWrapper from "@/components/TabWrapper.vue";
import { TabPanel } from "@headlessui/vue";
import EditMetaForm from "@/modules/scenarioeditor/EditMetaForm.vue";
import EditMediaForm from "@/modules/scenarioeditor/EditMediaForm.vue";
import { useToggle } from "@vueuse/core";
import type { MediaUpdate, ScenarioEventUpdate } from "@/types/internalModels";
import DescriptionItem from "@/components/DescriptionItem.vue";
import { renderMarkdown } from "@/composables/formatting";

interface Props {
  eventId: EntityId;
}

const props = defineProps<Props>();

const {
  time: { updateScenarioEvent, onGoToScenarioEventEvent },
} = injectStrict(activeScenarioKey);
const { getModalTimestamp } = injectStrict(timeModalKey);

const title = ref("");
const isEditMode = ref(false);
const toggleEditMode = useToggle(isEditMode);

const isEditMediaMode = ref(false);
const toggleEditMediaMode = useToggle(isEditMediaMode);

const { time, store } = injectStrict(activeScenarioKey);

const ui = useUiStore();
const fmt = useTimeFormatStore();
const { clear: clearSelected, activeScenarioEventId } = useSelectedItems();
const scenarioEvent = computed(() => time.getEventById(props.eventId));

const formattedEventTime = computed(() => {
  return fmt.scenarioFormatter.format(scenarioEvent.value?.startTime ?? 0);
});

const media = computed(() => {
  return scenarioEvent.value?.media?.[0];
});

const tabList = computed(() => (ui.debugMode ? ["Details", "Debug"] : ["Details"]));

watch(
  () => props.eventId,
  () => {
    title.value = scenarioEvent.value?.title ?? "";
  },
  { immediate: true },
);

const hDescription = computed(() =>
  renderMarkdown(scenarioEvent.value.description || ""),
);

function updateTitle(value: string) {
  updateScenarioEvent(props.eventId, { title: value });
}

async function onAction(action: ScenarioEventAction) {
  switch (action) {
    case "changeTime":
      const newTimestamp = await getModalTimestamp(scenarioEvent.value.startTime, {
        timeZone: store.state.info.timeZone,
        title: "Set scenario event time",
      });
      if (newTimestamp !== undefined) {
        updateScenarioEvent(props.eventId, { startTime: newTimestamp });
      }
      break;
    case "delete":
      time.deleteScenarioEvent(props.eventId);
      clearSelected();
      break;
    case "editMeta":
      toggleEditMode();
      break;
    case "editMedia":
      toggleEditMediaMode();
      break;
  }
}

onGoToScenarioEventEvent(({ event }) => {
  if (event.id !== props.eventId) {
    activeScenarioEventId.value = event.id;
  }
});

function updateMedia(mediaUpdate: MediaUpdate) {
  if (!mediaUpdate) return;
  const { media = [] } = scenarioEvent.value;
  const newMedia = { ...media[0], ...mediaUpdate };
  updateScenarioEvent(props.eventId, { media: [newMedia] });
  isEditMediaMode.value = false;
}

const onFormSubmit = (eventUpdate: ScenarioEventUpdate) => {
  updateScenarioEvent(props.eventId, eventUpdate);
  toggleEditMode();
};
</script>
<template>
  <div v-if="scenarioEvent" :key="scenarioEvent.id" class="p-1">
    <ItemMedia v-if="media" :media="media" />
    <header class="">
      <EditableLabel v-model="title" @updateValue="updateTitle" />
      <nav class="flex items-center justify-between">
        <div class="text-sm font-medium">{{ formattedEventTime }}</div>
        <ScenarioEventDropdownMenu @action="onAction" />
      </nav>
    </header>
    <TabWrapper :tabList="tabList">
      <TabPanel>
        <EditMetaForm
          class="mt-4"
          v-if="isEditMode"
          :item="scenarioEvent"
          @update="onFormSubmit"
          @cancel="toggleEditMode()"
        />
        <EditMediaForm
          v-else-if="isEditMediaMode"
          :media="media"
          @cancel="toggleEditMediaMode()"
          @update="updateMedia"
          class="mt-4"
        />
        <div v-else class="mt-4">
          <div v-if="scenarioEvent.description">
            <div class="prose prose-sm dark:prose-invert" v-html="hDescription"></div>
          </div>
          <DescriptionItem
            v-if="scenarioEvent.externalUrl"
            label="External URL"
            dd-class="truncate"
            class="mt-4"
            ><a
              target="_blank"
              draggable="false"
              class="underline"
              :href="scenarioEvent.externalUrl"
              >{{ scenarioEvent.externalUrl }}</a
            ></DescriptionItem
          >
        </div>
      </TabPanel>
      <TabPanel v-if="ui.debugMode">
        <pre v-if="ui.debugMode">{{ scenarioEvent }}</pre>
      </TabPanel>
    </TabWrapper>
  </div>
</template>
