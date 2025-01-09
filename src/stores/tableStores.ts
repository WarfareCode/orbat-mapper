import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";

function tableStoreFactory(storeName: string) {
  return defineStore(storeName, () => {
    const columnVisibility = useLocalStorage<Record<string, boolean>>(
      storeName + "-columnVisibility",
      {},
    );
    const columnSizing = useLocalStorage<Record<string, number>>(
      storeName + "-columnWidth",
      {},
    );
    return { columnVisibility, columnSizing };
  });
}

export type TableStore = ReturnType<ReturnType<typeof tableStoreFactory>>;

export const useSupplyCategoryTableStore = tableStoreFactory("supplyCategoryTableStore");
export const useSupplyClassTableStore = tableStoreFactory("supplyClassTableStore");
export const useEquipmentTableStore = tableStoreFactory("equipmentTableStore");
export const usePersonnelTableStore = tableStoreFactory("personnelTableStore");
export const useSupplyUoMTableStore = tableStoreFactory("supplyUoMTableStore");
export const useUnitSupplyTableStore = tableStoreFactory("unitSupplyTableStore");
export const useUnitEquipmentTableStore = tableStoreFactory("unitEquipmentTableStore");
export const useUnitPersonnelTableStore = tableStoreFactory("unitPersonnelTableStore");
