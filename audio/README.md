# Pack cut SFX

Drop your pack-slash clip here as:

- `pack-cut.mp3` (preferred), or `.wav` / `.ogg` / `.webm`

Trim in an editor to the best ~0.3–0.6s of the slash, **or** leave a longer file and tweak in `js/config.js`:

```js
CM.SFX.packCut.start = 0;      // skip into the file
CM.SFX.packCut.duration = 0.45; // stop after this many seconds
CM.SFX.packCut.volume = 0.8;
```

If the file is missing, the game uses a procedural slash fallback.

We can’t pull audio from YouTube for you — export/download the clip yourself if you have rights to use it.
