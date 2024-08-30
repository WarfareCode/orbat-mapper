import { featureCollection, point } from "@turf/helpers";
import { injectStrict, nanoid } from "@/utils";
import { activeScenarioKey } from "@/components/injects";
import { TScenario } from "@/scenariostore";
import {
  ColumnMapping,
  ExportSettings,
  GeoJsonSettings,
  OrbatMapperExportSettings,
  UnitGeneratorSettings,
} from "@/types/convert";
import * as FileSaver from "file-saver";
import { symbolGenerator } from "@/symbology/milsymbwrapper";
import type { Root } from "@tmcw/togeojson";
import { useSymbolSettingsStore } from "@/stores/settingsStore";
import { INTERNAL_NAMES, NUnit } from "@/types/internalModels";
import type { Unit } from "@/types/scenarioModels";
import type { SpatialIllusionsOrbat } from "@/types/externalModels";
import {
  MilSymbolProperties,
  OrbatMapperGeoJsonCollection,
  OrbatMapperGeoJsonLayer,
} from "@/importexport/jsonish/types";

const symbolSettings = useSymbolSettingsStore();
export interface UseScenarioExportOptions {
  activeScenario: TScenario;
}

function stringifyReplacer(name: string, val: any) {
  if (val === undefined) return undefined;
  if (INTERNAL_NAMES.includes(name)) return undefined;

  return val;
}

function columnMapper(data: any[], columnMap: ColumnMapping[]): Record<string, any>[] {
  const mappedData: Record<string, any>[] = [];

  data.forEach((item) => {
    const mappedItem: Record<string, any> = {};
    columnMap.forEach(({ label, field }) => {
      mappedItem[label] = mapField(item[field]);
    });
    mappedData.push(mappedItem);
  });
  return mappedData;
}

function mapField(field: any): string | number | Date {
  if (Array.isArray(field)) return JSON.stringify(field);
  return field;
}

export function useScenarioExport(options: Partial<UseScenarioExportOptions> = {}) {
  const { geo, store, unitActions, io } =
    options.activeScenario || injectStrict(activeScenarioKey);
  const { sideMap } = store.state;

  function convertUnitsToGeoJson(units: NUnit[], options: Partial<GeoJsonSettings> = {}) {
    const features = units.map((unit) => {
      const includeIdInProperties = options.includeIdInProperties ?? false;
      const { id, name, sidc, shortName, description } = unit;

      const symbolOptions = unitActions.getCombinedSymbolOptions(unit);

      return point<MilSymbolProperties>(
        unit._state?.location!,
        {
          id: includeIdInProperties ? id : undefined,
          name,
          shortName,
          sidc: unit._state?.sidc || sidc,
          description,
          ...(unit.textAmplifiers ?? {}),
          ...symbolOptions,
        },
        { id: options.includeId ? id : undefined },
      );
    });
    return featureCollection(features) as OrbatMapperGeoJsonCollection;
  }

  function convertScenarioFeaturesToGeoJson(options: Partial<GeoJsonSettings> = {}) {
    const includeIdInProperties = options.includeIdInProperties ?? false;
    return featureCollection(
      geo.layers.value
        .map((layer) => layer.features)
        .flat(1)
        .map((f) => {
          const { id, geometry, properties, meta, style } = f;
          return {
            type: "Feature",
            id: options.includeId ? id : undefined,
            properties: {
              id: includeIdInProperties ? id : undefined,
              name: meta.name,
              description: meta.description,
              ...properties,
            },
            geometry,
          };
        }),
    );
  }

  async function downloadAsGeoJSON(opts: GeoJsonSettings) {
    const units = opts.includeUnits
      ? convertUnitsToGeoJson(geo.everyVisibleUnit.value, opts).features
      : [];
    const features = opts.includeFeatures
      ? convertScenarioFeaturesToGeoJson(opts).features
      : [];
    const combined = [...units, ...(features as any)];

    FileSaver.saveAs(
      new Blob([JSON.stringify(featureCollection(combined), stringifyReplacer, 2)], {
        type: "application/json",
      }),
      opts.fileName,
    );
  }

  async function createKMLString(sidcs: string[], opts: ExportSettings) {
    const { foldersToKML } = await import("@/extlib/tokml");
    const root: Root = { type: "root", children: [] };

    function createFolder(units: NUnit[], name: string) {
      root.children.push({
        type: "folder",
        meta: { name },
        children: convertUnitsToGeoJson(units).features.map((unit) => {
          const { name, shortName, description } = unit.properties;
          return {
            ...unit,
            properties: {
              name: opts.useShortName ? shortName || name : name,
              description,
              styleUrl: `#sidc${unit.properties.sidc}${(
                unit.properties.fillColor || ""
              ).replaceAll("#", "")}`,
            },
          };
        }),
      });
    }

    const features = opts.includeFeatures
      ? convertScenarioFeaturesToGeoJson().features
      : [];

    if (opts.includeUnits) {
      if (opts.oneFolderPerSide) {
        Object.keys(sideMap).forEach((sideId) => {
          const side = sideMap[sideId];
          const units: NUnit[] = [];
          unitActions.walkSide(sideId, (unit) => {
            if (unit._state?.location) units.push(unit);
          });
          createFolder(units, side.name);
        });
      } else {
        createFolder(geo.everyVisibleUnit.value, "Units");
      }
    }

    if (opts.includeFeatures) {
      root.children.push({
        type: "folder",
        meta: { name: "Scenario features" },
        children: features,
      });
    }
    return foldersToKML(root, sidcs);
  }

  async function downloadAsKML(opts: ExportSettings) {
    const kmlString = await createKMLString([], opts);
    FileSaver.saveAs(
      new Blob([kmlString], {
        type: "application/vnd.google-earth.kml+xml",
      }),
      "scenario.kml",
    );
  }

  async function downloadAsKMZ(opts: ExportSettings) {
    const { zipSync } = await import("fflate");
    const data: Record<string, Uint8Array> = {};
    const usedSidcs = new Set<string>();
    if (opts.embedIcons) {
      for (const unit of geo.everyVisibleUnit.value) {
        const sidc = unit._state?.sidc || unit.sidc;
        const symbolOptions = unitActions.getCombinedSymbolOptions(unit);
        const cacheKey = (sidc + (symbolOptions.fillColor || "")).replaceAll("#", "");
        if (!usedSidcs.has(cacheKey)) {
          const symb = symbolGenerator(sidc, {
            ...symbolSettings.symbolOptions,
            ...symbolOptions,
          });
          usedSidcs.add(cacheKey);
          const blob: Blob | null = await new Promise((resolve) =>
            symb.asCanvas().toBlob(resolve),
          );
          if (blob) {
            data[`icons/${cacheKey}.png`] = new Uint8Array(await blob.arrayBuffer());
          }
        }
      }
    }
    const kmlString = await createKMLString([...usedSidcs], opts);

    data["doc.kml"] = new TextEncoder().encode(kmlString);

    const zipData = zipSync(data);
    FileSaver.saveAs(
      new Blob([zipData], {
        type: "application/octet-stream",
      }),
      "scenario.kmz",
    );
  }

  async function downloadAsMilx(opts: ExportSettings) {
    const { toMilx } = await import("@/importexport/milx");

    const layers: OrbatMapperGeoJsonLayer[] = [];

    if (opts.includeUnits) {
      if (opts.oneFolderPerSide) {
        Object.keys(sideMap).forEach((sideId) => {
          const side = sideMap[sideId];
          const units: NUnit[] = [];
          unitActions.walkSide(sideId, (unit) => {
            if (unit._state?.location) units.push(unit);
          });
          layers.push({
            name: side.name,
            featureCollection: convertUnitsToGeoJson(units),
          });
        });
      } else {
        layers.push({
          name: "Units",
          featureCollection: convertUnitsToGeoJson(geo.everyVisibleUnit.value),
        });
      }
    }

    const milxString = toMilx(layers);
    FileSaver.saveAs(
      new Blob([milxString], {
        type: "application/xml",
      }),
      "scenario.milxly",
    );
  }

  async function downloadAsXlsx(opts: ExportSettings) {
    const { writeFileXLSX, xlsxUtils } = await import("@/extlib/xlsx-lazy");
    const workbook = xlsxUtils.book_new();
    let unitData: any[] = [];
    if (opts.oneSheetPerSide) {
      Object.keys(sideMap).forEach((sideId) => {
        unitData = [];
        const sideName = sideMap[sideId].name;
        unitActions.walkSide(sideId, (unit, level, parent, sideGroup, side) => {
          unitData.push({ ...unit, sideId: side.id, sideName: side?.name });
        });
        const ws = xlsxUtils.json_to_sheet(columnMapper(unitData, opts.columns));
        xlsxUtils.book_append_sheet(workbook, ws, sideName);
      });
    } else {
      Object.keys(sideMap).forEach((sideId) =>
        unitActions.walkSide(sideId, (unit, level, parent, sideGroup, side) => {
          unitData.push({ ...unit, sideId: side.id, sideName: side?.name });
        }),
      );
      const ws = xlsxUtils.json_to_sheet(columnMapper(unitData, opts.columns));
      xlsxUtils.book_append_sheet(workbook, ws, "Units");
    }

    writeFileXLSX(workbook, "scenario.xlsx");
  }

  async function downloadAsSpatialIllusions(opts: UnitGeneratorSettings) {
    const { rootUnit } = opts;
    const hierarchy = unitActions.expandUnitWithSymbolOptions(
      store.state.getUnitById(rootUnit),
    );

    const d = convertUnit(hierarchy, 0);
    function convertUnit(unit: Unit, level: number): SpatialIllusionsOrbat {
      return {
        options: {
          uniqueDesignation: unit.name,
          sidc: unit.sidc,
          fillColor: unit.symbolOptions?.fillColor,
        },
        subOrganizations:
          level < opts.maxLevels
            ? unit.subUnits?.map((subUnit) => convertUnit(subUnit, level + 1)) || []
            : [],
      };
    }
    FileSaver.saveAs(
      new Blob([JSON.stringify(d, undefined, 2)], {
        type: "application/json",
      }),
      "spatialillusions-orbat.json",
    );
  }

  function downloadAsOrbatMapper({
    sides,
    fileName,
    scenarioName,
  }: OrbatMapperExportSettings) {
    const scn = io.toObject();
    const newScenario = { ...scn, sides: scn.sides.filter((e) => sides.includes(e.id)) };
    newScenario.id = nanoid();
    newScenario.meta = {
      ...scn.meta!,
      exportedFrom: scn.id,
      exportedDate: new Date().toISOString(),
    };
    if (scenarioName) newScenario.name = scenarioName;

    FileSaver.saveAs(
      new Blob([JSON.stringify(newScenario, undefined, 2)], {
        type: "application/json",
      }),
      fileName || "scenario-export-orbatmapper.json",
    );
  }

  return {
    downloadAsGeoJSON,
    downloadAsKML,
    downloadAsKMZ,
    downloadAsXlsx,
    downloadAsMilx,
    downloadAsSpatialIllusions,
    downloadAsOrbatMapper,
  };
}
