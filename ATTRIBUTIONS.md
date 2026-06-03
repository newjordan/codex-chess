# Third-Party Attributions and Notices

This file records the attribution and licensing information found during the
pre-flight packaging pass. It is not legal advice; it should be treated as a
packaging checklist and notice file.

## Lozza Chess Engine

- Asset: `media/engines/lozza.js`
- Local use: browser Web Worker for the GORDO final boss.
- Upstream identified locally: https://github.com/op12no2/lozza
- Author identified locally: Colin Jenkins, per `media/engines/README.md`.
- License: MIT, with local license text in `media/engines/lozza-LICENSE.txt`.

Keep `media/engines/lozza-LICENSE.txt` with any distribution that includes
`lozza.js`. The local MIT license text and the upstream license file found for
Lozza do not include an explicit copyright notice line, so confirm the exact
copyright notice if a downstream distribution requires one.

## ElevenLabs and Suno Audio

The following committed audio files contain embedded metadata identifying
ElevenLabs / Eleven Labs Inc. as the creation or editing software agent:

- `media/audio/The_Pulse_of_the_Board_2.mp3`
- `media/audio/check.mp3`
- `media/audio/checkmeat.mp3`
- `media/audio/checkmeat_you_lose_song.mp3`
- `media/audio/cyber-chess-announcer.mp3`
- `media/audio/cyber_chess_music.mp3`
- `media/audio/frostd4d-announcer.mp3`
- `media/audio/frostd4d_intro.mp3`
- `media/audio/game_over.mp3`
- `media/audio/game_over.wav`
- `media/audio/goop-announcer.mp3`
- `media/audio/goop_intro.mp3`
- `media/audio/gordo-announcer.mp3`
- `media/audio/gordo_intro.mp3`
- `media/audio/razorblade-announcer.mp3`
- `media/audio/razorblade_intro.mp3`
- `media/audio/synthetic_dreams_cyber_eyes.mp3`
- `media/audio/the_pulse_long_song.mp3`
- `media/audio/victorioius_2.mp3`
- `media/audio/victorious_1.mp3`

Suggested credit text for visible credits or release notes:

> Audio generated with ElevenLabs (https://elevenlabs.io/).

The repository does not include the generating account, plan, generation dates,
voice/source records, or commercial-use confirmation for these files. Current
ElevenLabs guidance says generated content use depends on the applicable plan,
terms, and whether the content was created with free/no-account, paid, or beta
services. Confirm the generating account and intended distribution rights before
commercial release.

ElevenLabs references:

- Publishing guidance: https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform
- Terms of Service: https://elevenlabs.io/terms-of-use

Local note: `media/sfx/README.md` contains prompt notes for future ElevenLabs
sound effects, but no generated files are committed under `media/sfx/`.

The soundtrack package includes tracks identified locally as Suno-generated in
`media/cyber-chess-soundtrack/Cyber Chess Soundtrack/TRACKLIST.txt`.

The following committed audio files did not show ElevenLabs metadata in the
local scan and still need provenance/license confirmation:

- `media/audio/killshot.wav`
- `media/audio/Chrome Gambit.mp3`
- `media/audio/Chrome fresh.mp3`
- `media/audio/Chrome_Chess_Mode.mp3`
- `media/audio/Chrome_city.mp3`
- `media/audio/boogie_knights.mp3`
- `media/audio/drummin_pawns.mp3`
- `media/audio/cybercrimes.mp3`
- `media/audio/Pawns_of_Destiny.mp3`
- `media/audio/checkmeat_freakazoid.mp3`
- `media/audio/piece_move.wav`
- `media/audio/piece_slide.wav`

## Fonts

The page loads `media/fonts/upheavtt.ttf`.

| Asset | Attribution / license information found locally | Packaging note |
| --- | --- | --- |
| Asset | Attribution / license information found locally | Packaging note |
| --- | --- | --- |
| `media/fonts/upheavtt.ttf` | Upheaval TT by Brian Kent / AEnigma Fonts. The original archive readme permits broad use but asks that the text file remain with the font and restricts selling, profit distribution, and modification without permission. | The original readme is bundled at `media/fonts/upheaval.txt`; keep it with any distribution that includes the font. |

Previously tested fonts that are not required by the current runtime were
removed from the page so the shipped font surface stays small and easier to
audit.

## Direct JavaScript Dependencies

The committed `app.js` is a bundled build. Direct dependency license data from
`package-lock.json`:

| Package | Version in lockfile | License recorded in lockfile |
| --- | --- | --- |
| `chess.js` | 1.4.0 | BSD-2-Clause |
| `gsap` | 3.15.0 | Standard "no charge" license: https://gsap.com/standard-license |
| `react` | 19.2.7 | MIT |
| `react-dom` | 19.2.7 | MIT |
| `three` | 0.184.0 | MIT |
| `esbuild` | 0.28.0 | MIT |
| `playwright` | 1.60.0 | Apache-2.0 |

This table covers direct dependencies only. A full release package should also
review transitive dependency notices if required by the distribution channel.

## Other Local Asset Provenance Risks

- `pieces_fbx/*.fbx` are binary FBX chess-piece models. Local metadata only
  identifies Blender export information; no source author or license was found.
- `media/buttons/frame_pink_tech-9slice.zip` and its extracted PNG/CSS files do
  not include attribution or license text locally.
- The repository contains many generated-looking image and video assets under
  `media/` and `avatars/`. No separate third-party license files were found for
  those assets during this pass. If any were sourced externally rather than
  generated or created for this project, add source-specific attribution and
  license notices before release.
