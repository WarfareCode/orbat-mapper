<template>
  <form @submit.prevent="onLoad" class="mt-4 space-y-6" ref="dropZoneRef">
    <fieldset class="space-y-4">
      <SimpleSelect
        class="sm:hidden"
        label="Input source"
        :items="sourceItems"
        v-model="store.inputSource"
      >
      </SimpleSelect>
      <RadioGroup
        v-model="store.inputSource"
        class="hidden items-center space-x-8 sm:flex"
      >
        <RadioGroupLabel class="text-sm font-medium text-gray-700"
          >Input source
        </RadioGroupLabel>
        <RadioGroupOption
          v-for="{ label, value } in sourceItems"
          v-slot="{ checked }"
          :key="value"
          :value="value"
        >
          <span
            :class="[
              checked
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700',
              'cursor-pointer rounded-md px-3 py-2 text-sm font-medium',
            ]"
            >{{ label }}</span
          >
        </RadioGroupOption>
      </RadioGroup>
      <div
        v-if="store.inputSource === 'file'"
        class="mt-4 h-24 w-full rounded-lg border-2 border-dashed p-4 ring-offset-2 focus-within:ring-2 hover:border-gray-500"
        :class="isOverDropZone ? 'cursor-crosshair border-green-500' : ''"
      >
        <input
          type="file"
          id="file"
          @change="onFileLoad"
          class="absolute h-[0.1px] w-[0.1px] opacity-0"
        />
        <label
          for="file"
          class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 hover:text-gray-700"
        >
          <span class="text-base">Drag a file here or click to select local file</span>
          <span v-if="currentFilename" class="text-sm">
            Current file
            <span class="font-mono text-blue-800">{{ currentFilename }}</span>
          </span>
        </label>
      </div>
      <div v-else-if="store.inputSource === 'string'" class="min-h-[6rem]">
        <TextAreaGroup rows="3" v-model="stringSource" />
      </div>
      <div v-else-if="store.inputSource === 'url'">
        <div class="flex items-end justify-between gap-2">
          <InputGroup v-model="urlSource" label="URL" class="flex-auto" />

          <div class="shrink-0">
            <Button variant="outline" @click="onUrlLoad">Load from URL</Button>
          </div>
        </div>
        <p class="mt-2 text-sm">
          Please note that the scenario host must be configured to allow CORS requests.
        </p>
      </div>
      <div v-else-if="store.inputSource === 'browser'" class="">
        <ImportLoadStepBrowser @loaded="onBrowserLoad" />
      </div>
    </fieldset>
    <AlertWarning v-if="isError && errorMessage" title="Error"
      >{{ errorMessage }}
    </AlertWarning>
    <div v-if="stringSource" class="space-y-4">
      <p v-if="guessedFormat" class="text-sm">
        The format seems to be <span class="text-red-900">{{ guessedFormat }}.</span>
      </p>
      <SimpleSelect
        label="Select import format"
        :items="formatItems"
        v-model="form.format"
      >
        <template #hint>
          <DocLink href="https://docs.orbat-mapper.app/guide/import-data" />
        </template>
      </SimpleSelect>
      <div class="prose prose-sm">
        <p v-if="isMilx">
          Basic support for importing MilX layers from
          <a href="https://www.map.army/">map.army</a>
        </p>
        <p v-else-if="isGeojson">Import units and features.</p>
        <p v-else-if="isUnitGenerator">
          Import ORBAT generated with
          <a href="https://spatialillusions.com/unitgenerator2/" target="_blank"
            >Spatial Illusions Orbat builder</a
          >.
        </p>
        <p v-else-if="isOrbatGenerator">
          Import ORBAT generated with
          <a href="https://www.orbatgenerator.com/" target="_blank"
            >Order of Battle Generator</a
          >.
        </p>
      </div>
      <p v-if="isMilx" class="prose prose-sm">
        Please note that the import functionality is experimental.
      </p>
    </div>
    <img v-if="objectUrl" :src="objectUrl" alt="Loaded image" />

    <footer class="flex items-center justify-end space-x-2 pt-4">
      <Button type="submit" size="sm">Load</Button>
      <Button size="sm" variant="outline" @click="emit('cancel')">Cancel</Button>
    </footer>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from "vue";
import SimpleSelect from "@/components/SimpleSelect.vue";
import { type SelectItem } from "@/components/types";
import { RadioGroup, RadioGroupLabel, RadioGroupOption } from "@headlessui/vue";
import type { GuessedImportFormat, ImportFormat, ImportSettings } from "@/types/convert";
import { useNotifications } from "@/composables/notifications";
import NProgress from "nprogress";
import { useDropZone } from "@vueuse/core";
import TextAreaGroup from "@/components/TextAreaGroup.vue";
import { useImportStore } from "@/stores/importExportStore";
import { useScenarioImport } from "@/composables/scenarioImport";
import { guessImportFormat, type ImportedFileInfo } from "@/importexport/fileHandling";
import { useDragStore } from "@/stores/dragStore";
import type { OrbatGeneratorOrbat, SpatialIllusionsOrbat } from "@/types/externalModels";
import DocLink from "@/components/DocLink.vue";
import InputGroup from "@/components/InputGroup.vue";
import AlertWarning from "@/components/AlertWarning.vue";
import { isUrl } from "@/utils";
import type { FeatureCollection } from "geojson";
import ImportLoadStepBrowser from "@/modules/scenarioeditor/ImportLoadStepBrowser.vue";
import { type Scenario } from "@/types/scenarioModels";
import { Button } from "@/components/ui/button";

const emit = defineEmits(["cancel", "loaded"]);

const formatItems: SelectItem<ImportFormat>[] = [
  { label: "MilX", value: "milx" },
  { label: "GeoJSON", value: "geojson" },
  { label: "Spatial Illusions ORBAT builder", value: "unitgenerator" },
  { label: "Order of Battle Generator", value: "orbatgenerator" },
  { label: "KML/KMZ", value: "kml" },
  { label: "XLSX", value: "xlsx" },
];

const sourceItems: SelectItem<string>[] = [
  { label: "Local file", value: "file" },
  { label: "Paste text", value: "string" },
  { label: "URL", value: "url" },
  { label: "Browser", value: "browser" },
];

const stringSource = ref("");
const urlSource = ref("");
const currentFilename = ref("");
const objectUrl = ref("");
const fileInfo = shallowRef<ImportedFileInfo>();
const isError = ref(false);
const errorMessage = ref("");

const store = useImportStore();
const dragStore = useDragStore();

const dropZoneRef = ref<HTMLDivElement>();
const { isOverDropZone } = useDropZone(dropZoneRef, onDrop);

interface Form extends ImportSettings {
  format: ImportFormat;
}

const guessedFormat = ref<GuessedImportFormat>("unknown");

const form = ref<Form>({
  format: store.format,
  includeFeatures: false,
  includeUnits: true,
  fileName: "scenario.geojson",
  embedIcons: true,
  useShortName: true,
});

const { send } = useNotifications();

const isMilx = computed(() => form.value.format === "milx");
const isGeojson = computed(() => form.value.format === "geojson");
const isUnitGenerator = computed(() => form.value.format === "unitgenerator");
const isOrbatGenerator = computed(() => form.value.format === "orbatgenerator");
const { importMilxString, importJsonString } = useScenarioImport();

async function onBrowserLoad(data: Scenario) {
  fileInfo.value = {
    format: "orbatmapper",
    dataAsString: "",
    objectUrl: "",
    isInvalid: false,
    errors: [],
    dialect: "unknown",
    isZipped: false,
    isJson: false,
    fileName: "indexed-db",
    hasMultipleFiles: false,
  };
  emit("loaded", "orbatmapper", data, fileInfo.value);
}

async function onLoad() {
  const { format } = form.value;

  NProgress.start();

  if (format === "milx" && stringSource.value) {
    const data = await importMilxString(stringSource.value);
    send({ message: `Loaded data as ${format}` });
    NProgress.done();
    emit("loaded", "milx", data, fileInfo.value);
  }

  if (format === "kml" && stringSource.value) {
    send({ message: `Loaded data as ${format}` });
    NProgress.done();
    emit("loaded", "kml", objectUrl.value, fileInfo.value);
  }

  if (format === "image" && objectUrl.value) {
    send({ message: `Loaded data as ${format}` });
    NProgress.done();
    emit("loaded", "image", objectUrl.value, fileInfo.value);
  }

  if (format === "geojson" && stringSource.value) {
    const data = importJsonString<FeatureCollection>(stringSource.value);
    send({ message: `Loaded data as ${format}` });
    NProgress.done();
    emit("loaded", "geojson", data, fileInfo.value);
  }

  if (format === "unitgenerator" && stringSource.value) {
    const data = importJsonString<SpatialIllusionsOrbat>(stringSource.value);
    send({ message: `Loaded data as ${format}` });
    NProgress.done();
    console.log(data);
    emit("loaded", "unitgenerator", data, fileInfo.value);
  }

  if (format === "orbatgenerator" && stringSource.value) {
    const data = importJsonString<OrbatGeneratorOrbat>(stringSource.value);
    send({ message: `Loaded data as ${format}` });
    NProgress.done();
    emit("loaded", "orbatgenerator", data, fileInfo.value);
  }

  if (format === "orbatmapper" && stringSource.value) {
    const data = importJsonString<OrbatGeneratorOrbat>(stringSource.value);
    NProgress.done();
    emit("loaded", "orbatmapper", data, fileInfo.value);
  }

  if (format === "xlsx" && stringSource.value) {
    send({ message: `Loaded data as ${format}` });

    emit("loaded", "xlsx", stringSource.value, fileInfo.value);
  }

  NProgress.done();
}

function onDrop(files: File[] | null) {
  if (files) {
    handleFiles(files);
    dragStore.draggedFiles = null;
  }
}

const onFileLoad = (e: Event) => {
  const target = <HTMLInputElement>e.target;
  if (!target?.files?.length) return;
  const files = Array.from(target.files);
  handleFiles(files);
};

const onUrlLoad = async () => {
  const url = urlSource.value;
  if (!url) return;
  if (!isUrl(url)) {
    isError.value = true;
    errorMessage.value = `The url ${url} is not a valid url.`;
    return;
  }

  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const file = new File([buffer], url.split("/").pop() || "", {
      type: response.headers.get("Content-Type") || "",
    });
    await handleFiles([file]);
  } catch (e: any) {
    send({ message: `Failed to load ${url}: ${e?.message}` });
    isError.value = true;
    errorMessage.value = `Failed to load ${url}: ${e?.message}`;
  }
};

async function handleFiles(files: File[]) {
  const file = files[0];
  currentFilename.value = file.name;
  const info = await guessImportFormat(file);
  fileInfo.value = info;
  if (info.isInvalid) {
    info.errors.forEach((message) => send({ message }));
    return;
  }

  stringSource.value = info.dataAsString;
  objectUrl.value = info.objectUrl;
  guessedFormat.value = info.format;
  if (info.format !== "unknown") {
    form.value.format = info.format;
    await onLoad();
  }
}

onMounted(() => {
  if (dragStore.draggedFiles) onDrop(dragStore.draggedFiles);
});
</script>
