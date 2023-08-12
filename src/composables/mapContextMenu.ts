import { computed, h, ref, ShallowRef } from "vue";
import OLMap from "ol/Map";
import { toLonLat } from "ol/proj";
import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import { useMeasurementsStore } from "@/stores/geoStore";
import ContextMenu from "@imengyu/vue3-context-menu";
import { IconCogOutline, IconMapMarker } from "@iconify-prerendered/vue-mdi";
import { getCoordinateFormatFunction } from "@/utils/geoConvert";
import { useNotifications } from "@/composables/notifications";
import { useClipboard } from "@vueuse/core";
import { useUiStore } from "@/stores/uiStore";

export function useMapContextMenu(mapRef: ShallowRef<OLMap | undefined>) {
  const { send } = useNotifications();
  const { copy: copyToClipboard } = useClipboard();

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    if (!mapRef.value) {
      console.warn("No map ref");
      return;
    }
    const dropPosition = toLonLat(mapRef.value.getEventCoordinate(e));
    const settings = useMapSettingsStore();
    const uiSettings = useUiStore();
    const formattedPosition = computed(() =>
      getCoordinateFormatFunction(settings.coordinateFormat)(dropPosition),
    );

    const measurementSettings = useMeasurementsStore();
    const menu = ref<any>({
      items: [
        {
          label: () =>
            h(
              "div",
              { class: "text-sm text-gray-600 font-medium" },
              formattedPosition.value,
            ),
          icon: h(IconMapMarker, { class: "text-gray-500" }),
          onClick: async () => {
            await copyToClipboard(formattedPosition.value);
            send({
              message: `Copied ${formattedPosition.value} to the clipboard`,
            });
          },
        },
        {
          label: "Map settings",
          icon: h(IconCogOutline, { class: "text-gray-500" }),
          children: [
            {
              label: "Show toolbar",
              checked: computed(() => uiSettings.showToolbar) as unknown as boolean,
              clickClose: false,
              onClick: () => {
                uiSettings.showToolbar = !uiSettings.showToolbar;
              },
            },
            {
              label: "Show cursor location",
              checked: computed(() => settings.showLocation) as unknown as boolean,
              clickClose: false,
              onClick: () => {
                settings.showLocation = !settings.showLocation;
              },
            },
            {
              label: "Show scale line",
              checked: computed(() => settings.showScaleLine) as unknown as boolean,
              clickClose: false,
              onClick: () => {
                settings.showScaleLine = !settings.showScaleLine;
              },
            },
            {
              label: "Measurement unit",
              children: [
                {
                  label: "Metric",
                  checked: computed(
                    () => measurementSettings.measurementUnit === "metric",
                  ) as unknown as boolean,
                  clickClose: false,
                  onClick: () => {
                    measurementSettings.measurementUnit = "metric";
                  },
                },
                {
                  label: "US/Imperial",
                  checked: computed(
                    () => measurementSettings.measurementUnit === "imperial",
                  ) as unknown as boolean,
                  clickClose: false,
                  onClick: () => {
                    measurementSettings.measurementUnit = "imperial";
                  },
                },
                {
                  label: "Nautical",
                  checked: computed(
                    () => measurementSettings.measurementUnit === "nautical",
                  ) as unknown as boolean,
                  clickClose: false,
                  onClick: () => {
                    measurementSettings.measurementUnit = "nautical";
                  },
                },
              ],
            },
            {
              label: "Coordinate format",
              children: [
                {
                  label: "Decimal degrees",
                  checked: computed(
                    () => settings.coordinateFormat === "DecimalDegrees",
                  ) as unknown as boolean,
                  clickClose: false,
                  onClick: () => {
                    settings.coordinateFormat = "DecimalDegrees";
                  },
                },
                {
                  label: "Degree Minutes Seconds",
                  checked: computed(
                    () => settings.coordinateFormat === "DegreeMinuteSeconds",
                  ) as unknown as boolean,
                  clickClose: false,
                  onClick: () => {
                    settings.coordinateFormat = "DegreeMinuteSeconds";
                  },
                },
                {
                  label: "MGRS",
                  checked: computed(
                    () => settings.coordinateFormat === "MGRS",
                  ) as unknown as boolean,
                  clickClose: false,
                  onClick: () => {
                    settings.coordinateFormat = "MGRS";
                  },
                },
              ],
            },
          ],
        },
        {
          label: "Show toolbar",
          checked: computed(() => uiSettings.showToolbar) as unknown as boolean,
          clickClose: false,
          onClick: () => {
            uiSettings.showToolbar = !uiSettings.showToolbar;
          },
        },
      ],
      zIndex: 3,
      minWidth: 230,
      x: e.x,
      y: e.y,
    });
    ContextMenu.showContextMenu(menu.value);
  }

  return { onContextMenu };
}
