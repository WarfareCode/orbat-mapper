import fuzzysort from "fuzzysort";
import { NUnit } from "@/types/internalModels";
import { groupBy, htmlTagEscape, injectStrict } from "@/utils";
import { activeScenarioKey } from "@/components/injects";
import { LayerFeatureSearchResult, UnitSearchResult } from "@/components/types";

export function useScenarioSearch() {
  const {
    unitActions,
    store: { state },
    geo,
  } = injectStrict(activeScenarioKey);

  function searchUnits(query: string, limitToPosition = false): UnitSearchResult[] {
    const q = query.trim();
    if (!q) return [];
    const hits = fuzzysort.go(q, unitActions.units.value, {
      keys: ["name", "shortName"],
    });
    return hits
      .filter((h) => {
        if (limitToPosition) return state.getUnitById(h.obj.id)?._state?.location;
        return true;
      })
      .slice(0, 10)
      .map((u, i) => {
        const parent = u.obj._pid && ({ ...state.getUnitById(u.obj._pid) } as NUnit);
        if (parent) {
          parent.symbolOptions = unitActions.getCombinedSymbolOptions(parent);
        }
        return {
          name: u.obj.name,
          sidc: u.obj.sidc,
          id: u.obj.id,
          parent,
          highlight:
            u[0] &&
            fuzzysort.highlight({
              ...u[0],
              score: u.score,
              target: htmlTagEscape(u[0].target),
            }),
          score: u.score,
          category: "Units",
          symbolOptions: unitActions.getCombinedSymbolOptions(u.obj),
        } as unknown as UnitSearchResult;
      });
  }

  function searchLayerFeatures(query: string) {
    const q = query.trim();
    if (!q) return [];

    const hits = fuzzysort.go(q, geo.itemsInfo.value, { key: ["name"] });

    return hits.slice(0, 10).map(
      (u, i) =>
        ({
          ...u.obj,
          highlight: fuzzysort.highlight({
            ...u,
            target: htmlTagEscape(u.target),
          }),
          score: u.score,
          category: "Features",
        } as LayerFeatureSearchResult)
    );
  }

  function combineHits(hits: (UnitSearchResult[] | LayerFeatureSearchResult[])[]) {
    const combinedHits = hits.sort((a, b) => {
      const scoreA = a[0]?.score ?? 1000;
      const scoreB = b[0]?.score ?? 1000;
      return scoreB - scoreA;
    });
    return [...combinedHits.flat()].map((e, index) => ({
      ...e,
      index,
    })) as (UnitSearchResult | LayerFeatureSearchResult)[];
  }

  function search(query: string) {
    const unitHits = searchUnits(query);
    const featureHits = searchLayerFeatures(query);
    const allHits = combineHits([unitHits, featureHits]);
    const numberOfHits = unitHits.length + featureHits.length;
    return { numberOfHits, groups: groupBy(allHits, "category") };
  }

  return { searchUnits, searchLayerFeatures, search };
}
