<template>
  <TransitionRoot as="template" :show="open" :appear="true">
    <Dialog
      as="div"
      static
      class="fixed inset-0 z-20 overflow-y-auto"
      @close="doClose()"
      :open="open"
      :initialFocus="initialFocus"
    >
      <div
        class="flex min-h-screen items-start justify-center px-2 pt-2 pb-2 text-center sm:block sm:p-0"
      >
        <TransitionChild
          as="template"
          enter="ease-out duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-200"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <DialogOverlay class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <TransitionChild
          as="template"
          enter="ease-out duration-300"
          enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to="opacity-100 translate-y-0 sm:scale-100"
          leave="ease-in duration-200"
          leave-from="opacity-100 translate-y-0 sm:scale-100"
          leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div
            class="inline-block w-full transform overflow-hidden rounded-lg bg-white px-0 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle md:my-16"
            :class="maxWidth"
          >
            <div class="overflow-y-auto px-4 pb-1 sm:px-6">
              <div class="mt-3 sm:mt-0">
                <DialogTitle
                  as="h3"
                  class="text-center text-lg leading-6 font-medium text-gray-900 sm:text-left"
                >
                  <slot name="title">{{ dialogTitle }}</slot>
                </DialogTitle>
                <slot></slot>
              </div>
            </div>
            <div class="absolute top-0 right-0 pt-4 pr-4 sm:block">
              <button
                type="button"
                class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden"
                @click="doClose()"
              >
                <span class="sr-only">Close</span>
                <XMarkIcon class="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import {
  Dialog,
  DialogOverlay,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from "@headlessui/vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { promiseTimeout } from "@vueuse/core";
import { useUiStore } from "@/stores/uiStore";

interface Props {
  modelValue?: boolean;
  dialogTitle?: string;
  initialFocus?: HTMLElement;
  maxWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  maxWidth: "sm:max-w-xl",
});
const emit = defineEmits(["update:modelValue", "cancel"]);

const uiStore = useUiStore();
const open = ref(false);
watch(
  () => props.modelValue,
  async (v) => {
    await promiseTimeout(100);
    open.value = v;
  },
  { immediate: true },
);

uiStore.modalOpen = open.value;
watch(open, async (v) => {
  uiStore.modalOpen = v;
  await promiseTimeout(300);
  emit("update:modelValue", v);
});

function doClose() {
  emit("cancel");
  open.value = false;
}

onUnmounted(() => (uiStore.modalOpen = false));
</script>
