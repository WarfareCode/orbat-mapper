import { defineStore } from "pinia";
import { ExportFormat, ImportFormat } from "@/types/convert";
import { useLocalStorage } from "@vueuse/core";

export interface ImportState {
  inputSource: "file" | "string";
  format: ImportFormat;
}
export const useImportStore = defineStore("import", {
  state: (): ImportState => ({
    inputSource: "file",
    format: "milx",
  }),
});

export interface ExportSettings {
  keepOpen: boolean;
  currentFormat: ExportFormat;
}
export const useExportStore = defineStore("exportStore", {
  state() {
    return {
      keepOpen: useLocalStorage("exportKeepOpen", false),
      currentFormat: useLocalStorage<ExportFormat>("exportCurrentFormat", "orbatmapper"),
    };
  },
});
