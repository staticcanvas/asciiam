# Project resources

This file records external sources and services referenced by asciiam development, documentation, demonstration assets, and release workflows.

## Media and vector sources

| Resource | Maintained use | License or verification note |
| --- | --- | --- |
| [Lucide](https://lucide.dev/) | Embedded documentation navigation icon paths. | ISC License; Feather-derived paths retain the MIT notice. |
| [PAT globe maps](https://ian.macky.net/pat/map/globe.html) | Earth land-mask demonstration input. | PAT describes its maps and generator scripts as public domain. |
| [SVG Repo Bird Shape](https://www.svgrepo.com/svg/23736/bird-shape) | `bird-silhouette.svg` sampling input. | The individual asset page identifies it as CC0. |
| [Unsplash](https://unsplash.com/) | Candidate demonstration photographs. | Verify the source page and current license before adding an asset. |
| [Pixabay](https://pixabay.com/) | Included and candidate demonstration media. | Preserve creator/source identifiers and verify each asset before reuse. |
| [Pexels](https://www.pexels.com/) | Included and candidate demonstration photographs. | Preserve creator/source identifiers and verify each asset before reuse. |

## Runtime and platform references

| Resource | Maintained use |
| --- | --- |
| [WebGL 2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/) | Renderer behavior and compatibility reference. |
| [GitLab](https://gitlab.com/) | Primary source host and CI surface. |
| [GitHub](https://github.com/) | Source mirror and alternate page-edit surface. |
| [npm](https://www.npmjs.com/) | JavaScript package registry. |
| [JSR](https://jsr.io/) | JavaScript/TypeScript package registry. |
| [jsDelivr](https://www.jsdelivr.com/) | Published package CDN. |
| [unpkg](https://unpkg.com/) | Published package CDN. |
| [Shields.io](https://shields.io/) | README status badges. |
| [Codecov](https://codecov.io/) | Optional coverage reporting reference. |

## Maintenance rules

- Do not treat a provider homepage as an asset license record.
- Store an exact asset URL and creator identifier when new media enters `public/assets/images`.
- Record embedded code or icon licenses in `THIRD_PARTY_NOTICES.md`.
- Keep consumer-facing attribution in `docs/content/attributions.md` and README aligned with this inventory.

## API reference

| File | Responsibility |
| --- | --- |
| `resources.md` | Maintainer source and service inventory. |
| `THIRD_PARTY_NOTICES.md` | Redistributed license and public-domain notices. |
| `docs/content/attributions.md` | Consumer-facing attribution page. |
| `public/assets/images` | Bundled demonstration inputs whose provenance must remain traceable. |
