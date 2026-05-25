import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Why Saved",
  version: "0.0.1",
  description:
    "Save bookmarks with memory and intent and know why you saved them later",
  permissions: ["storage", "tabs", "activeTab"],
  host_permissions: ["<all_urls>"],
  action: {
    default_popup: "index.html",
    default_icon: {
      16: "public/logo.png",
      48: "public/logo.png",
      128: "public/logo.png",
    },
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
});
