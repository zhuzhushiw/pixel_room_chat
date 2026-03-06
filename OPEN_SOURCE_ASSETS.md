# Open Source Asset Notes

Checked on 2026-03-07.

## Downloaded locally

- `third_party/source-assets/sbs-isometric-town-pack.zip`
- `third_party/source-assets/kenney-isometric-miniature-library.zip`
- `third_party/source-assets/pixel-city.png`
- `third_party/source-assets/isometric-city.zip`

Extracted previews:

- `third_party/open-assets/town-pack`
- `third_party/open-assets/kenney-miniature`

## Verified sources

### 1. 400+ Isometric Town Tiles

- Source: https://opengameart.org/content/400-isometric-town-tiles
- Direct file: https://opengameart.org/sites/default/files/sbs_-_isometric_town_pack.zip
- License: CC0
- Local license file: `third_party/open-assets/town-pack/License.txt`

Why it matters:

- Best match for the target screenshot's building finish.
- Includes detailed wall and roof modules with stronger texture than our current generated tiles.
- Good base for storefront facades and a supermarket block.

### 2. Pixel City

- Source: https://opengameart.org/content/pixel-city
- Direct file: https://opengameart.org/sites/default/files/pixel%20city.png
- License: CC0

Why it matters:

- Useful as a compact reference sheet for roads, city blocks, and quick kitbashing.
- Good fallback for filler pieces or background structures.

### 3. Kenney Isometric Miniature Library

- Source: https://kenney.nl/assets/isometric-miniature-library
- Direct file: https://kenney.nl/media/pages/assets/isometric-miniature-library/d259cc34d5-1674932086/kenney_isometric-miniature-library.zip
- License: CC0
- Local license file: `third_party/open-assets/kenney-miniature/License.txt`

Why it matters:

- Strong prop library: benches, shelves, counters, lamps, furniture, small environment objects.
- Good for dressing streets, interiors, kiosks, and shop displays.
- Less suitable for the main building style on its own because it reads more like miniature props than dense urban facades.

## Working recommendation

If we want a map closer to the reference screenshot, use:

- `400+ Isometric Town Tiles` for buildings and facades
- `Pixel City` for city fillers and quick structural pieces
- `Kenney Isometric Miniature Library` for props and scene dressing

That combination is the most practical path to:

- a supermarket storefront
- sidewalks and curbs
- parked vehicles or road context
- market props, kiosks, bins, benches, lamps
- denser street composition with proper isometric layering

## Next implementation move

The next real upgrade is not "more hand-drawn tiles". It is:

1. switch the map to an isometric scene layout
2. build one polished block first
3. use the town pack as the facade source
4. layer Kenney props on top
5. keep multiplayer/chat unchanged

This should produce a much closer result than continuing to refine the current flat street scene.
