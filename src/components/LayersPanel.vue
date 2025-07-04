<template>
  <div>
    <p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Base layers</p>

    <BaseLayerSwitcher
      class="mt-4"
      :settings="baseLayers"
      v-model="activeBaseLayer"
      @update:layer-opacity="updateOpacity"
    />

    <p class="mt-4 text-xs font-medium tracking-wider text-gray-500 uppercase">
      Other layers
    </p>

    <div class="mt-4 overflow-hidden rounded-md bg-white shadow-sm">
      <ul class="divide-y divide-gray-200">
        <li v-for="layer in vectorLayers" :key="layer.id" class="px-6 py-4">
          <div class="flex items-center justify-between">
            <p class="flex-auto truncate text-sm">{{ layer.title }}</p>
            <div class="ml-2 flex shrink-0 items-center">
              <OpacityInput
                :model-value="layer.opacity"
                @update:model-value="updateOpacity(layer, $event)"
              />
              <button class="ml-4 h-5 w-5 text-gray-500" @click="toggleLayer(layer)">
                <EyeIcon v-if="layer.visible" />
                <EyeSlashIcon v-else />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <div class="mt-4">
      <p>For debugging:</p>
      <pre class="text-sm">{{ mapView }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, ref, shallowRef, watch } from "vue";
import { useGeoStore } from "@/stores/geoStore";
import BaseLayer from "ol/layer/Base";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import LayerGroup from "ol/layer/Group";
import { EyeIcon, EyeSlashIcon } from "@heroicons/vue/24/solid";
import BaseLayerSwitcher from "./BaseLayerSwitcher.vue";
import type { AnyTileLayer, AnyVectorLayer } from "@/geo/types";
import TileSource from "ol/source/Tile";
import { toLonLat } from "ol/proj";
import OpacityInput from "./OpacityInput.vue";
import { getUid } from "ol";
import { type LayerType } from "@/modules/scenarioeditor/featureLayerUtils";
import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import ImageLayer from "ol/layer/Image";

export interface LayerInfo<T extends BaseLayer = BaseLayer> {
  id: string;
  name: string;
  title: string;
  visible: boolean;
  zIndex: number;
  opacity: number;
  layer: T;
  subLayers?: LayerInfo<T>[];
  description?: string;
  layerType?: LayerType | "baselayer";
}

const geoStore = useGeoStore();
const mapSettings = useMapSettingsStore();
let tileLayers = ref<LayerInfo<TileLayer<TileSource>>[]>([]);
let vectorLayers = ref<LayerInfo<AnyVectorLayer>[]>([]);
let activeBaseLayer = shallowRef<LayerInfo<TileLayer<TileSource>>>();

const noneLayer = { title: "None", id: null, description: "", opacity: -1, name: "None" };
const baseLayers = computed(() => {
  const l = tileLayers.value
    .map((l) => ({ ...l, name: l.title, description: "" }))
    .filter((l) => l.layerType === "baselayer");
  // @ts-ignore
  l.push(noneLayer);
  return l;
});

const mapView = computed(() => {
  if (!geoStore.olMap) return;
  const view = geoStore.olMap.getView();
  return {
    center: toLonLat(view.getCenter() || [0, 0], view.getProjection()),
    zoom: view.getZoom(),
  };
});

watch(
  () => geoStore.olMap,
  (v) => v && updateLayers(),
  { immediate: true },
);

watch(activeBaseLayer, (layerInfo) => {
  if (!layerInfo) return;
  mapSettings.baseLayerName = layerInfo.layer?.get("name") || "None";
  baseLayers.value.forEach((l) => {
    const isVisible = l.name === layerInfo.name;
    //l.layer.setOpacity(layerInfo.opacity);
    l.visible = isVisible;
    if (l.layer) l.layer.setVisible(isVisible);
  });
});

function updateLayers() {
  if (!geoStore.olMap) return;

  const transformLayer = (layer: BaseLayer): LayerInfo => {
    const l: LayerInfo = {
      id: getUid(layer),
      title: layer.get("title") || layer.get("name"),
      name: layer.get("name"),
      layerType: layer.get("layerType"),
      visible: layer.getVisible(),
      zIndex: layer.getZIndex() || 0,
      opacity: layer.getOpacity(),
      layer: markRaw(layer),
      subLayers: [],
    };
    if (layer instanceof LayerGroup) {
      l.subLayers = layer
        .getLayers()
        .getArray()
        .filter((l) => l.get("title"))
        .map(transformLayer);
    }
    return l;
  };

  const mappedLayers = geoStore.olMap
    .getAllLayers()
    .filter((l) => l.get("title"))
    .map(transformLayer);

  tileLayers.value = mappedLayers.filter(
    ({ layer }) => layer instanceof TileLayer,
  ) as LayerInfo<AnyTileLayer>[];

  activeBaseLayer.value = baseLayers.value.filter(
    (l) => l.visible,
  )[0] as LayerInfo<AnyTileLayer>;

  vectorLayers.value = mappedLayers.filter(
    ({ layer }) =>
      layer instanceof VectorLayer ||
      layer instanceof LayerGroup ||
      layer instanceof ImageLayer,
  ) as LayerInfo<AnyVectorLayer>[];
}

const toggleLayer = (l: LayerInfo<any>) => {
  l.visible = !l.visible;
  l.layer.setOpacity(l.opacity);
  l.layer.setVisible(l.visible);
};

function updateOpacity(l: LayerInfo<any>, opacity: number) {
  l.opacity = opacity;
  l.layer.setOpacity(opacity);
}
</script>
