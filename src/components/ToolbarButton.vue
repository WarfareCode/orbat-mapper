<template>
  <button
    type="button"
    class="relative inline-flex items-center border border-gray-300 px-3 py-2 text-sm font-medium focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden disabled:text-gray-300 sm:px-2"
    :class="[
      start && 'rounded-l-md',
      end && 'rounded-r-md',
      top && 'rounded-t-md',
      bottom && 'rounded-b-md',
      active
        ? 'bg-army2 text-gray-100 hover:text-gray-200'
        : 'bg-white text-gray-700 hover:bg-gray-50',
    ]"
  >
    <slot />
  </button>
</template>

<script>
export default {
  name: "ToolbarButton",
  props: {
    start: { type: Boolean, default: false },
    end: { type: Boolean, default: false },
    top: { type: Boolean, default: false },
    bottom: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
  },
};
</script>
