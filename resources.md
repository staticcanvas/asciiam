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

## 3D research and mesh sources

These sources support the implemented dependency-free mesh and glTF/GLB path. asciiam does
not bundle third-party models or compression codecs.

| Resource | Maintained use | License or integration note |
| --- | --- | --- |
| [Poly Haven models](https://polyhaven.com/models) | Candidate CC0 models for optional demonstrations and visual verification. | Poly Haven publishes its models under CC0. Retain the exact model URL and source metadata even though attribution is not required. |
| [Poly Haven license](https://polyhaven.com/license) | License authority for selected Poly Haven assets. | Recheck before adding or redistributing an asset. |
| [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) | Parser fixtures, compatibility cases, and example geometry. | License and attribution requirements vary by model. Read the selected model directory's README before use. |
| [glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) | Format reference for implemented core glTF and GLB input. | Base-format loading is dependency-free. Assets requiring compression extensions are rejected; no codec or decoder hook is present in the released runtime. |
| [meshoptimizer](https://github.com/zeux/meshoptimizer) | Future research reference only. | Do not add its code or dependency to released artifacts. Compare measured transfer, startup, decode, and memory costs only after the uncompressed loader is established. |
| [Draco](https://github.com/google/draco) | Future research reference only. | Do not add its code or dependency to released artifacts. Any review must include decoder payload and WebAssembly initialization costs. |
| [WebGL2 3D feasibility assessment](architecture/webgl2-3d-feasibility.md) | Project decision, performance gates, mesh contract, and bundle policy. | Internal source of truth for evaluating implementation work. |

## Maintenance rules

- Do not treat a provider homepage as an asset license record.
- Store an exact asset URL and creator identifier when new media enters `public/assets/images`.
- Record embedded code or icon licenses in `THIRD_PARTY_NOTICES.md`.
- Record each selected mesh's exact URL, author, license, triangle count, original size,
  optimized size, and repository role before copying it into the project.
- Keep core glTF/GLB parsing dependency-free and enforce its measured bundle budget.
- Reject assets requiring Draco, Meshopt, or another unsupported compression extension
  before mesh-buffer allocation. Do not expose a decoder injection or loading hook.
- Keep compression evaluation in isolated research work; no codec code may enter released
  artifacts without a later measured architecture decision.
- Keep consumer-facing attribution in `docs/content/attributions.md` and README aligned with this inventory.

## API reference

| File | Responsibility |
| --- | --- |
| `resources.md` | Maintainer source and service inventory. |
| `THIRD_PARTY_NOTICES.md` | Redistributed license and public-domain notices. |
| `docs/content/attributions.md` | Consumer-facing attribution page. |
| `public/assets/images` | Bundled demonstration inputs whose provenance must remain traceable. |
| `architecture/webgl2-3d-feasibility.md` | Proposed 3D-to-ASCII boundary, performance budgets, and asset controls. |
