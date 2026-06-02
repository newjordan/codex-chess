# Cyber Chess SFX Plan

Generate these as short ElevenLabs Sound Effects one-shots, then commit the selected downloaded files in this folder. Prefer MP3 or OGG for the browser build.

| Event | Target filename | ElevenLabs prompt |
| --- | --- | --- |
| Piece select | `piece-select.mp3` | `short neon glass tap, tiny electric sparkle, clean arcade UI one-shot, no reverb, 0.3 seconds` |
| Legal move | `piece-move.mp3` | `futuristic chess piece sliding across a holographic board, soft synth whoosh, subtle glass landing click, one-shot, 0.6 seconds` |
| Capture | `capture.mp3` | `digital chess capture, crystalline impact with brief electric crackle, cyberpunk arcade one-shot, tight punch, 0.7 seconds` |
| Check | `check.mp3` | `tense neon warning chime, rising synth pulse, small metallic alarm accent, cyber chess UI, one-shot, 0.9 seconds` |
| Checkmate / win | `win.mp3` | `cyberpunk victory stinger, bright synth arpeggio, powerful glass impact, triumphant but compact game win sound, 1.8 seconds` |
| Loss / game over | `loss.mp3` | `dark futuristic game over sting, descending synth bass, distorted digital shutdown, cold metallic tail, 1.8 seconds` |
| Next opponent reveal | `next-opponent.mp3` | `dramatic opponent reveal, neon scanner sweep, glitchy hologram materializing, cinematic synth riser ending in soft impact, 1.5 seconds` |
| Countdown tick | `countdown-tick.mp3` | `precise electronic countdown tick, short dry synth blip with tiny clock snap, arcade UI one-shot, 0.25 seconds` |
| Menu confirm | `menu-confirm.mp3` | `sleek menu confirmation sound, soft digital button press, warm synth ping, polished sci-fi UI one-shot, 0.4 seconds` |

Generation notes:

- Use short fixed durations so sounds do not stack over the board.
- For gameplay one-shots, target `0.25-0.9` seconds.
- For win/loss/reveal stingers, target `1.5-2.0` seconds.
- Try prompt influence around `0.55-0.75`.
- Generate several variants per prompt and keep the cleanest transient.

Licensing notes:

- Do not commit generated audio unless it was created under an ElevenLabs plan/license suitable for the intended submission.
- Do not commit API keys or `.env` files.
- Runtime generation is intentionally avoided; this game should serve static audio assets.

References:

- https://elevenlabs.io/docs/overview/capabilities/sound-effects
- https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert
- https://elevenlabs.io/docs/product-guides/playground/sound-effects
- https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform
