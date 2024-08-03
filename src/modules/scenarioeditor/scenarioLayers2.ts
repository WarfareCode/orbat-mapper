import OLMap from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import LayerGroup from "ol/layer/Group";
import { click as clickCondition } from "ol/events/condition";
import { getCenter, isEmpty } from "ol/extent";
import { featureCollection, point } from "@turf/helpers";
import turfEnvelope from "@turf/envelope";
import { injectStrict, nanoid } from "@/utils";
import { Collection } from "ol";
import {
  getFeatureAndLayerById,
  isCircle,
  useOlEvent,
} from "@/composables/openlayersHelpers";
import { GeoJSON } from "ol/format";
import Feature, { FeatureLike } from "ol/Feature";
import type {
  FeatureId,
  ScenarioFeature,
  ScenarioFeatureMeta,
} from "@/types/scenarioGeoModels";
import Circle from "ol/geom/Circle";
import { fromLonLat, ProjectionLike, toLonLat } from "ol/proj";
import { getLength } from "ol/sphere";
import LineString from "ol/geom/LineString";
import { add as addCoordinate } from "ol/coordinate";
import type { Feature as GeoJsonFeature, Point } from "geojson";
import destination from "@turf/destination";
import { onUnmounted, ref, watch } from "vue";
import { unByKey } from "ol/Observable";
import { EventsKey } from "ol/events";
import {
  IconLayersOutline,
  IconMapMarker,
  IconVectorCircleVariant,
  IconVectorLine,
  IconVectorTriangle,
} from "@iconify-prerendered/vue-mdi";
import { ScenarioFeatureActions } from "@/types/constants";
import Select, { SelectEvent } from "ol/interaction/Select";
import { MaybeRef } from "@vueuse/core";
import { activeFeatureStylesKey, activeScenarioKey } from "@/components/injects";
import { NScenarioFeature, NScenarioLayer } from "@/types/internalModels";
import { TScenario } from "@/scenariostore";
import { UseFeatureStyles } from "@/geo/featureStyles";
import { MenuItemData } from "@/components/types";
import { Fill, Style } from "ol/style";
import Stroke from "ol/style/Stroke";
import CircleStyle from "ol/style/Circle";
import { useSelectedItems } from "@/stores/selectedStore";
import { SimpleGeometry } from "ol/geom";

const selectStyle = new Style({ stroke: new Stroke({ color: "#ffff00", width: 9 }) });
const selectMarkerStyle = new Style({
  image: new CircleStyle({
    radius: 15,
    fill: new Fill({
      color: "#ffff00",
    }),
  }),
});

export const LayerTypes = {
  scenarioFeature: "SCENARIO_FEATURE",
  units: "UNITS",
} as const;

export type LayerType = (typeof LayerTypes)[keyof typeof LayerTypes];

const geometryIconMap: any = {
  Point: IconMapMarker,
  LineString: IconVectorLine,
  Polygon: IconVectorTriangle,
  Circle: IconVectorCircleVariant,
  layer: IconLayersOutline,
};

export function getGeometryIcon(feature?: ScenarioFeature | NScenarioFeature) {
  return (feature && geometryIconMap[feature.meta.type]) || geometryIconMap.Polygon;
}

export function getItemsIcon(type: string) {
  return geometryIconMap[type];
}

export const featureMenuItems: MenuItemData<ScenarioFeatureActions>[] = [
  { label: "Zoom to", action: "zoom" },
  { label: "Pan to", action: "pan" },
  { label: "Move up", action: "moveUp" },
  { label: "Move down", action: "moveDown" },
  { label: "Delete", action: "delete" },
  { label: "Duplicate", action: "duplicate" },
];

const layersMap = new WeakMap<OLMap, LayerGroup>();

function convertRadius(center: GeoJsonFeature<Point>, radiusInMeters: number): number {
  const p = destination(center, radiusInMeters / 1000, 90);
  const line = new LineString([center.geometry.coordinates, p.geometry.coordinates]);
  line.transform("EPSG:4326", "EPSG:3857");
  return line.getLength();
}

export function createScenarioLayerFeatures(
  features: NScenarioFeature[] | ScenarioFeature[],
  featureProjection: ProjectionLike,
) {
  const gjson = new GeoJSON({
    dataProjection: "EPSG:4326",
    featureProjection,
  });
  const olFeatures: Feature[] = [];
  features.forEach((feature, index) => {
    feature.meta._zIndex = index;
    if (feature.meta?.radius && feature.geometry.type === "Point") {
      const newRadius = convertRadius(
        feature as GeoJsonFeature<Point>,
        feature.meta.radius,
      );
      const circle = new Circle(
        fromLonLat(feature.geometry.coordinates as number[]),
        newRadius,
      );
      let f = new Feature({
        geometry: circle,
        ...feature.properties,
      });
      f.setId(feature.id);
      olFeatures.push(f);
    } else {
      const f = gjson.readFeature(feature, {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
      }) as Feature;
      olFeatures.push(f);
    }
  });
  return olFeatures;
}

export function useScenarioFeatureSelect(
  olMap: OLMap,
  options: Partial<{
    enable: MaybeRef<boolean>;
  }> = {},
) {
  const { scenarioFeatureStyle } = injectStrict(activeFeatureStylesKey);
  const scenarioLayersGroup = getOrCreateLayerGroup(olMap);
  const scenarioLayersOl = scenarioLayersGroup.getLayers() as Collection<
    VectorLayer<any>
  >;

  const { selectedFeatureIds: selectedIds } = useSelectedItems();

  const enableRef = ref(options.enable ?? true);

  const selectInteraction = new Select({
    condition: clickCondition,
    hitTolerance: 20,
    layers: scenarioLayersOl.getArray(),
    style: (feature: FeatureLike, res: number): Style | Style[] => {
      const s = scenarioFeatureStyle(feature, res);
      let activeSelectStyle: Style;
      if (feature.getGeometry()?.getType() === "Point") {
        activeSelectStyle = selectMarkerStyle;
      } else {
        selectStyle.getStroke()?.setWidth((s.getStroke()?.getWidth() || 0) + 8);
        activeSelectStyle = selectStyle;
      }
      return [activeSelectStyle, s];
    },
  });
  const selectedFeatures = selectInteraction.getFeatures();
  let isInternal = false;

  useOlEvent(
    selectInteraction.on("select", (event: SelectEvent) => {
      isInternal = true;
      event.selected.forEach((f) => selectedIds.value.add(f.getId()!));
      event.deselected.forEach((f) => selectedIds.value.delete(f.getId()!));
    }),
  );

  watch(
    () => [...selectedIds.value],
    (v) => {
      if (!isInternal) {
        selectedFeatures.clear();
        v.forEach((fid) => {
          const { feature } = getFeatureAndLayerById(fid, scenarioLayersOl) || {};
          if (feature) selectedFeatures.push(feature);
        });
      }
      isInternal = false;
    },
    { immediate: true },
  );

  olMap.addInteraction(selectInteraction);

  watch(
    enableRef,
    (enabled) => {
      selectInteraction.getFeatures().clear();
      selectInteraction.setActive(enabled);
    },
    { immediate: true },
  );

  onUnmounted(() => {
    olMap.removeInteraction(selectInteraction);
  });

  return { selectedIds, selectedFeatures, selectInteraction };
}

export function useScenarioLayers(
  olMap: OLMap,
  {
    activeScenario,
  }: { activeScenario?: TScenario; activeScenarioFeatures?: UseFeatureStyles } = {},
) {
  const {
    geo,
    store: { state },
  } = activeScenario || injectStrict(activeScenarioKey);

  const scenarioLayersGroup = getOrCreateLayerGroup(olMap);
  const scenarioLayersOl = scenarioLayersGroup.getLayers() as Collection<
    VectorLayer<any>
  >;

  function getOlLayerById(layerId: FeatureId) {
    return scenarioLayersOl
      .getArray()
      .find((e) => e.get("id") === layerId) as VectorLayer<any>;
  }

  function zoomToFeature(featureId: FeatureId) {
    const { feature: olFeature } =
      getFeatureAndLayerById(featureId, scenarioLayersOl) || {};
    if (!olFeature?.getGeometry()) return;
    olMap.getView().fit(olFeature.getGeometry() as SimpleGeometry, { maxZoom: 15 });
  }

  function zoomToFeatures(featureIds: FeatureId[]) {
    const c = featureCollection(featureIds.map((fid) => state.featureMap[fid]));
    const bb = new GeoJSON().readFeature(turfEnvelope(c), {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    }) as Feature<any>;
    if (!bb) return;
    olMap.getView().fit(bb.getGeometry(), { maxZoom: 17 });
  }

  function panToFeature(featureId: FeatureId) {
    const { feature: olFeature } =
      getFeatureAndLayerById(featureId, scenarioLayersOl) || {};
    if (!olFeature) return;
    const view = olMap.getView();
    const extent = olFeature?.getGeometry()?.getExtent();
    extent &&
      view.animate({
        center: getCenter(extent),
      });
  }

  function zoomToLayer(layerId: FeatureId) {
    const olLayer = getOlLayerById(layerId);
    if (!olLayer) return;
    const layerExtent = olLayer.getSource()?.getExtent();

    layerExtent && !isEmpty(layerExtent) && olMap.getView().fit(layerExtent);
  }

  function getLayerById(layerId: FeatureId): NScenarioLayer | undefined | null {
    return geo.getLayerById(layerId);
  }

  return {
    scenarioLayersGroup,
    scenarioLayers: geo.layers,
    scenarioLayersFeatures: geo.layersFeatures,
    getOlLayerById,
    zoomToFeature,
    zoomToFeatures,
    zoomToLayer,
    panToFeature,
    getLayerById,
  };
}

export function getOrCreateLayerGroup(olMap: OLMap) {
  if (layersMap.has(olMap)) return layersMap.get(olMap)!;

  const layerGroup = new LayerGroup({
    properties: { id: nanoid(), title: "Scenario layers" },
  });
  layersMap.set(olMap, layerGroup);
  olMap.addLayer(layerGroup);
  return layerGroup;
}

// Fixme: Should only return properties needed to represent the geometry
export function convertOlFeatureToScenarioFeature(olFeature: Feature): NScenarioFeature {
  if (isCircle(olFeature)) {
    const circle = olFeature.getGeometry() as Circle;
    const { geometry, properties = {} } = olFeature.getProperties();
    const center = circle.getCenter();
    const r = addCoordinate([...center], [0, circle.getRadius()]);
    const meta: ScenarioFeatureMeta = {
      type: "Circle",
      radius: getLength(new LineString([center, r])),
    };

    return {
      ...point(toLonLat(circle.getCenter()), properties, {
        id: olFeature.getId() || nanoid(),
      }),
      meta,
      style: {},
    } as NScenarioFeature;
  }

  const gj = new GeoJSON({ featureProjection: "EPSG:3857" }).writeFeatureObject(
    olFeature,
  );

  return { ...gj, style: {}, meta: { type: gj.geometry.type } } as NScenarioFeature;
}

export function useScenarioLayerSync(olLayers: Collection<VectorLayer<any>>) {
  const { geo } = injectStrict(activeScenarioKey);

  const eventKeys = [] as EventsKey[];

  function addListener(l: VectorLayer<any>) {
    eventKeys.push(
      l.on("change:visible", (event) => {
        const isVisible = l.getVisible();
        geo.updateLayer(l.get("id"), { isHidden: !isVisible }, { undoable: false });
      }),
    );
  }

  olLayers.forEach((l) => {
    addListener(l);
  });
  useOlEvent(
    olLayers.on("add", (event) => {
      const addedLayer = event.element as VectorLayer<any>;
      addListener(addedLayer);
    }),
  );

  onUnmounted(() => {
    eventKeys.forEach((key) => unByKey(key));
  });
}
