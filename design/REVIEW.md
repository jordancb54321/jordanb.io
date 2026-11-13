# Design review

Direction: The name as a monument. Taste skill seed: 1400937659.
Palette: red #f23b42, black #141414, neutral greys. Locally hosted Big Shoulders and Public Sans.

Idea: Jordan's actual browser experiments become a working project index underneath his name, set at poster scale.
Live interaction: mouse, keyboard and touch project selection swaps the large preview. Ordinary links remain available without JavaScript. Phones show each project's picture in the reading flow.

## Direction adjustments

- Redrew the initial ring of 18–24 frames: only four actual experiments exist. The redraw supplied the stacked-name hero; one ink replaces the blueprint's two-ink heading to respect the house rule.
- Replaced the portrait biography with side facts and a wide paragraph because no portrait was supplied.
- Kept the footer compact instead of leaving an empty full-height viewport.
- Used the site's real software instead of the dealt architecture photographs. Preview ratios follow the captured interfaces, not a portrait-photo crop.

## Round 1

Seen in one second: an oversized red name poster, but the name was clipped.
Idea: a public name and real browser projects replace abstract design slogans.
Live thing: project chooser.
Layout words: hero=poster / work=index-and-preview / film=full-bleed / about=side-facts / contact=display-rows / footer=wordmark.
Scores: design 6 · usability 6 · creativity 7 · content 7 → overall 6.3.
Caps applied: clipped headline and inspector failures.
Problems and fixes:
1. desktop-fold/tablet-fold: name exceeded its column; use a width-fitted display scale and a min-width:0 grid item.
2. mobile-fold: hero grid overflowed; use a true single-column phone layout.
3. desktop-page: initial fractal crop was black and study image showed setup; capture a detailed rendered preset and a real revealed study card.

## Round 2

Seen in one second: Jordan Betts, intact, in black on a red field.
Idea and live thing: unchanged; actual software is the proof.
Layout words: hero=poster / work=index-and-preview / film=full-bleed / about=side-facts / contact=display-rows / footer=wordmark.
Scores: design 7 · usability 7 · creativity 7 · content 8 → overall 7.1.
Caps applied: image-height errors still made the project pictures appear distorted.
Problems and fixes:
1. phone sheets: explicit HTML image heights beat the intended aspect ratios; add height:auto and a failing browser regression for thumbnail geometry.
2. tablet-fold: the action wrapped because its internal gap was too large; shorten the gap at tablet widths.
3. phone contact: email broke mid-domain; use the lead size so the address fits rather than squeezing a display treatment into a narrow screen.

## Round 3, final

Seen in one second: Jordan Betts.
Five seconds: web designer and developer in Hertfordshire; a clear button leads to working projects.
Idea: Jordan's own learning-by-building projects become the portfolio material instead of decorative mockups.
Live thing: four keyboard-accessible project previews, ordinary project links, and a real fractal recording with play/pause.
Layout words: hero=poster / work=index-and-preview / film=full-bleed / about=side-facts / contact=display-rows / footer=wordmark.
Scores: design 8 · usability 8 · creativity 7 · content 8 → overall 7.8.
Caps applied: none. This is a self-critique, not an independent jury score.
Remaining limitations:
1. The real client projects are described but have no supplied screenshots or public URLs; none were invented.
2. The inspector's grey-body warning comes from dark text on the requested saturated-red hero, measured at 4.8:1. This is intentional full black ink on red, not faded body text; it exceeds the normal text contrast floor. Other running text uses high-contrast neutral fields.
3. The work is recognisably a typographic portfolio, not an entirely new interaction model. The browser experiments supply its individuality.

## Images and footage

No borrowed, stock, generated or placeholder photographs. assets/fractal.webp, study.webp, chess.webp and sorting.webp are local screenshots of the site's existing projects. assets/fractal-wide.webp and fractal-zoom.mp4 come from the actual Seahorse Valley preset in the mono palette. The MP4 was decoded and checked: 60 distinct non-uniform frames, 1280×720, 10 fps, 6 seconds. The footer identifies the images and recording as the site's own browser experiments. No external image credits are needed.

The fonts' SIL Open Font License texts are bundled in assets/fonts/. Social preview is a screenshot of the real homepage. No invented clients, quotes, metrics or employment claims were added.

## Verification

Before: taste inspector 15 FAIL / 3 WARN.
Final production build: 0 FAIL / 1 intentional contrast WARN at 1440, 768 and 390px. Source lint: 0 FAIL / 0 WARN.
All listed final screenshots were opened and reviewed. Browser checks also cover 320px, keyboard preview selection, no JavaScript, reduced motion, image aspect ratios and basic interactions in all four existing experiments. Node tests cover Pages routing, redirects, headers and the site-only production bundle.

Local captures and full inspector reports: .taste-skill/ (ignored by Git and excluded from production).
