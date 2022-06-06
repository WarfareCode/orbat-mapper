import { useImmerStore } from "../composables/immerStore";
import { Scenario, SideGroup, Unit } from "../types/scenarioModels";
import dayjs from "dayjs";
import { nanoid } from "../utils";
import { walkSide } from "./scenarioStore";
import { klona } from "klona";
import { EntityId } from "../types/base";
import { NSide, NSideGroup, NUnit } from "../types/internalModels";

export interface ScenarioState {
  unitMap: Record<EntityId, NUnit>;
  sideMap: Record<EntityId, NSide>;
  sideGroupMap: Record<EntityId, NSideGroup>;
}

function prepareScenario(scenario: Scenario): ScenarioState {
  const unitMap: Record<EntityId, NUnit> = {};
  const sideMap: Record<EntityId, NSide> = {};
  const sideGroupMap: Record<EntityId, NSideGroup> = {};

  function prepareUnit(unit1: Unit, level: number, parent: Unit | SideGroup) {
    const unit = klona(unit1);
    if (!unit.state) {
      unit.state = [];
    } else {
      unit.state = unit.state.map((e) => ({ ...e, t: +dayjs(e.t) }));
    }
    unit._state = null;
    if (!unit.id) {
      unit.id = nanoid();
    }

    unit._pid = parent.id;
    unit._isOpen = false;

    unitMap[unit1.id] = {
      ...unit,
      subUnits: unit.subUnits?.map((u) => u.id) || [],
    } as NUnit;
  }

  scenario.sides.forEach((side) => {
    sideMap[side.id] = { ...side, groups: side.groups.map((group) => group.id) };
    side.groups.forEach((group) => {
      sideGroupMap[group.id] = {
        ...group,
        _pid: side.id,
        units: group.units.map((unit) => unit.id),
      };
    });
    walkSide(side, prepareUnit);
  });

  return { unitMap, sideMap, sideGroupMap };
}

export function useNewScenarioStore(data: Scenario) {
  const inputState = prepareScenario(data);
  const store = useImmerStore(inputState);
  return { store };
}
