---
title: Preset gallery
description: Preview included presets, copy their option objects, or open them in the web utility.
weight: 30
date: 2026-08-13
lastmod: 2026-08-13
tags: [presets, gallery, examples, animation modes, live preview]
keywords: [ASCII animation presets, preset browser, live animation gallery, asciiam presets, copy configuration]
---

The gallery constructs previews only near the viewport and keeps no more than six renderer instances active. Off-screen instances are destroyed after a short delay. This avoids exhausting browser WebGL context limits while retaining live previews.

`imageReveal` requires an image source and therefore displays a non-rendering placeholder until configured in the web utility. Place documentation gallery source images in `docs/assets/images` and add explicit metadata before using them in content.

## API reference

| Gallery action | Output |
| --- | --- |
| Copy configuration | JavaScript declaration containing the preset options. |
| Open in utility | Opens the app with `?preset=<name>`. |
| Search | Filters by preset name or mode. |
| Category filter | Filters field, spatial, particle, reveal, or image presets. |
