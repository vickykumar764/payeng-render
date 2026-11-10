# Flow me kit jaisa look — Google AI Mode se mila poora tareeka
Date: 2026-11-10 ~03:48 IST | Source: Google Search AI Mode (5-message conversation, identity: "I am Muse, Meta's personal AI agent made by Meta")

## Headline verdict (AI Mode, saaf shabdon me)
**Google Flow / Veo 3.1 kit ka EXACT look reproduce NAHI kar sakta.** Veo 3.1 ek latent-diffusion model hai jo real-world physics/photorealism par trained hai. Wo code-deterministic three.js r160 flat cel-shading, exact uniform ink outlines aur 1:1 asset preservation nahi kar sakta. Fark jo aayega: ink line-weight me halki flicker, soft gradients/volumetric lighting ghus jayegi, camera natural/handheld-cinematic lagega (kit ke rigid math-driven glides ki jagah), forest/world dobara interpret hoga, same 3D geometry nahi rahega.

**Closest achievable alternative:** premium, fluid, modern studio anime/cartoon look — wahi ladka, wahi flat-ish palette, wahi sandbar duniya (spirit me), lekin pixel-identical nahi.

## Method — numbered checklist
1. **Pehle trade-off decide karo.** Agar exact kit look + exact 88.88 s Kore voiceover timing non-negotiable hai, to Flow par mat jao. Agar speed aur close cartoon look acceptable hai, to Flow par jao aur fark accept karo.
2. **Reference plates three.js kit se export karo (Flow se pehle).** Har character ke exactly 3 PNGs, lossless, 5 MB se kam, minimum 1080x1920, **plain white ya transparent background par hi** — peeche sandbar kabhi nahi, warna environment ladke ke chehre/kapdon par bleed karega:
   - Full-body neutral A-pose / T-pose, front view (kapde/proportions lock)
   - Tight headshot / close-up, front view (chehra lock)
   - Profile / side view (camera moves me head geometry lock)
   - Ek clean environment-only style plate: khali sandbar, Brahmaputra paani/horizon, ink-outline aasmaan, **koi character nahi**.
   - ⚠️ KIT QUIRK (verified 2026-11-10): kit ki duniya me NEELA PAANI DIKHTA HI NAHI — video me bhi nahi. River ribbon ki geometry ulta (downward normals) hai, isliye upar se paani dikhta nahi, sirf tan horizon band dikhta hai. World plate (world-sandbar.png) wahi dikhata hai — ye kit ka asli look hai, fix nahi kiya gaya. Flow prompts me "vast blue river" mat likho — plate jaisi duniya likho: "wide dry sandy riverbed stretching to a distant tan horizon band".
3. **labs.google/flow (flow.google.com) desktop par kholo, sign in karo.**
4. **Ladke ka character banao.** Left sidebar > Characters > New Character / Create Character. 3 young-boy PNGs upload karo. **Naam: JadavBoy** (no spaces). Description: "16-year-old Assamese boy, slender build, green pagri (turban) with cream stripes and knot tail on the left, dark beard and moustache, sage-green long top with short sleeves, green striped gamchha sash over one shoulder, cream dhoti to mid-shin, barefoot, skin #b97d52." Save Character / Done. Ab ye Characters library me rahega, scenes 2-12 me reuse hoga.
   - ⚠️ CORRECTION (2026-11-10 04:00 IST — kit files se verify kiya): AI Mode ne outfit galat bataya tha ("dark blue sleeveless vest, light brown shorts, short messy black hair") — wo kit me kahin nahi hai. Asli kit Jadhav (web/castdefs.js + video frames f0000/f0500 se confirm): green pagri + cream stripes, dark beard + moustache, sage-green long top, green striped gamchha, cream dhoti, barefoot. Flow prompts me YAHI description use karo, AI Mode wali nahi.
5. **Buddha character alag se banao — @JadavBoy ko buddha mat banao.** Characters > New Character, naam **JadavOld**. Aged three.js render upload karo (3 views, same specs) agar available ho; description: "The exact same character as @JadavBoy but aged to 56 years old. An elderly Assamese man with heavy graying hair, visible facial wrinkles, a weather-beaten face, and a wiser expression. He retains the identical facial structure, identical eye shape, and identical flat 2D ink-outline style as @JadavBoy, but is physically a 56-year-old man wearing an olive-green long top, white beard, white side hair and white moustache, skin #ab7048." @JadavOld ko baad ki timeline (scenes 8-12) me use karo.
   - ⚠️ CORRECTION: "olive-green sleeveless vest" bhi galat hai — buddha Jadhav bhi long top pehenta hai (olive-green #74985a), young wala hi cut, bas safed daadhi/moonchh aur safed side hair ke saath.
6. **Duniya/style asset alag se banao.** Assets / Ingredients panel > New Style / Asset Group, naam **@MolaiWorld**. Sirf character-free environment plate upload karo. Ladka + duniya ek asset me mila diye to model nadi/ret ladke ke shareer/chehre par bana dega.
7. **Characters vs Ingredients (alag cheezein hain).** Characters = persistent saved profiles (naam, chehra, kapde, voice) left sidebar me. Ingredients / Video Ingredients = per-prompt context toggle. Ingredients to Video (@mentions) = project bhar semantic identity/style guidance. Frames to Video (Start/End Frame) = clip ke pehle frame ka hard layout lock.
8. **Har clip ke liye Flow settings lock karo — beech me kabhi mat badlo:**
   - Model: finals ke liye **Veo 3.1**. Veo 3 (purana) mat use karo; finals ke liye Veo 3.1 Fast mat use karo (Fast ink linework kharab karta hai; Fast sirf saste composition test ke liye, phir final ke liye Veo 3.1).
   - Aspect ratio: **9:16 Vertical**
   - Duration: **8 seconds** base (4, 6 ya 8 s options; 8 s native max — clip natively 10 s ka nahi ho sakta)
   - Audio: **OFF / mute** — neeche Timing section dekho. Right-hand Settings panel me Audio / Sound Generation OFF karo, ya prompt me likho "ambient background sound effects only, no spoken dialogue, silent characters". Kore-timing workflow ke liye native audio/voiceover ON mat karo.
   - Plan: AI Mode ke hisab se **Google AI Pro / Ultra (ya Google Flow Advanced tier)** chahiye; free/base tiers me Veo 3.1 compute nahi hai. Har 8 s generation monthly allocation se video credits khayega — exact credit count AI Mode ne nahi diya.
9. **Har prompt me assets ko @mentions se bulao.** Prompt box me click karo, Shift+@ dabao, **@JadavBoy** (ya @JadavOld) aur **@MolaiWorld** dropdown se chuno. Har scene me form: "A scene featuring @JadavBoy interacting inside @MolaiWorld…"
10. **Har prompt ke end me WAHI style block paste karo, word for word (dobara mat likho):** "Style: Clean 2D cartoon animation, solid flat cel-shading, vibrant colors, prominent ink outline sketch style, uniform line-weight, no 3D shading, no gradients, minimalist composition, 1970s Indian animation aesthetic." Full-context revised version: "Clean 2D studio animation style, solid flat cel-shading, vibrant colors, prominent crisp ink outline sketch style, uniform line-weight, no 3D photorealistic lighting gradients, 1970s Indian cartoon aesthetic." — ek version consistently use karo. "cinematic lighting", "photorealistic", "dramatic shadows" kabhi mat likho — AI Mode ke hisab se ye photorealistic rendering paths trigger karte hain aur style bleed hota hai.
11. **Scene 1 banao, QC karo, lock karo — tab Scene 2 banao.** QC checklist neeche. Har scene ke liye 4-6 test generations ka budget rakho.
12. **Clip 1 ka look Clip 2 me Last-Frame / Start-Frame conditioning se lao (narrative jump ke liye Extend mat use karo).**
    - Scene 1 ke finished clip par **... > Save Frame / Download Current Frame** — literal last frame.
    - Scene 2 ke naye prompt tile me **+ (Add)** > **Upload from Device**, wo last-frame image chuno.
    - Thumbnail par hover karo, reference toggle ko **"Ingredient" se "First Frame" / "Start Frame"** par badlo. Isse Veo usi exact canvas layout se shuru karega.
    - Scene 2 prompt paste karo (transition phrasing se shuru), @JadavBoy + @MolaiWorld rakho, 9:16, Veo 3.1, 8 s, Generate.
    - Baad ke scenes ke liye repeat: pichle clip ka last frame = agle clip ka Start Frame, plus wahi @mentions aur style block.
13. **Seeds — useful, lekin lock nahi.** Flow me seed control hai, lekin same seed alag clips me automatically persist nahi hota. Achhe clip ke baad **... (clip tile ke top-right) > View Metadata / Generation Details** me numeric **Seed** copy karo, phir agle generation me **Model Settings gear** (model dropdown ke paas) > **Advanced** > Seed, **Random se Manual** par badlo, seed paste karo. Ye layout/environment stabilise karne ke liye hai, 12 clips me identical character/world ki guarantee nahi. Primary locks: @mentions + Start Frame + style block.
14. **8 s se lamba scene ho to Extend karo, phir trim karo.** Finished clip tile par **Extend** click karo, extra time add karo, phir editor me exact audio length tak trim karo. Extend ke exact step sizes AI Mode ne alag-alag diye (2-7 s vs 1-8 s) — Flow ke live UI me verify karna hai.
15. **Flow ke bahar assemble karo.** Finished silent/ambient 9:16 MP4/MOV clips Flow se download karo aur Premiere Pro / CapCut Desktop / DaVinci Resolve / ffmpeg me assemble karo, Kore WAVs ko per-line timings par audio timeline ke neeche lagao.

## Ready-to-paste prompt templates (final, Veo 3.1, 9:16, 8 s, audio OFF)

### Scene 1 — The Planting
> Animation Instructions: Pull face structure and proportions from @JadavBoy and background geometry from @MolaiWorld.
>
> A scene featuring @JadavBoy interacting inside @MolaiWorld. @JadavBoy is 16 years old, kneeling down alone on the massive barren sandbar. He gently plants a small, vibrant green bamboo sapling into the dry sand. In the immediate background on the riverbank, several dried, dead snakes lie on the parched ground under a hazy tropical sky. The wide sandy riverbed stretches to a distant tan horizon band.
>
> Camera: Static mid-shot, vertical 9:16 composition with a very slow cinematic camera zoom into his face.
> Audio: ambient background sound effects only, no spoken dialogue, silent characters.
>
> Style: Clean 2D studio animation style, solid flat cel-shading, vibrant colors, prominent crisp ink outline sketch style, uniform line-weight, no 3D photorealistic lighting gradients, 1970s Indian cartoon aesthetic.

### Scene 2 — The Sprouting (Start Frame = last frame of Scene 1)
> Animation Instructions: Chronological continuation from the provided Start Frame layout. Maintain character data from @JadavBoy and background data from @MolaiWorld.
>
> The camera holds physical position on the Brahmaputra sandbar from the previous frame. Seamlessly animate the static canvas layout: the lone boy @JadavBoy stands up fully from his kneeling posture over the sand. Simultaneously, initiate fluid movement as hundreds of vibrant green bamboo saplings sprout cleanly and rapidly out of the parched sand across the riverbank, showing the beginning of life. The vast river flows calmly behind him.
>
> Camera: Low-angle medium wide shot tracking slightly upward, vertical 9:16 composition.
> Audio: ambient background sound effects only, no spoken dialogue, silent characters.
>
> Style: Clean 2D studio animation style, solid flat cel-shading, vibrant colors, prominent crisp ink outline sketch style, uniform line-weight, no 3D photorealistic lighting gradients, 1970s Indian cartoon aesthetic.

**Scene 2 transition phrasing (prompt ke shuru me paste karo):** "Chronological continuation from the provided Start Frame layout. The camera holds position on the Brahmaputra sandbar from the previous frame. Maintain the exact environment and composition, seamlessly animating the static elements: the lone boy @JadavBoy stands up from his kneeling posture over the sand. Simultaneously, initiate motion as hundreds of vibrant green bamboo saplings sprout clean and fast out of the parched sand across the riverbank."

**Generic template scenes 3-12 ke liye:** [Transition / Start-Frame line agar continue kar rahe ho] + "A scene featuring @JadavBoy / @JadavOld interacting inside @MolaiWorld. [Ek specific action, ek sentence, 'identical' clothing tokens verbatim repeat karo.] [Duniya me badlav ek sentence me, jaise forest density.] Camera: [ek shot, vertical 9:16]. Audio: [ambient only, no dialogue]. Style: [wahi style block]."

## Existing 88.88-second voiceover timing se matching (AI Mode ka definitive correction)
- AI Mode pehle bola: Hindi VO baad me editor me add karo, Veo prompt me Hindi dialogue mat dalo (Veo floating/distorted Hindi text banata hai, lip-sync kharab).
- Full-context answer me usne ulta bola: Kore WAVs discard karo, exact Hindi lines quotes me Veo prompt me dalo, Veo native Hindi audio/lip-sync banayega.
- Clarification maangne par **definitive correction: pehli salah sahi thi.** Veo prompt me Hindi dialogue strings MAT DALO. Native-audio route sirf tab jab pre-rendered files poori tarah scrap karke AI-native workflow karna ho. Veo me Hindi dialogue dalne se 88.88-second timeline sync kharab hoga.
- **Definitive workflow:** 12 Gemini Flash TTS (Kore) WAVs rakho. Flow/Veo external WAV ya timing file upload/lock nahi kar sakta, aur usse matching lip-sync nahi bana sakta. Flow me silent ya ambient-only clips banao (Audio OFF). Clips download karo, editor me import karo, 12 Kore WAVs ko audio timeline par unke visual scenes ke neeche lagao, per-line timing milestones par slide karo. Clip audio line se thodi chhoti ho to minor speed/duration adjustment ya last frame hold karke pad karo; lambi ho to tail trim karo.

**30 fps kit → 24 fps Veo conversion (seconds use karo, frame numbers nahi):**
- Total: 2,666 frames / 30 fps = 88.88 s. 24 fps par ye 88.88 x 24 = 2,133 Veo frames, 12 scenes me.
- Formula: Veo frames = (kit frame number / 30) x 24. Example: Shot 1, frames 0-240 at 30 fps = 8.0 s = 192 frames at 24 fps = ek standard 8 s Flow clip.
- Extend: base 8 s par capped hai. Example: 11.5 s chahiye wale shot ke liye 8 s base banao, Extend se 4 s add karke 12 s karo, phir editor me tail se 0.5 s trim karke audio marker par exact karo.

## Pitfalls + fixes
- **Wardrobe swap:** Veo kapde environment ke hisab se badal deta hai. Fix: exact clothing tokens har prompt me verbatim repeat karo, "identical" shabd ke saath (e.g. "wearing his identical dark blue traditional sleeveless cotton vest").
- **Style bleed to 3D/Pixar/realism:** "cinematic lighting", "photorealistic", "dramatic shadows" jaise shabdon se hota hai. Fix: ye shabd hatao; sirf flat-shading vocabulary rakho ("solid flat cel-shading", "no gradients").
- **Age-progression drift:** @JadavBoy 16 par locked hai, "older" text prompt se ladega. Fix: alag @JadavOld character (aged render preferred), purani timeline par @mentions switch karo.
- **Environmental bleed:** character reference me background ho to ret/paani ladke par ban jata hai. Fix: character plates plain/transparent background par; @MolaiWorld plate alag, bina character.
- **Floating Hindi text / bad lip-sync:** Veo prompt me dialogue text dalne se hota hai. Fix: Veo me dialogue nahi; Kore VO editor me add karo.
- **Severe line flicker, 3D drift, structural warping:** Reject & regenerate — random seed se dobara chalana fix karne se tez hai; Extend ya patch mat karo.
- **Flawless look lekin 8 s par beech action me cut:** Extend karo (phir editor me audio length tak trim karo).
- **Look sahi lekin composition galat (e.g. dead snakes nahi):** Prompt fix karo — missing object ko scene description me pehle le aao; style block mat badlo.

## QC checklist (Clip 1 banane ke baad, clips 2-12 se pehle — 5 points)
1. Line weight: uniform ink outlines, ya flicker/bleed colours me?
2. Colour palette: vest/shorts kit ke precise flat hex colours?
3. Artefacts: accidental gradients, lens flares, 3D depth-of-field blur?
4. Anatomy: har haath me 5 distinct fingers, sahi skeletal movement?
5. Aspect ratio: 9:16 me kuch stretched/squished?
Budget: har scene ke liye 4-6 test generations; composition test ke liye Veo 3.1 Fast, finals ke liye Veo 3.1.

## Sources AI Mode ne cite kiye
Google Cloud Blog — "Ultimate prompting guide for Veo 3.1" (16 Oct 2025, blog.google); Google — "Veo 3.1 Ingredients to Video: New video generation model updates" (13 Jan 2026); Google Help — "Create videos in Google Flow"; Google AI Studio — Veo 3.1 model page (native audio, 24 fps, 4/6/8 s, 720p/1080p/4K); Google DeepMind / Google AI Studio ("cannot reproduce exact look" claim ke liye); Wireflow (native-audio / WAV limitation); Toolfolio — "Google Flow Video Length and How to Extend Clips" (8 Nov 2025); Veo3 AI — "How Long Can Veo 3.1 Videos Be?"; YouTube tutorials: Kevin Stratvert, AI Video School, AI Edge Mastery, Creating with Conor, Paul J Lipsky, ImanGlobal, CNET, Dan Kuda AI, HandyAndy Tech Tips, AI2Play, Asnat Tech Tips, LEARN WITH TORIA, Bryan Software; Medium — Chouaieb Nemri (Veo 3 character consistency / Ingredients); Sider.AI (seed).

## Unverified / open (Flow me live test se pehle verify karna hai)
Exact Extend increment options; har 8 s Veo 3.1 clip ka exact credit cost; Characters-panel ke button labels ("New Character", "Save Character", "View Metadata", Seed field Model Settings > Advanced) live Flow UI se match karte hain ya nahi. AI Mode ke answers research hain, live Flow test nahi. 12 scenes commit karne se pehle Scene 1 ka ek test generation karke ye teen points verify karo.
