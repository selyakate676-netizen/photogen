import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Replicate from "replicate";
import sharp from "sharp";

import { getReplicateApiToken, getS3BucketName, getSiteUrl, getWebhookSecret } from "@/lib/env";
import { renderHeroCompositionContract } from "@/lib/ai/hero-composition-catalog";
import { IDENTITY_REFERENCE_POLICY, selectPersonaReferenceKeys } from "@/lib/ai/persona-reference-policy";
import {
  CURRENT_HERO_COMPOSITION_MARKER,
  IDENTITY_AND_COMPOSITION_CONTRACT,
  getPoseAnatomySafety,
  splitSceneAndHeroPrompt,
} from "@/lib/ai/prompt-system-quality";
import { s3Client } from "@/lib/s3";
import { claimPhotoshootGeneration, updatePhotoshootGenerationStatus, updatePhotoshootStatus } from "@/lib/photoshoots/status";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import type { Photoshoot } from "@/types/database";

const MODEL_ID = "openai/gpt-image-2";
const ENABLE_SP004_HERO_COMPOSITION_SET_EXPERIMENT = true;

const DEFAULT_SCENE_PACKAGE_ID = "dating";

const SP004_SERIES_APPEARANCE = [
  "Series Appearance: this package-level Appearance Lock is inherited by every Hero Composition in SP-004. It defines the shared photoshoot look for the whole set and must not change identity.",
  "Outfit: elegant beige blazer, clean white or cream fitted top, dark tailored trousers or dark jeans. Smart casual editorial cafe look.",
  "Top: clean white or cream fitted top.",
  "Bottom: dark tailored trousers or dark jeans.",
  "Outerwear: the same elegant beige blazer across all four images.",
  "Shoes: elegant minimal shoes, neutral or dark tone, when visible.",
  "Accessories: small earrings, delicate necklace, simple watch, minimal rings. Keep the same accessories, jewelry and watch across all four images.",
  "Hair continuity: natural hair color, length and texture remain stable. Hairstyle arrangement, parting and hair placement are frame-specific and come only from the selected structured Hero Composition.",
  "Makeup: natural fresh makeup, healthy realistic skin texture, soft neutral lips, subtle blush, no heavy glam.",
  "Color palette: beige, cream, white, dark denim or navy, warm cafe neutrals.",
  "All Hero Compositions must inherit the same Series Appearance. Do not change jacket, top, bottom, shoes, watch, jewelry, accessories, makeup, general hairstyle or color palette between Hero Compositions.",
  "Appearance Layer must not copy reference clothing. It defines a unified editorial shooting look for the series.",
  "Allowed natural changes: slightly unbutton the blazer, slightly roll a sleeve, tuck hair behind the ear, small natural hair movement, and small changes in clothing fit caused by pose.",
].join(" ");

const SP004_SERIES_CONTINUITY = [
  "Series Continuity: all 4 images must look like they were taken during the same professional editorial lifestyle photoshoot, on the same day, in the same cafe, with the same outfit, stable natural hair color length and texture, same makeup, same accessories, same color palette, same lighting mood, same photographer style and same warm cafe atmosphere.",
  "The four images should feel photographed on one day by one professional photographer, not like four unrelated generations.",
].join(" ");

const SP004_HERO_LIBRARY =
  "Hero Composition Library: SP-004 contains HC-001 Coffee Portrait, HC-002 Playful Dessert Moment, HC-003 Eye Contact Portrait and HC-004 Quiet Window Moment. Generate one coherent photograph based on one hero composition only. Do not combine several hero compositions in one image. Do not create a series, collage, grid, contact sheet or multi-panel image.";

const SP004_SCENE =
  "Scene: contemporary European cafe with an open terrace or cozy indoor area, small round marble or wooden tables, woven chairs, dark cafe facade, large windows, calm city street or warm cafe background and soft natural daylight.";

const SP004_PHOTOGRAPHIC_LANGUAGE =
  "Photographic language: one professional editorial lifestyle photograph, not a collage and not a contact sheet. Warm commercial lifestyle editorial, natural beauty, timeless relaxed cinematic but realistic feeling. Focus on atmosphere, human presence and natural elegance. Maintain realistic proportion between head, neck, shoulders, torso and arms. Shot Size is a hard constraint and must follow the selected Hero Composition; GPT must not freely change framing size. Vary photographer distance across the hero set: close, medium, three-quarter and environmental/full body. Avoid overly tight face crop, oversized head, narrow shoulders or portrait cutout feeling. Use believable lens feel, slight documentary realism, natural perspective, balanced editorial framing and authentic interaction with the cafe environment.";

const SP004_CAMERA_LANGUAGE =
  "Camera Language: The photographer maintains realistic working distance from the subject. Avoid excessive close-ups. Maintain natural head-to-body proportions. The head must never dominate the frame unnaturally. Maintain realistic perspective similar to professional editorial portrait photography. Compose using realistic working distances rather than digitally zooming into the face. Avoid distorted perspective. Maintain comfortable negative space around the subject. The camera should feel physically positioned where a professional photographer would naturally stand. Editorial realism is preferred over dramatic framing.";

const SP004_REFERENCE_BOUNDARY =
  "Reference boundary: reference defines identity, facial geometry, age cues and natural body proportions. User Profile defines hair color, eye color, gender and body type. Series Appearance defines outfit, top, bottom, outerwear, shoes, accessories, watch, jewelry, hairstyle, makeup and color palette. Series Continuity defines location, cafe, time of day, lighting mood, color grading, photographer style and one-session feeling. Hero Composition defines shot size, composition intent, primary interaction, subject position, hands, gaze, emotion, scene-specific props, locked elements, allowed variations and forbidden substitutions. Do not copy clothing, hairstyle, makeup, pose, lighting, exact framing or exact composition from reference.";

const SP005_SERIES_APPEARANCE = [
  "Series Appearance: this package-level Appearance Lock is inherited by every Hero Composition in SP-005. It defines one shared luxury SUP editorial look for the whole photoshoot and must not change identity.",
  "Outfit: the same black high-neck one-piece swimsuit across all four images. Closed elegant sporty swimsuit, luxury editorial paddleboard aesthetic.",
  "Equipment: the same paddleboard model, same paddleboard color and same paddle across all four images.",
  "Object Lock: The exact same paddleboard and paddle must appear in every image. Do not change board model, board shape, board dimensions, board colors, board graphics, deck pad or paddle design. These are locked objects for the entire photoshoot.",
  "Hair continuity: natural hair color, length and texture remain stable. Hairstyle arrangement, parting and hair placement are frame-specific and come only from the selected structured Hero Composition.",
  "Makeup: same minimal waterproof editorial makeup across all four images, natural skin, no heavy glam, no changing makeup between Hero Compositions.",
  "Accessories: no accessories or the same minimal waterproof accessories across all four images. Do not introduce changing jewelry, hats, sunglasses or beach props.",
  "Color palette: black swimsuit, crystal-clear turquoise water, clean sunlight, premium natural aquatic tones, luxury editorial color grading.",
  "All Hero Compositions must inherit the same Series Appearance. Do not change swimsuit, paddleboard model, paddleboard color, paddle, hairstyle, makeup, accessories or color palette between Hero Compositions.",
  "Appearance Layer must not copy reference clothing. It defines a unified SUP editorial shooting look for the series.",
].join(" ");

const SP005_SERIES_CONTINUITY = [
  "Series Continuity: all 4 images must look like they were taken during the same professional luxury editorial paddleboard photoshoot, on the same day, in the same crystal-clear turquoise water location, with the same black one-piece swimsuit, same paddleboard, same paddle, stable natural hair color length and texture, same minimal makeup, same accessory choice, same sunlight, same premium color grading and same calm water atmosphere.",
  "The four images should feel photographed in one continuous SUP editorial session, not like four unrelated generations.",
].join(" ");

const SP005_HERO_LIBRARY =
  "Hero Composition Library: SP-005 contains HC-001 Aerial Editorial, HC-002 Hero Beauty Portrait, HC-003 Board Editorial Portrait and HC-004 Paddle Lifestyle. Generate one coherent photograph based on one hero composition only. Do not combine several hero compositions in one image. Do not create a collage, grid, contact sheet or multi-panel image.";

const SP005_SCENE =
  "Scene: luxury editorial paddleboard photoshoot on crystal-clear turquoise water, sunny day, calm water, clean premium aquatic background, no crowded beach, no messy props, no stormy water, elegant sporty mood.";

const SP005_PHOTOGRAPHIC_LANGUAGE =
  "Photographic language: luxury editorial water-sport fashion photography with realistic body proportions and premium natural sunlight. The selected Hero Composition controls camera angle and shot size. Maintain believable photographer perspective, clean geometry, clear water texture, high-end editorial composition and realistic integration with water and board. Avoid distorted limbs, oversized head, floating cutout look, cheap stock-photo look or swimsuit catalog exaggeration.";

const SP005_CAMERA_LANGUAGE =
  "Camera Language: respect the selected SUP Hero Composition exactly. Use realistic water-level, aerial or editorial portrait camera positions only when the selected HC asks for them. Keep the person naturally integrated with water, paddleboard and sunlight. Maintain natural head-to-body proportions. Avoid selfie angle, impossible drone perspective, distorted perspective, excessive close-up unless HC-002 explicitly asks for a beauty portrait, and avoid losing identity in wide shots.";

const SP005_REFERENCE_BOUNDARY =
  "Reference boundary: reference defines identity, facial geometry, age cues and natural body proportions. User Profile defines hair color, eye color, gender and body type. Series Appearance defines swimsuit, paddleboard, paddle, wet-look hairstyle, makeup, accessories and color palette. Series Continuity defines location, water, weather, lighting mood, color grading, photographer style and one-session feeling. Hero Composition defines shot size, camera angle, composition intent, subject position, hands, gaze, emotion, equipment interaction, locked elements, allowed variations and forbidden substitutions. Do not copy clothing, hairstyle, makeup, pose, lighting, exact framing or exact composition from reference.";

const SP005_SINGLE_SCENE_PACKAGE = [
  "ID: SP-005.",
  "Name: SUP Editorial.",
  "Category / JTBD: Luxury / Editorial / Sport Lifestyle. Create one premium paddleboard editorial photograph on crystal-clear water.",
  "Package Promise: Luxury editorial paddleboard photoshoot on crystal-clear water with a sporty, elegant aesthetic.",
  SP005_SERIES_APPEARANCE,
  SP005_SERIES_CONTINUITY,
  SP005_HERO_LIBRARY,
  "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine swimsuit, paddleboard, paddle, hairstyle, makeup, accessories, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
  SP005_SCENE,
  SP005_PHOTOGRAPHIC_LANGUAGE,
  SP005_CAMERA_LANGUAGE,
  "Lighting and camera: sunny day, clean natural sunlight, premium aquatic reflections, realistic water highlights, natural skin, no harsh flash, no artificial studio light.",
  "Quality: expensive luxury editorial paddleboard photoshoot, high realism, natural skin, professional photographer work, no AI image look.",
  "Must have: crystal-clear turquoise water, calm water, black closed one-piece swimsuit, same paddleboard, same paddle when required by HC, frame-specific structured hairstyle, minimal makeup, luxury editorial mood, sporty elegance.",
  "Must not: changed swimsuit, changed paddleboard model, changed paddleboard color, changed paddle, changed hairstyle, changed accessories, crowded beach, stormy water, cheap vacation snapshot, plastic skin, copied reference clothing, copied reference hairstyle, copied reference pose or exact crop.",
  SP005_REFERENCE_BOUNDARY,
].join(" ");
const SP006_SERIES_APPEARANCE = [
  "Series Appearance: this package-level Appearance Lock is inherited by every Hero Composition in SP-006. It defines one shared elegant studio look for the whole photoshoot and must not change identity.",
  "Outfit: the exact same red silk dress across all four images. Elegant premium studio dress, refined and realistic, not fashion catalog styling. Dress is a locked appearance element for the entire photoshoot. Do not change neckline, straps, draping, folds, fabric, silhouette, fit, color or length between Hero Compositions.",
  "Hair continuity: natural hair color, length and texture remain stable. Hairstyle arrangement, parting and hair placement are frame-specific and come only from the selected structured Hero Composition.",
  "Makeup: the same natural elegant makeup across all four images, realistic skin texture, soft neutral lips, subtle blush, no heavy glam.",
  "Accessories: the same minimal jewelry or no jewelry across all four images. Do not change earrings, necklace, rings or accessory choice between Hero Compositions.",
  "Color palette: red silk dress, warm beige neutral studio background, soft warm light, premium minimalist tones.",
  "All Hero Compositions must inherit the same Series Appearance. Do not change dress, neckline, straps, draping, folds, fabric, silhouette, fit, color, length, hairstyle, hair volume, hair texture, hair arrangement, jewelry, makeup or color palette between Hero Compositions.",
  "Appearance Layer must not copy reference clothing. It defines a unified studio elegance shooting look for the series.",
].join(" ");

const SP006_SERIES_CONTINUITY = [
  "Series Continuity: all 4 images must look like they were taken during the same expensive professional studio photoshoot, in one minimalist warm-toned studio, by one photographer, with one warm soft light source, the same red silk dress, stable natural hair color length and texture, same natural makeup, same jewelry choice and same neutral beige background.",
  "The four images should feel photographed in one continuous studio session, not like four unrelated generations.",
  "The studio has no furniture and no props unless a Hero Composition explicitly requires floor sitting; keep the environment minimal and clean.",
].join(" ");

const SP006_HERO_LIBRARY =
  "Hero Composition Library: SP-006 contains HC-001 Relaxed Sitting Portrait, HC-002 Seated Portrait, HC-003 Hero Close Portrait and HC-004 Relaxed Sitting Portrait. Generate one coherent photograph based on one hero composition only. Do not combine several hero compositions in one image. Do not create a collage, grid, contact sheet or multi-panel image.";

const SP006_SCENE =
  "Scene: elegant premium studio photoshoot in a minimalist warm-toned interior, neutral beige background, warm late afternoon sunlight entering from one side, clean professional studio space, no furniture, no props, no busy decor.";

const SP006_PHOTOGRAPHIC_LANGUAGE =
  "Photographic language: real professional studio session, elegant premium portrait photography, warm minimalism, natural human posture and realistic body proportions. The result should feel like a photographer lightly directed the subject in a few seconds, not like a fashion catalog pose. Avoid exaggerated body curves, complex anatomy, stiff posing, artificial perfection, glossy fashion-advertising look or mannequin-like styling.";

const SP006_CAMERA_LANGUAGE =
  "Camera Language: respect the selected Studio Elegance Hero Composition exactly. Use realistic studio portrait camera distance, natural perspective, comfortable negative space and stable head-to-body proportions. Avoid distorted limbs, oversized head, narrow shoulders, extreme close-ups unless HC-003 asks for a close portrait, and avoid losing identity in wider compositions.";

const SP006_REFERENCE_BOUNDARY =
  "Reference boundary: reference defines identity, facial geometry, age cues and natural body proportions. User Profile defines hair color, eye color, gender and body type. Series Appearance defines dress, hairstyle, makeup, jewelry and color palette. Series Continuity defines studio, background, lighting mood, photographer style and one-session feeling. Hero Composition defines shot size, composition intent, subject position, hands, gaze, emotion, locked elements, allowed variations and forbidden substitutions. Do not copy clothing, hairstyle, makeup, pose, lighting, exact framing or exact composition from reference.";

const SP006_SINGLE_SCENE_PACKAGE = [
  "ID: SP-006.",
  "Name: Studio Elegance.",
  "Category / JTBD: Premium Studio / Elegant Portraits. Create one elegant premium studio photograph in a minimalist warm-toned interior.",
  "Package Promise: Elegant premium studio photoshoot in a minimalist warm-toned interior. The result should look like a real professional studio session rather than fashion catalog imagery.",
  SP006_SERIES_APPEARANCE,
  SP006_SERIES_CONTINUITY,
  SP006_HERO_LIBRARY,
  "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine dress, hairstyle, makeup, jewelry, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
  SP006_SCENE,
  SP006_PHOTOGRAPHIC_LANGUAGE,
  SP006_CAMERA_LANGUAGE,
  "Lighting and camera: consistent soft natural sunlight inspired by the reference: warm late afternoon sunlight, soft diffused light, gentle sunlight entering from one side, subtle window light feeling, soft natural shadows, delicate light gradients and soft highlights on the background wall. The lighting should feel like expensive editorial photography in natural sunlight. Do not use flat studio lighting, beauty dish look, hard flash or evenly illuminated background.",
  "Quality: expensive elegant studio photoshoot, high realism, natural skin, professional photographer work, no AI image look, no fashion catalog exaggeration.",
  "Must have: red silk dress, minimalist warm-toned studio, neutral beige background, natural posture, relaxed shoulders, realistic anatomy, same Series Appearance.",
  "Must not: changed dress, changed dress color, changed hairstyle, changed jewelry, changed makeup, furniture, props, fashion poses, exaggerated body curves, complex body bends, hands covering face, fingers covering lips, plastic skin, copied reference clothing, copied reference hairstyle, copied reference pose or exact crop.",
  SP006_REFERENCE_BOUNDARY,
].join(" ");
const SP007_SERIES_APPEARANCE = [
  "Series Appearance: this package-level Appearance Lock is inherited by every Hero Composition in SP-007. It defines one shared young nature muse lakeside look for the whole photoshoot and must not change identity.",
  "Outfit: the same light flowing elegant modern dress across all four images. The dress is made of thin airy fabric, has a more open upper part, moves naturally in the breeze, and feels youthful, romantic and contemporary. Avoid closed sleeves, heavy silhouette, motherly styling or an age-heavy look.",
  "Hair continuity: natural hair color, length and texture remain stable. Hairstyle arrangement, parting and hair placement are frame-specific and come only from the selected structured Hero Composition; wind may affect only loose strands allowed by that frame.",
  "Makeup: the same minimal fresh natural makeup across all four images, realistic skin texture, soft romantic glow, no heavy glam.",
  "Accessories: minimal delicate jewelry or no jewelry. Do not introduce props or changing accessories.",
  "Color palette: airy light dress, warm golden hour sunlight, glowing hair, sparkling lake reflections, soft lake blues, rich greens, dreamy romantic tones.",
  "All Hero Compositions must inherit the same Series Appearance. Do not change dress, dress color, hairstyle, makeup, accessories or color palette between Hero Compositions.",
  "Appearance Layer must not copy reference clothing. It defines a unified young nature muse / woodland nymph lakeside shooting look for the series.",
].join(" ");

const SP007_SERIES_CONTINUITY = [
  "Series Continuity: all 4 images must look like they were taken during the same golden hour romantic lakeside photoshoot, on the same evening, by one photographer, with the same lake, same park, same flowing dress, stable natural hair color length and texture, same makeup, same light breeze and same cinematic warm backlight.",
  "The four images should feel like one continuous young nature muse lakeside session: freedom, lightness, movement, wind, romance and dreamy energy, not four unrelated generations and not a calm age-heavy outing.",
].join(" ");

const SP007_HERO_LIBRARY =
  "Hero Composition Library: SP-007 contains HC-001 Lakeside Walking Muse, HC-002 Wind Portrait, HC-003 Over-Shoulder Lakeside Portrait and HC-004 Shore Sitting Muse. Generate one coherent photograph based on one hero composition only. Do not combine several hero compositions in one image. Do not create a collage, grid, contact sheet or multi-panel image.";

const SP007_SCENE =
  "Scene: quiet lakeside park during cinematic golden hour, sparkling water reflections, warm backlight, sun flare, beautiful bokeh, rich greenery, light breeze, romantic natural lakeside atmosphere, no crowds, no city traffic, no phone snapshot mood.";

const SP007_PHOTOGRAPHIC_LANGUAGE =
  "Photographic language: young nature muse, woodland nymph, golden hour romance, freedom, wind, lightness and movement. The image should feel cinematic, alive and romantic, captured by a professional lifestyle photographer. Use warm backlight, hair glow, sun flare, sparkling water reflections, beautiful bokeh and natural movement. Avoid age-heavy styling, boring static poses, phone snapshot look, flat light, closed dress styling or identical expressions.";

const SP007_CAMERA_LANGUAGE =
  "Camera Language: respect the selected Lakeside Walk Hero Composition exactly. Avoid full-body framing. Use realistic lifestyle photographer distance, natural perspective, warm cinematic lakeside framing, depth, bokeh and believable head-to-body proportions. Avoid selfie angle, distorted limbs, oversized head, flat light, stiff posing and excessive close-up unless HC-002 asks for a close portrait.";

const SP007_REFERENCE_BOUNDARY =
  "Reference boundary: reference defines identity, facial geometry, age cues and natural body proportions. User Profile defines hair color, eye color, gender and body type. Series Appearance defines the light flowing modern dress, loose wavy wind-touched hairstyle, makeup, accessories and color palette. Series Continuity defines lake, park, golden hour, wind, water reflections, photographer style and one-session feeling. Hero Composition defines shot size, composition intent, primary interaction, subject position, hands, gaze, emotion, scene-specific props, locked elements, allowed variations and forbidden substitutions. Do not copy clothing, hairstyle, makeup, pose, lighting, exact framing or exact composition from reference.";

const SP007_SINGLE_SCENE_PACKAGE = [
  "ID: SP-007.",
  "Name: Lakeside Walk.",
  "Category / JTBD: Golden Hour Romance / Outdoor Lifestyle Editorial. Create one cinematic warm lakeside photograph with a young nature muse mood.",
  "Package Promise: Young nature muse, woodland nymph and golden hour romance around a quiet lakeside park. The result should feel free, light, alive, dreamy and cinematic, captured by one professional lifestyle photographer.",
  SP007_SERIES_APPEARANCE,
  SP007_SERIES_CONTINUITY,
  SP007_HERO_LIBRARY,
  "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine dress, hairstyle, makeup, accessories, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
  SP007_SCENE,
  SP007_PHOTOGRAPHIC_LANGUAGE,
  SP007_CAMERA_LANGUAGE,
  "Lighting and camera: cinematic golden hour, warm backlight, sun flare, hair glow, beautiful bokeh, light breeze, sparkling water reflections, natural highlights, soft shadows, no flat light, no harsh flash, no dramatic artificial light.",
  "Quality: real cinematic romantic lifestyle photoshoot, high realism, natural skin, alive emotion, professional photographer work, dreamy lakeside atmosphere, no AI image look.",
  "Must have: quiet lake, park greenery, golden hour, warm backlight, sun flare, hair glow, sparkling water reflections, light flowing modern dress, frame-specific structured hairstyle, natural wind response when applicable, same Series Appearance, movement and lightness.",
  "Must not: phone snapshot look, age-heavy or motherly outfit, closed heavy dress, boring static pose, full-body framing, identical facial expressions, flat light, changed dress, changed dress color, changed hairstyle, changed makeup, props, hands near face, complex body bends, excessive torso curve, strong wind covering face, hair fully covering face, plastic skin, copied reference clothing, copied reference hairstyle, copied reference pose or exact crop.",
  SP007_REFERENCE_BOUNDARY,
].join(" ");
const SP008_SERIES_APPEARANCE = [
  "Series Appearance: this package-level Appearance Lock is inherited by every Hero Composition in SP-008. It defines one shared atmospheric autumn Petersburg editorial walk look for the whole photoshoot and must not change identity.",
  "Wardrobe: the exact same voluminous cropped dark chocolate suede bomber, milk or white long-sleeve top or T-shirt, straight high-waisted white jeans, brown leather belt, brown high leather boots or minimal brown boots, small brown leather crossbody bag and minimalist jewelry across all four images. Quiet luxury, Scandinavian fashion and French minimalism, modern expensive natural city styling.",
  "Do not use turtlenecks, camel coat, beige coat, long coat, sportswear, tourist styling or random casual clothing.",
  "Hair continuity: natural hair color, length and texture remain stable. Hairstyle arrangement, parting and hair placement are frame-specific and come only from the selected structured Hero Composition; keep styling polished and keep hair from covering the face.",
  "Makeup: the same natural makeup across all four images, realistic skin texture, calm modern city editorial look, no heavy glam.",
  "Color palette: cold gray, wet granite, wet asphalt, dark chocolate suede, milk white, brown leather, muted black, northern cloudy light and subtle reflected highlights. No bright summer green and no golden hour warmth.",
  "Outfit, bag, shoes, belt, hairstyle, makeup and color palette are locked for the entire photoshoot. Appearance Layer must not copy reference clothing.",
].join(" ");

const SP008_SERIES_CONTINUITY = [
  "Series Continuity: all 4 images must look like they were taken during the same atmospheric autumn editorial walk in Saint Petersburg after rain, by one photographer, with the same outfit, stable natural hair color length and texture, same makeup, same bag, same accessories, same cool northern daylight and same wet-stone city mood.",
  "The four images should feel like one continuous day in Petersburg: granite embankments, canals, historical facades, columns, exterior cafe facade, old doors, arches, wet streets, puddles and reflections.",
  "Architectural landmark rule: Saint Isaac's Cathedral, domes or any dominant landmark are not required and should generally be avoided. If a cathedral or landmark appears at all, it may only be a very distant blurred detail in at most one image; the Petersburg mood should come from columns, granite, wet stone, old doors, arches, canals, cafe facades and overcast northern light.",
].join(" ");

const SP008_HERO_LIBRARY =
  "Hero Composition Library: SP-008 contains HC-001 Stone Portrait, HC-002 Cafe Facade, HC-003 Granite Embankment and HC-004 Architectural Columns Portrait. Generate one coherent photograph based on one hero composition only. Do not combine several hero compositions in one image. Do not create a collage, grid, contact sheet or multi-panel image.";

const SP008_SCENE =
  "Scene: real Saint Petersburg after rain in autumn, atmospheric city streets and architectural details: granite embankments, canals, historical facades, massive stone columns, exterior cafe facade, old wooden doors, arches, wet asphalt, wet granite, puddles and subtle reflections. Overcast northern day, dense gray clouds, humid air and recently finished rain. Saint Isaac's Cathedral, domes and recognizable architectural dominants are not required; if they appear at all, they must be only a very distant blurred detail in at most one image, preferably not used. Do not use a park as the main location, no summer greenery, no shopping mall, no modern office background and no tourist postcard composition.";

const SP008_PHOTOGRAPHIC_LANGUAGE =
  "Photographic language: atmospheric autumn Petersburg editorial walk, cinematic, northern, restrained, quiet luxury, Scandinavian-French minimal city style and calm confidence. The subject should feel like a woman who lives in Petersburg and beautifully lives through her day while the photographer quietly accompanies her. Architecture, wet city, reflections, northern light and quiet confidence are the real heroes of the series. Not tourist photos, not postcards, not fashion clothing advertisements and not phone snapshots.";

const SP008_CAMERA_LANGUAGE =
  "Camera Language: respect the selected Petersburg Walk Hero Composition exactly. Use realistic city editorial photographer distance, natural perspective, architectural depth, wet-stone reflections, soft background blur and believable head-to-body proportions. Avoid selfie angle, phone snapshot look, tourist-photo framing, distorted limbs, oversized head and excessive close-up unless the Hero Composition asks for a medium-close portrait. HC-004 must be a vertical medium / three-quarter architectural portrait near columns and an old wooden door, face readable, not a distant full-body tourist shot.";

const SP008_REFERENCE_BOUNDARY =
  "Reference boundary: reference defines identity, facial geometry, age cues and natural body proportions. User Profile defines hair color, eye color, gender and body type. Series Appearance defines dark chocolate cropped suede bomber, milk or white long-sleeve top or T-shirt, white straight high-waisted jeans, brown leather belt, brown boots, small brown crossbody bag, minimalist jewelry, professional soft wave blowout, makeup and cool after-rain city color palette. Series Continuity defines the Petersburg after-rain walk, cold northern light, wet stone, canals, puddle reflections, historic architecture, photographer style and one-session feeling. Hero Composition defines shot size, composition intent, primary interaction, subject position, hands, gaze, emotion, scene-specific props, locked elements, allowed variations and forbidden substitutions. Do not copy clothing, hairstyle, makeup, pose, lighting, exact framing or exact composition from reference.";

const SP008_SINGLE_SCENE_PACKAGE = [
  "ID: SP-008.",
  "Name: Petersburg Walk.",
  "Category / JTBD: Atmospheric City Lifestyle / Petersburg Editorial Walk. Create one premium lifestyle photograph in an autumn Saint Petersburg after-rain setting.",
  "Package Promise: Atmospheric autumn editorial walk through Saint Petersburg after rain. Cool northern daylight, wet granite, canals, puddle reflections, old doors, columns, cafe facades, historic streets, quiet confidence and cinematic city mood. The photos should feel like one natural expensive day in the city, not casual phone snapshots, tourist landmark photos or fashion clothing ads.",
  SP008_SERIES_APPEARANCE,
  SP008_SERIES_CONTINUITY,
  SP008_HERO_LIBRARY,
  "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine outfit, hairstyle, makeup, accessories, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
  SP008_SCENE,
  SP008_PHOTOGRAPHIC_LANGUAGE,
  SP008_CAMERA_LANGUAGE,
  "Weather: after rain, wet granite, wet asphalt, puddles, reflections, dense gray clouds and humid northern air. No golden hour, no bright sunny day and no postcard sunbeam with a cathedral.",
  "Lighting and camera: most of the series uses soft diffused northern daylight, gentle contrast, wet-air atmosphere, natural reflections in puddles and wet asphalt, no direct sun, no golden hour, no flat phone-photo lighting, no beauty flash and natural skin texture.",
  "Quality: expensive atmospheric city editorial photoshoot, high realism, natural skin, calm confident emotion, professional photographer work, historic urban atmosphere, no AI image look.",
  "Must have: Saint Petersburg after-rain autumn mood, granite embankments or canals or old doors or columns or exterior cafe facade or wet street, dark chocolate cropped suede bomber, milk or white long-sleeve top or T-shirt, white straight high-waisted jeans, brown leather belt, brown boots, small brown leather crossbody bag, frame-specific structured hairstyle, hair color from User Profile, cool moody palette, puddle reflections, face readable.",
  "Must not: cathedral as required subject, dome, Saint Isaac's Cathedral, more than one distant blurred landmark detail, tourist photo, postcard composition, turtleneck, camel coat, beige coat, long coat, sportswear, random clothing, phone snapshot look, excessive fashion posing, symmetrical posing, complex body plasticity, hands near face, strong wind covering face, bright sunny day, summer greenery, warm golden hour, copied reference clothing, copied reference hairstyle, copied reference pose or exact crop.",
  SP008_REFERENCE_BOUNDARY,
].join(" ");

const SP009_SERIES_APPEARANCE = [
  "Series Appearance: this package-level Appearance Lock is inherited by every Hero Composition in SP-009. It defines one shared luxury minimal editorial studio look for the whole photoshoot and must not change identity.",
  "Outfit: the exact same black oversized blazer, black top and black loose trousers across all four images. Bare feet when feet are visible. Quiet luxury editorial styling, not corporate styling, not business portrait styling and not theatrical.",
  "Hair continuity: natural hair color, length and texture remain stable. Hairstyle arrangement, parting and hair placement are frame-specific and come only from the selected structured Hero Composition; keep every selected style polished and editorial.",
  "Makeup: the same natural refined makeup across all four images, realistic skin texture, calm editorial elegance, no heavy glam and no excessive retouching.",
  "Furniture: use only modern minimal luxury furniture required by Hero Composition: low matte cube, dark leather sofa or large light designer sofa with rounded soft forms. Do not use director chair, office chair, bar stool, classic wooden chair or decorative furniture.",
  "Background: the same dark textured studio wall across the whole photoshoot, with soft window gradients and subtle light falloff. No decor, no vases, no flowers and no interior objects beyond the minimal furniture required by the selected Hero Composition.",
  "Color palette: graphite, charcoal, black, soft gray, cool shadows and restrained luxury neutrals. Matte processing, cinematic depth, no warm yellow cast.",
  "Facial expression direction: no broad smiles. The expression language is quiet confidence, calm authority, editorial elegance, subtle softness and The Ruler archetype. The subject looks expensive, composed and self-possessed, not emotionally demonstrative.",
  "Outfit, makeup, background, cool color grading and approved minimal luxury furniture are locked elements for the entire photoshoot. Appearance Layer must not copy reference clothing.",
].join(" ");

const SP009_SERIES_CONTINUITY = [
  "Series Continuity: all 4 images must look like they were taken during the same luxury minimal editorial studio session, by one photographer, with the same large soft side window light, same dark textured wall, same black outfit, stable natural hair color length and texture, same makeup, same cool color grading and the same quiet luxury Ruler mood.",
  "The four images should feel photographed during one continuous premium magazine editorial for Kinfolk, Vogue Living or a contemporary fashion/interior editorial, not like four unrelated generations and not like a corporate portrait session.",
].join(" ");

const SP009_HERO_LIBRARY =
  "Hero Composition Library: SP-009 contains HC-001 Editorial Portrait, HC-002 Editorial Cube, HC-003 Sofa Authority Portrait and HC-004 Ruler Sofa Editorial. Generate one coherent photograph based on one hero composition only. Do not combine several hero compositions in one image. Do not create a collage, grid, contact sheet or multi-panel image.";

const SP009_SCENE =
  "Scene: modern minimal dark artistic studio, matte textured graphite wall, soft window gradients, light falloff, subtle light patches on the background, cool shadows, no decor, no vases, no flowers, no office objects, approved minimal luxury furniture only when required by Hero Composition. Editorial atmosphere: quiet luxury, The Ruler archetype, calm authority, natural elegance and cinematic stillness.";

const SP009_PHOTOGRAPHIC_LANGUAGE =
  "Photographic language: contemporary luxury fashion and interior editorial photography at the level of Kinfolk, Vogue Living or a premium modern fashion editorial. The person should not look like they are formally posing; they should look caught in a beautiful composed moment between directed frames. Use restrained asymmetry, natural hand placement, calm authority, matte cool grading, soft depth, real photographic restraint and timeless elegance. Not corporate, not business headshot, not school portrait, not passport photo, not catalog imagery and not runway posing.";

const SP009_CAMERA_LANGUAGE =
  "Camera Language: respect the selected Minimal Black Studio Hero Composition exactly. Use realistic luxury editorial portrait photographer distance, natural perspective, believable head-to-body proportions and restrained studio framing. Avoid selfie angle, distorted limbs, oversized head, excessive close-up unless the Hero Composition asks for it, warm yellow cast, harsh contrast, beauty flash and dramatic fashion framing.";

const SP009_REFERENCE_BOUNDARY =
  "Reference boundary: reference defines identity, facial geometry, age cues and natural body proportions. User Profile defines hair color, eye color, gender and body type. Series Appearance defines black oversized blazer, black top, black loose trousers, bare feet if visible, professional salon blowout hairstyle, makeup, approved minimal luxury furniture, background and color palette. Series Continuity defines studio, photographer, lighting and one-session feeling. Hero Composition defines shot size, composition intent, primary interaction, subject position, hands, gaze, emotion, scene-specific props, locked elements, allowed variations and forbidden substitutions. Do not copy clothing, hairstyle, makeup, pose, lighting, exact framing or exact composition from reference.";

const SP009_SINGLE_SCENE_PACKAGE = [
  "ID: SP-009.",
  "Name: Minimal Black Studio.",
  "Category / JTBD: Luxury Minimal Editorial / Quiet Authority Studio Portraits. Create one modern premium editorial photograph in a dark artistic studio.",
  "Package Promise: Minimal premium editorial session in a modern studio. Quiet luxury, The Ruler archetype, calm authority, timeless elegance and cinematic stillness. The photos should look like a real premium magazine editorial, not a corporate photoshoot.",
  SP009_SERIES_APPEARANCE,
  SP009_SERIES_CONTINUITY,
  SP009_HERO_LIBRARY,
  "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine outfit, hairstyle, makeup, furniture, background, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
  SP009_SCENE,
  SP009_PHOTOGRAPHIC_LANGUAGE,
  SP009_CAMERA_LANGUAGE,
  "Lighting and camera: signature large soft side light, directed window-light feeling, soft window gradients, soft shadows, subtle light patches on the dark textured background, gentle falloff, depth, volume, cool color temperature, subtle highlights on hair, soft highlights on blazer fabric, expensive editorial look, matte finish, no flat studio lighting and no beauty flash.",
  "Body Safety: all poses must be physiologically natural. Avoid extra fingers, missing fingers, deformed hands, unnatural foot position, limb intersections, excessive wrist bending, excessive neck curve, complex fashion poses and body distortions. Simple natural body positions have priority over visual effect.",
  "Quality: real premium luxury minimal editorial studio session, high realism, natural skin, professional photographer work, authority, quiet luxury mood, no AI image look, no corporate portrait look.",
  "Must have: black oversized blazer, black top, black loose trousers, bare feet when visible, frame-specific structured hairstyle, natural makeup, dark textured studio wall, cool graphite charcoal black palette, large soft side light, soft window gradients, light patches on background, matte cinematic processing, same Series Appearance.",
  "Must not: changed outfit, changed hairstyle, changed makeup, broad smile, corporate portrait, school portrait, passport photo, business headshot, director chair, office chair, bar stool, classic wooden chair, decorative furniture, decor, vases, flowers, interior objects, warm yellow cast, symmetrical official posing, runway posing, overacting, casual home pose, messy hairstyle, complex body plasticity, excessive torso curve, theatrical expression, flat studio lighting, harsh lighting contrast, beauty flash, plastic skin, copied reference clothing, copied reference hairstyle, copied reference makeup, copied reference pose or exact crop.",
  SP009_REFERENCE_BOUNDARY,
].join(" ");const SP010_SERIES_APPEARANCE = [
  "Series Appearance: this package-level Appearance Lock is inherited by every Hero Composition in SP-010. It defines one shared modern Russian editorial designer look for the whole photoshoot and must not change identity.",
  "Dress: the exact same white textured designer dress with long voluminous sleeves across all four images. Soft premium fabric, elegant silhouette, modern designer editorial dress, not folk costume, not sarafan, not historical reconstruction.",
  "Headpiece: the exact same compact modern red kokoshnik-inspired headband across all four images. It must look like a luxury designer accessory, not a hat, not a beret, not a crown, not a tiara and not a theatrical kokoshnik. It sits close to the head, follows the natural head shape, has no high structure, no wide silhouette and no excessive ornament.",
  "Jewelry: the exact same thin red necklace with small pendant and the same small pearl earrings across all four images.",
  "Hair continuity: natural hair color, length and texture remain stable. Hairstyle arrangement, parting and hair placement are frame-specific and come only from the selected structured Hero Composition; the compact headpiece must remain correctly fitted and visible.",
  "Makeup: the same natural refined makeup across all four images: natural skin, soft blush, deep crimson or red lipstick, realistic skin texture, no heavy glam, no theatrical makeup and no excessive retouching.",
  "Color palette: deep navy, midnight blue, charcoal, warm ivory and deep crimson accents. Use darker cool backgrounds to strengthen the white dress and red details. Avoid warm beige dominance and avoid extra bright accent colors.",
  "All listed appearance elements are locked for the entire photoshoot: dress, compact kokoshnik headband, makeup, earrings and necklace. Appearance Layer must not copy reference clothing.",
].join(" ");

const SP010_SERIES_CONTINUITY = [
  "Series Continuity: all 4 images must look like they were taken during the same premium contemporary fine-art editorial session, by one photographer, with one artistic concept, one lighting setup, one visual language, one deep cool color palette and one museum-inspired editorial mood.",
  "The four images should feel like one modern Russian editorial series: quiet luxury, intellectual portraiture, minimal cultural references, deep contrast, calm confidence and timeless artistic beauty. Not folklore, not rustic, not a folk festival, not vintage countryside mood and not four unrelated generations.",
].join(" ");

const SP010_HERO_LIBRARY =
  "Hero Composition Library: SP-010 contains HC-001 Hero Close Portrait, HC-002 Standing Three-quarter Portrait, HC-003 Chair Portrait with Red Apple and HC-004 Low Podium Editorial Portrait. Generate one coherent photograph based on one hero composition only. Do not combine several hero compositions in one image. Do not create a collage, grid, contact sheet or multi-panel image.";

const SP010_SCENE =
  "Scene: modern Russian fine-art editorial studio with minimal artistic backgrounds. Prefer deep navy textured wall, midnight blue matte fabric, charcoal architectural interior, dark linen or artistic plaster. Use cool dark matte textures that support the white dress and crimson details. Avoid red wall ornament, large folk patterns, decorative folklore elements, rustic atmosphere, countryside mood, theatrical staging or literal Russian motifs.";

const SP010_PHOTOGRAPHIC_LANGUAGE =
  "Photographic language: contemporary authorial fashion photography, fine-art portrait, luxury editorial, museum-inspired quiet luxury and timeless modern Russian aesthetics. Minimal cultural references only. Use deeper contrast, intellectual restraint, artistic depth and calm confidence. The result should feel like a contemporary fashion photographer's personal project, not a family studio session, not a romantic fairytale and not a rustic folk image.";

const SP010_CAMERA_LANGUAGE =
  "Camera Language: respect the selected Russian Editorial Hero Composition exactly. Use realistic editorial photographer distance, natural perspective, believable head-to-body proportions and refined fine-art framing. Vary the four compositions clearly: close portrait, standing three-quarter portrait, seated chair portrait with one apple, and low podium or floor editorial portrait. Avoid selfie angle, distorted limbs, oversized head, excessive close-up unless the Hero Composition asks for a close portrait, theatrical framing and fashion-campaign exaggeration.";

const SP010_REFERENCE_BOUNDARY =
  "Reference boundary: reference defines identity, facial geometry, age cues and natural body proportions. User Profile defines hair color, eye color, gender and body type. Series Appearance defines dress, compact kokoshnik-inspired headband, necklace, earrings, hairstyle, makeup and color palette. Series Continuity defines studio, dark cool background, artistic light, visual language and one-session feeling. Hero Composition defines shot size, composition intent, primary interaction, subject position, hands, gaze, emotion, scene-specific props, locked elements, allowed variations and forbidden substitutions. Do not copy clothing, hairstyle, makeup, pose, lighting, exact framing or exact composition from reference.";

const SP010_SINGLE_SCENE_PACKAGE = [
  "ID: SP-010.",
  "Name: Russian Editorial.",
  "Category / JTBD: Fine Art Editorial / Modern Cultural Portraits. Create one contemporary premium editorial photograph inspired by Russian aesthetics.",
  "Package Promise: Modern authorial editorial photoshoot inspired by Russian aesthetics. Not folklore, not a historical costume, not a theatrical photoshoot. The result should feel like a fine-art portrait project by a contemporary fashion photographer: museum-inspired, quiet luxury, minimalistic, artistic and timeless.",
  SP010_SERIES_APPEARANCE,
  SP010_SERIES_CONTINUITY,
  SP010_HERO_LIBRARY,
  "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine dress, headpiece, jewelry, hairstyle, makeup, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
  SP010_SCENE,
  SP010_PHOTOGRAPHIC_LANGUAGE,
  SP010_CAMERA_LANGUAGE,
  "Props: use at most one prop per image. Allowed props are one red apple, one red textile bird or one red ribbon. Prefer no prop except when the selected Hero Composition explicitly requires it. Never combine multiple props in the same image.",
  "Lighting and camera: directional soft studio light, deep shadows, higher local contrast, sculptural volume, artistic depth, soft matte highlights, realistic skin texture, no beauty flash, no flat lighting and no evenly bright family-studio look. Lighting should feel like expensive fine-art editorial photography.",
  "Quality: premium modern fine-art editorial photoshoot, high realism, natural skin, professional photographer work, intellectual minimal mood, no AI image look, no theatrical costume look.",
  "Must have: white textured designer dress with long voluminous sleeves, compact modern red kokoshnik-inspired headband, thin red necklace with small pendant, small pearl earrings, red lipstick, frame-specific structured hairstyle, deep navy midnight blue charcoal warm ivory and crimson palette, modern minimal Russian-inspired fine-art editorial feeling.",
  "Must not: changed dress, changed headpiece, changed jewelry, changed hairstyle, changed makeup, historical costume, theatrical Russian folk costume, oversized kokoshnik, large traditional kokoshnik, crown, tiara, sarafan, folk festival, matryoshka, samovar, excessive folklore, rustic atmosphere, vintage countryside mood, red ornament wall, large folk patterns, overloaded props, multiple props at once, fashion poses, hands near face, exaggerated expressions, excessive retouching, plastic skin, copied reference clothing, copied reference hairstyle, copied reference makeup, copied reference pose or exact crop.",
  SP010_REFERENCE_BOUNDARY,
].join(" ");
type PackageLayerExtensionPoints = Readonly<{
  seriesAppearance?: string;
  seriesContinuity?: string;
  cameraLanguage?: string;
}>;

type HeroComposition = Readonly<{
  id: string;
  name: string;
  shotSize: string;
  compositionIntent: string;
  primaryInteraction: string;
  subjectPosition: string;
  hands: string;
  gaze: string;
  emotion: string;
  sceneSpecificProps: string;
  lockedElements: string;
  allowedVariations: string;
  forbiddenSubstitutions: string;
  promptText: string;
}>;

const PACKAGE_LAYER_EXTENSION_POINTS: PackageLayerExtensionPoints = {};

function renderHeroComposition(packageId: string, hero: HeroComposition): string {
  return `${CURRENT_HERO_COMPOSITION_MARKER} ${hero.promptText} ${renderHeroCompositionContract(packageId, hero.id)}`;
}
const SCENE_PACKAGES: Record<string, string> = {
  "sp-005-sup-editorial": SP005_SINGLE_SCENE_PACKAGE,
  sup: SP005_SINGLE_SCENE_PACKAGE,
  "sp-006-studio-elegance": SP006_SINGLE_SCENE_PACKAGE,
  "studio-elegance": SP006_SINGLE_SCENE_PACKAGE,
  "sp-007-lakeside-walk": SP007_SINGLE_SCENE_PACKAGE,
  "lakeside-walk": SP007_SINGLE_SCENE_PACKAGE,
  "sp-008-casual-park": SP008_SINGLE_SCENE_PACKAGE,
  "casual-park": SP008_SINGLE_SCENE_PACKAGE,
  "sp-009-minimal-black-studio": SP009_SINGLE_SCENE_PACKAGE,
  "minimal-black-studio": SP009_SINGLE_SCENE_PACKAGE,
  "sp-010-russian-editorial": SP010_SINGLE_SCENE_PACKAGE,
  "russian-editorial": SP010_SINGLE_SCENE_PACKAGE,
  "sp-001-field-flowers": [
    "Scene Package SP-001 Field Flowers / Polevye travy.",
    "Outdoor summer meadow near a rustic wooden fence, soft natural daylight, warm grass and wildflowers, relaxed premium lifestyle photoshoot.",
    "Cream midi dress with a light sage cardigan, realistic fabric folds, small wildflower bouquet, natural elegant posture, vertical 2:3 composition.",
    "Scene styling: polished but believable hair styling, refined natural makeup, no glasses unless explicitly requested.",
    "Gaze and expression: natural direct eye contact or slightly off-camera gaze when it fits the scene; calm warm presence, not mechanical posing.",
    "Premium/editorial means professional photography quality, not fashion-model transformation. Avoid fashion-model body reshaping, excessive slimming, glossy retouching, artificial perfection or generic luxury-advertising look.",
  ].join(" "),
  "sp-002-mugshot-rebel": [
    "Scene Package SP-002 Mugshot Rebel / Magshot: hooligan.",
    "Stylized editorial portrait inspired by a clean cinematic mugshot setup, neutral wall, controlled studio flash, confident rebellious mood without criminal realism.",
    "Modern dark jacket or simple structured top, minimal accessories, relaxed shoulders, frontal or slight three-quarter pose, vertical 2:3 composition.",
    "Scene styling: slightly undone but intentional hair styling, clean natural makeup with subtle edge, no copied reference clothes or casual selfie styling.",
    "Gaze and expression: direct confident camera contact when appropriate, calm defiant presence, not an exaggerated grimace.",
    "Premium/editorial means professional photography quality, not fashion-model transformation. Keep real body proportions and natural face.",
  ].join(" "),
  "sp-003-white-chair-couture": [
    "Scene Package SP-003 White Chair Couture / Beloe kreslo couture.",
    "Elegant studio editorial scene with a simple white chair, clean bright studio background, refined high-end portrait lighting, calm couture mood.",
    "Structured elegant outfit, clean lines, seated or leaning pose around the white chair, hands relaxed and believable, vertical 2:3 composition.",
    "Scene styling: polished hair styling, refined natural makeup, professional photoshoot styling, no glasses unless explicitly requested.",
    "Gaze and expression: poised natural presence, camera contact or slight off-camera gaze depending on composition, not blank or doll-like.",
    "Premium/editorial means professional photography quality, not fashion-model transformation. Avoid excessive slimming, glossy retouching, artificial perfection or generic luxury-advertising look.",
  ].join(" "),
  business:
    "Scene Package Business Editorial. Modern office business editorial portrait, clean contemporary office interior, refined professional outfit, relaxed confident posture, natural direct eye contact when it fits the portrait, soft window light mixed with subtle office ambience, vertical 2:3 composition. Moment: the subject has just finished explaining an important idea and is calmly waiting for the other person's reaction. Confidence comes from understanding the topic, not from posing. Premium/editorial means professional photography quality, not fashion-model transformation.",
  career:
    "Scene Package Business Editorial. Modern office business editorial portrait, clean contemporary office interior, refined professional outfit, relaxed confident posture, natural direct eye contact when it fits the portrait, soft window light mixed with subtle office ambience, vertical 2:3 composition. Moment: the subject has just finished explaining an important idea and is calmly waiting for the other person's reaction. Confidence comes from understanding the topic, not from posing. Premium/editorial means professional photography quality, not fashion-model transformation.",
  dating: [
    "ID: SP-004.",
    "Name: Cozy Cafe Editorial.",
    "Category / JTBD: Lifestyle / Personal Brand / Social Media. Create one modern lifestyle photograph for social media, personal brand and expert positioning.",
    "Purpose: a contemporary commercial lifestyle photograph in a cozy urban cafe. The result should feel warm, intelligent, approachable and professionally photographed.",
    SP004_SERIES_APPEARANCE,
    SP004_SERIES_CONTINUITY,
    SP004_HERO_LIBRARY,
    "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine outfit, hairstyle, makeup, accessories, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
    "HC-001: id: HC-001. name: Hero Close Portrait. shot_size: Close Portrait. composition_intent: Hero Portrait. role: main selling portrait of the series. primary_interaction: quiet cafe presence with coffee only as a secondary detail, not the main subject. subject_position: seated on a visible cafe chair at the cafe table with face and upper shoulders framed cleanly; do not show much table. hands: hands may be absent or only minimally suggested; hands, cup and table must remain secondary. gaze: prefer direct eye contact, soft direct presence, eyes as the main focus. emotion: calm confidence / soft direct presence. scene_specific_props: minimal cafe background and optional subtle coffee detail only if it stays secondary. locked_elements: the closest frame in the series, face and eyes are the main focus, minimal background, no lifestyle pose, no table-heavy composition, no interaction-led image. allowed_variations: subtle head angle, calm confident gaze, soft direct presence, minimal shoulder angle. forbidden_substitutions: no medium lifestyle frame, no waist-up crop, no action-focused image, no dessert focus, no repeated HC-002 or HC-003 composition, no outfit or hairstyle description inside HC.",
    "HC-002: id: HC-002. name: Interaction Portrait. shot_size: Medium Portrait. composition_intent: Interaction Portrait. role: living action frame with coffee, spoon or dessert. primary_interaction: visible interaction with cup, spoon or dessert; the action is more important than portrait beauty. subject_position: seated on a visible cafe chair at the table, framed from chest to waist, camera noticeably farther than HC-001, torso naturally angled. hands: hands must be clearly visible and actively interacting with the cup, spoon, dessert or table. gaze: look at the dessert, cup, spoon or slightly aside; do not repeat HC-001 direct eye contact. emotion: light curiosity / small amused smile / enjoying the moment. scene_specific_props: dessert or pastry, spoon, coffee cup and visible table. locked_elements: Medium Portrait, hands and object interaction must be readable, face is not the only center of the image, action leads the composition. allowed_variations: spoon position, dessert position, cup position, small amused smile, gaze toward object, natural hand movement. forbidden_substitutions: no close hero portrait, no face-dominant crop, no repeated direct gaze from HC-001, no stiff hands, no food advertisement look, no outfit or hairstyle description inside HC.",
    "HC-003: id: HC-003. name: Lifestyle Editorial. shot_size: Three Quarter Portrait. composition_intent: Lifestyle Editorial. role: frame about pose, outfit presence and cafe atmosphere, not a portrait. primary_interaction: the person belongs naturally inside the cafe space, with posture and environment carrying the image. subject_position: seated or naturally positioned at the cafe table, framed to hip or knees, with torso, hands, part of legs, table, chair and interior visible. hands: hands must be visible and placed differently from HC-001 and HC-002, naturally on the table, near a cup, on the chair or relaxed as part of the pose. gaze: may look at the camera, but not with the same facial expression or head angle as HC-001. emotion: warm natural smile / relaxed lifestyle confidence. scene_specific_props: table, chair, cafe interior, cup or small table object, visible surrounding space. locked_elements: not a portrait, more space around the person, visible pose and cafe environment, person as part of the cafe scene, distinct body pose from HC-001 and HC-002. allowed_variations: body angle, seated pose, hand placement, warm smile, conversational gaze, visible table and interior context. forbidden_substitutions: no close portrait crop, no head-and-shoulders portrait, no repeated HC-001 or HC-002 framing, no face-only image, no outfit or hairstyle description inside HC.",
    "HC-004: id: HC-004. name: Environmental Portrait. shot_size: Wide Portrait. composition_intent: Environmental Editorial. role: the widest atmospheric cafe image in the set. primary_interaction: quiet enjoyment of the cafe atmosphere near a window, table or cafe interior. subject_position: knee-length, almost full body or controlled wide frame; person is integrated into the cafe space but not so distant that identity is lost. hands: may hold a cup, rest on the table, hold it with both hands, or relax naturally in the scene. gaze: prefer looking away toward the window, cup, street or cafe space. emotion: thoughtful / calm looking away / enjoying the atmosphere. scene_specific_props: window, cafe table, coffee or tea cup, visible cafe interior and warm atmosphere. locked_elements: widest frame of the set, interior is as important as the person, prefer knee-length or almost full body over extreme full body if the face would lose recognizability, preserve maximum possible facial detail and identity clarity. allowed_variations: cup position, hand position, seated on a visible cafe chair or standing body angle, window light, calm side gaze, cafe atmosphere. forbidden_substitutions: no close portrait, no medium portrait, no oversized head, no faceless distant subject, no identity loss, no outfit or hairstyle description inside HC.",
    SP004_SCENE,
    "Pose and gaze: follow the selected Hero Composition. Use relaxed natural lifestyle posture, not static portrait posing. Shoulders, torso and hands should look natural and balanced. Preserve the selected Shot Size and Hero Composition. Avoid selfie feeling, fashion-model posing, passport-like staring unless a specific HC asks for eye contact, and avoid artificial gestures.",
    "Moment and expression: expression should fit the selected Hero Composition and feel like a real cafe moment, not an instruction. Allow gentle variation between generations: calm neutral, gentle smile, warm smile, thoughtful look, quiet amusement, soft laugh, direct conversational eye contact or candid glance away depending on the selected HC. Avoid blank expression, forced smile, generic model face or copied reference expression.",
    SP004_PHOTOGRAPHIC_LANGUAGE,
    SP004_CAMERA_LANGUAGE,
    "Lighting and camera: soft natural daylight, side light from cafe window or open shade, warm tone, soft contrast, no harsh flash, no dramatic artificial light. Shallow depth of field, subject sharp, background softly blurred while cafe atmosphere remains readable.",
    "Allowed variations: one selected hero composition may vary in gaze, cup position, dessert position, hand placement, torso angle, soft smile, thoughtful look, calm neutral expression, framing within the specified composition and cafe lighting. Variations must stay inside one coherent Hero Composition and must inherit Series Appearance.",
    "Quality: expensive commercial lifestyle shoot, high realism, natural skin, professional photographer work, no AI portrait look.",
    "Must have: cozy cafe, coffee cup or tea cup, natural relaxed posture, soft cafe atmosphere, warm natural light, elegant timeless look, realistic head-to-body proportions, one coherent Hero Composition, same Series Appearance.",
    "Must not: collage, multi-panel image, contact sheet, grid layout, oversized head, narrow or cropped shoulders, stiff symmetrical pose, hunched posture, selfie angle, passport-like portrait unless explicitly avoided by HC, overly posed model look, busy messy background, harsh artificial light, heavy makeup, distracting props, plastic skin, changed outfit, changed hairstyle, changed makeup, changed accessories, copied reference pose or exact crop.",
    SP004_REFERENCE_BOUNDARY,
  ].join(" "),  social:
    "Scene Package Urban Street. Modern city street lifestyle portrait, realistic everyday outfit, relaxed natural movement, professional composition, natural street light, gaze chosen naturally for the scene, vertical 2:3 composition.",
  bw:
    "Scene Package Black and White Editorial. Black and white contemporary editorial portrait, clean studio or minimal interior background, elegant simple outfit, soft flattering directional light, deep natural blacks and clean highlights, refined but realistic mood, vertical 2:3 composition. Avoid gloomy, funeral, harsh aging or flat gray portrait look.",
  neon:
    "Scene Package Neon Art. Creative evening portrait with controlled colored light, modern interior or city evening background, realistic outfit, cinematic but believable lighting, relaxed confident posture, natural face, vertical 2:3 composition.",
};

const IDENTITY_V2 =
  [
    IDENTITY_REFERENCE_POLICY,
    "Use the reference image only to understand the person's facial identity.",
    "Create a new natural photograph of the same person.",
    "Preserve recognizable facial identity, but allow a natural new expression and new photographic lighting.",
    "Identity Lock / Identity Priority: identity is not expression.",
    "Preserve the same person across all images.",
    "The person must remain recognizable regardless of camera distance, shot size, pose, viewing angle, facial expression, gaze direction or environment.",
    "Do not reinterpret the face on wide shots.",
    "Do not replace the face with a generic attractive model face.",
    "Preserve stable facial identity: face shape, facial proportions, eye shape, distance between eyes, nose shape, lips, eyebrows, forehead, jawline, cheekbones, unique facial characteristics and real age appearance.",
    "Expression may change according to Hero Composition: smile, gaze direction, eyelids, eyebrow position, mouth openness, facial muscle tension and emotion.",
    "Expression changes must not alter identity.",
    "On wide, full body and environmental shots, the face must remain the same person photographed from farther away, not a new similar-looking person.",
    "Do not copy the exact expression from the reference.",
    "Do not copy the exact gaze direction.",
    "Do not copy the exact head angle.",
    "Do not copy lighting artifacts from the reference.",
    "Do not preserve glasses unless explicitly requested.",
    "Do not preserve glare or reflections from glasses.",
    "Do not make the face look pasted from the reference.",
    "The result must feel like a new photoshoot image, not a copy of the uploaded photo.",
  ].join(" ");

const AGE_V1 =
  [
    "Preserve real age appearance from reference.",
    "Preserve natural adult skin texture without excessive smoothing.",
    "Do not describe age mainly as a numeric phrase.",
    "Do not make the person younger.",
    "Do not make the person older.",
    "Do not exaggerate age markers.",
    "Do not add gray hair unless visible in reference.",
    "Do not add stereotypical age signs.",
  ].join(" ");

const REALISM_V1 =
  [
    "Realistic natural photograph.",
    "Documentary realism with high-quality camera look.",
    "Natural skin texture.",
    "Natural adult facial character.",
    "Realistic body proportions.",
    "No plastic skin, doll-like face, pasted face look, CGI or illustration.",
    "No excessive makeup unless requested by the scene.",
    "No slimming, unrealistic waist, elongated legs or artificial fashion model proportions.",
  ].join(" ");

const STYLE_MVP =
  [
    "Professional photoshoot quality, not fashion-model transformation.",
    "Premium/editorial should mean professional photography quality, not fashion-model transformation.",
    "Keep the same real body proportions, natural face, realistic age cues and personal appearance.",
    "Avoid fashion-model body reshaping, excessive slimming, glossy retouching, artificial perfection or generic luxury-advertising look.",
  ].join(" ");


interface ReplicateModelResponse {
  latest_version?: {
    id?: string;
  };
}

interface ReplicatePredictionResponse {
  id: string;
  status: string;
  output?: unknown;
  error?: string | null;
}

interface MvpGenerationOptions {
  scenePrompt?: string;
  referenceCount?: number;
  waitForCompletion?: boolean;
  userId?: string;
}

interface MvpGenerationResult {
  predictionId: string;
  resultImages: string[];
}

function getOutputUrls(output: unknown): string[] {
  if (typeof output === "string") {
    return [output];
  }

  if (Array.isArray(output)) {
    return output
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "url" in item && typeof item.url === "string") {
          return item.url;
        }
        return null;
      })
      .filter((value): value is string => Boolean(value));
  }

  if (output && typeof output === "object" && "url" in output && typeof output.url === "string") {
    return [output.url];
  }

  return [];
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

interface IdentityReferenceCrop {
  key: string;
  width: number;
  height: number;
}

async function createIdentityReferenceCrop(
  photoshootId: string,
  key: string,
  index: number,
): Promise<IdentityReferenceCrop> {
  const object = await s3Client.send(
    new GetObjectCommand({
      Bucket: getS3BucketName(),
      Key: key,
    }),
  );

  const sourceBuffer = await streamToBuffer(object.Body);
  const { data: cropBuffer, info } = await sharp(sourceBuffer)
    .rotate()
    .resize(768, 896, { fit: "cover", position: "north" })
    .jpeg({ quality: 95 })
    .toBuffer({ resolveWithObject: true });

  const cropKey = `photoshoots/generations/${photoshootId}/mvp_references/identity_${index}_${Date.now()}.jpg`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: getS3BucketName(),
      Key: cropKey,
      Body: cropBuffer,
      ContentType: "image/jpeg",
    }),
  );

  return { key: cropKey, width: info.width, height: info.height };
}

async function createSignedReadUrl(key: string): Promise<string> {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: getS3BucketName(),
      Key: key,
    }),
    { expiresIn: 3600 },
  );
}

async function saveGeneratedImage(photoshootId: string, url: string, index: number): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download generated image: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const key = `photoshoots/generations/${photoshootId}/mvp_gpt_image2/result_${Date.now()}_${index}.jpg`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: getS3BucketName(),
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    }),
  );

  return key;
}

async function getLatestModelVersion(): Promise<string> {
  const response = await fetch(`https://api.replicate.com/v1/models/${MODEL_ID}`, {
    headers: {
      Authorization: `Bearer ${getReplicateApiToken()}`,
    },
  });

  const json = (await response.json().catch(() => ({}))) as ReplicateModelResponse;

  if (!response.ok || !json.latest_version?.id) {
    throw new Error(`Could not load latest Replicate version for ${MODEL_ID}`);
  }

  return json.latest_version.id;
}

function getPredictionRetryDelayMs(error: unknown): number | null {
  const status =
    typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
      ? error.status
      : typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof error.response === "object" &&
          error.response !== null &&
          "status" in error.response &&
          typeof error.response.status === "number"
        ? error.response.status
        : null;
  const message = error instanceof Error ? error.message : String(error);

  if (status !== 429 && !message.includes("429")) {
    return null;
  }

  const retryAfterMatch = message.match(/retry_after["']?\s*:?\s*(\d+)/i);
  const resetMatch = message.match(/resets in ~?(\d+)s/i);
  const seconds = Number(retryAfterMatch?.[1] || resetMatch?.[1] || 10);

  return Math.max(1, seconds + 1) * 1000;
}

async function createPredictionWithRateLimit(
  replicate: Replicate,
  input: Parameters<Replicate["predictions"]["create"]>[0],
): Promise<ReplicatePredictionResponse> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return (await replicate.predictions.create(input)) as ReplicatePredictionResponse;
    } catch (error) {
      const retryDelayMs = getPredictionRetryDelayMs(error);

      if (retryDelayMs === null || attempt === 4) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw new Error("Could not create Replicate prediction after retries.");
}

async function waitForPrediction(replicate: Replicate, predictionId: string): Promise<ReplicatePredictionResponse> {
  for (;;) {
    const prediction = (await replicate.predictions.get(predictionId)) as ReplicatePredictionResponse;

    if (["succeeded", "failed", "canceled"].includes(prediction.status)) {
      return prediction;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

function getScenePackage(photoshoot: Photoshoot, override?: string): string {
  if (override) return override;

  return SCENE_PACKAGES[photoshoot.style_id] ?? SCENE_PACKAGES[DEFAULT_SCENE_PACKAGE_ID];
}

function getHairColorLabel(value: string | null | undefined): string | null {
  const labels: Record<string, string> = {
    dark: "dark brown or brunette hair",
    blonde: "blonde hair",
    brown: "light brown or dark blonde hair",
    red: "red or copper hair",
  };

  return value ? labels[value] ?? value : null;
}

function getEyeColorLabel(value: string | null | undefined): string | null {
  const labels: Record<string, string> = {
    brown: "brown eyes",
    blue: "blue eyes",
    green: "green eyes",
    grey: "grey eyes",
  };

  return value ? labels[value] ?? value : null;
}

function getPersonaSnapshotRecord(photoshoot: Photoshoot): Record<string, unknown> {
  const snapshot = photoshoot.persona_snapshot;
  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? snapshot as Record<string, unknown>
    : {};
}

function getPersonaSnapshotString(photoshoot: Photoshoot, key: string): string | null {
  const value = getPersonaSnapshotRecord(photoshoot)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getPersonaSnapshotNumber(photoshoot: Photoshoot, key: string): number | null {
  const value = getPersonaSnapshotRecord(photoshoot)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildProfileAttributeLayer(photoshoot: Photoshoot): string {
  const hairColor = getHairColorLabel(photoshoot.hair_color);
  const eyeColor = getEyeColorLabel(
    getPersonaSnapshotString(photoshoot, "eyeColor") ?? photoshoot.eye_color,
  );

  return [
    "User-provided profile attributes:",
    hairColor
      ? `hair color: ${hairColor}. Preserve the user-provided hair color.`
      : "hair color: unknown. Preserve the natural hair color visible in the reference.",
    eyeColor
      ? `eye color: ${eyeColor}. Preserve the user-provided eye color.`
      : "eye color: unknown. Preserve the natural eye color visible in the reference.",
    "These attributes come from the questionnaire and should guide the new photograph without copying reference hairstyle, makeup, lighting or pose.",
  ].join("\n");
}

function getSp004HeroScenePackages(): string[] {
  const shared = [
    "ID: SP-004.",
    "Name: Cozy Cafe Editorial.",
    "Category / JTBD: Lifestyle / Personal Brand / Social Media. Create one modern lifestyle photograph for social media, personal brand and expert positioning.",
    "Purpose: a contemporary commercial lifestyle photograph in a cozy urban cafe. The result should feel warm, intelligent, approachable and professionally photographed.",
    SP004_SERIES_APPEARANCE,
    SP004_SERIES_CONTINUITY,
    SP004_HERO_LIBRARY,
    "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine outfit, hairstyle, makeup, accessories, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
    SP004_SCENE,
    SP004_PHOTOGRAPHIC_LANGUAGE,
    SP004_CAMERA_LANGUAGE,
    "Lighting and camera: soft natural daylight, side light from cafe window or open shade, warm tone, soft contrast, no harsh flash, no dramatic artificial light. Shallow depth of field, subject sharp, background softly blurred while cafe atmosphere remains readable.",
    "Quality: expensive commercial lifestyle shoot, high realism, natural skin, professional photographer work, no AI portrait look.",
    "Must not: collage, multi-panel image, contact sheet, grid layout, changed outfit, changed hairstyle, changed makeup, changed accessories, copied reference clothing, copied reference hairstyle, copied reference makeup, copied reference pose or exact crop.",
    SP004_REFERENCE_BOUNDARY,
  ].join(" ");

  const heroes: HeroComposition[] = [
    {
      id: "HC-001",
      name: "Hero Close Portrait",
      shotSize: "Close Portrait",
      compositionIntent: "Hero Portrait",
      primaryInteraction: "quiet cafe presence with coffee only as a secondary detail, not the main subject",
      subjectPosition: "seated on a visible cafe chair at the cafe table with face and upper shoulders framed cleanly; do not show much table",
      hands: "hands may be absent or only minimally suggested; hands, cup and table must remain secondary",
      gaze: "prefer direct eye contact, soft direct presence, eyes as the main focus",
      emotion: "calm confidence / soft direct presence",
      sceneSpecificProps: "minimal cafe background and optional subtle coffee detail only if it stays secondary",
      lockedElements: "the closest frame in the series, face and eyes are the main focus, minimal background, no lifestyle pose, no table-heavy composition, no interaction-led image",
      allowedVariations: "subtle head angle, calm confident gaze, soft direct presence, minimal shoulder angle",
      forbiddenSubstitutions: "no medium lifestyle frame, no waist-up crop, no action-focused image, no dessert focus, no repeated HC-002 or HC-003 composition, no outfit or hairstyle description inside HC",
      promptText:
        "HC-001: id: HC-001. name: Hero Close Portrait. shot_size: Close Portrait. composition_intent: Hero Portrait. role: main selling portrait of the series. primary_interaction: quiet cafe presence with coffee only as a secondary detail, not the main subject. subject_position: seated on a visible cafe chair at the cafe table with face and upper shoulders framed cleanly; do not show much table. hands: hands may be absent or only minimally suggested; hands, cup and table must remain secondary. gaze: prefer direct eye contact, soft direct presence, eyes as the main focus. emotion: calm confidence / soft direct presence. scene_specific_props: minimal cafe background and optional subtle coffee detail only if it stays secondary. locked_elements: the closest frame in the series, face and eyes are the main focus, minimal background, no lifestyle pose, no table-heavy composition, no interaction-led image. allowed_variations: subtle head angle, calm confident gaze, soft direct presence, minimal shoulder angle. forbidden_substitutions: no medium lifestyle frame, no waist-up crop, no action-focused image, no dessert focus, no repeated HC-002 or HC-003 composition, no outfit or hairstyle description inside HC.",
    },
    {
      id: "HC-002",
      name: "Interaction Portrait",
      shotSize: "Medium Portrait",
      compositionIntent: "Interaction Portrait",
      primaryInteraction: "visible interaction with cup, spoon or dessert; the action is more important than portrait beauty",
      subjectPosition: "seated on a visible cafe chair at the table, framed from chest to waist, camera noticeably farther than HC-001, torso naturally angled",
      hands: "hands must be clearly visible and actively interacting with the cup, spoon, dessert or table",
      gaze: "look at the dessert, cup, spoon or slightly aside; do not repeat HC-001 direct eye contact",
      emotion: "light curiosity / small amused smile / enjoying the moment",
      sceneSpecificProps: "dessert or pastry, spoon, coffee cup and visible table",
      lockedElements: "Medium Portrait, hands and object interaction must be readable, face is not the only center of the image, action leads the composition",
      allowedVariations: "spoon position, dessert position, cup position, small amused smile, gaze toward object, natural hand movement",
      forbiddenSubstitutions: "no close hero portrait, no face-dominant crop, no repeated direct gaze from HC-001, no stiff hands, no food advertisement look, no outfit or hairstyle description inside HC",
      promptText:
        "HC-002: id: HC-002. name: Interaction Portrait. shot_size: Medium Portrait. composition_intent: Interaction Portrait. role: living action frame with coffee, spoon or dessert. primary_interaction: visible interaction with cup, spoon or dessert; the action is more important than portrait beauty. subject_position: seated on a visible cafe chair at the table, framed from chest to waist, camera noticeably farther than HC-001, torso naturally angled. hands: hands must be clearly visible and actively interacting with the cup, spoon, dessert or table. gaze: look at the dessert, cup, spoon or slightly aside; do not repeat HC-001 direct eye contact. emotion: light curiosity / small amused smile / enjoying the moment. scene_specific_props: dessert or pastry, spoon, coffee cup and visible table. locked_elements: Medium Portrait, hands and object interaction must be readable, face is not the only center of the image, action leads the composition. allowed_variations: spoon position, dessert position, cup position, small amused smile, gaze toward object, natural hand movement. forbidden_substitutions: no close hero portrait, no face-dominant crop, no repeated direct gaze from HC-001, no stiff hands, no food advertisement look, no outfit or hairstyle description inside HC.",
    },
    {
      id: "HC-003",
      name: "Lifestyle Editorial",
      shotSize: "Three Quarter Portrait",
      compositionIntent: "Lifestyle Editorial",
      primaryInteraction: "the person belongs naturally inside the cafe space, with posture and environment carrying the image",
      subjectPosition: "seated or naturally positioned at the cafe table, framed to hip or knees, with torso, hands, part of legs, table, chair and interior visible",
      hands: "hands must be visible and placed differently from HC-001 and HC-002, naturally on the table, near a cup, on the chair or relaxed as part of the pose",
      gaze: "may look at the camera, but not with the same facial expression or head angle as HC-001",
      emotion: "warm natural smile / relaxed lifestyle confidence",
      sceneSpecificProps: "table, chair, cafe interior, cup or small table object, visible surrounding space",
      lockedElements: "not a portrait, more space around the person, visible pose and cafe environment, person as part of the cafe scene, distinct body pose from HC-001 and HC-002",
      allowedVariations: "body angle, seated pose, hand placement, warm smile, conversational gaze, visible table and interior context",
      forbiddenSubstitutions: "no close portrait crop, no head-and-shoulders portrait, no repeated HC-001 or HC-002 framing, no face-only image, no outfit or hairstyle description inside HC",
      promptText:
        "HC-003: id: HC-003. name: Lifestyle Editorial. shot_size: Three Quarter Portrait. composition_intent: Lifestyle Editorial. role: frame about pose, outfit presence and cafe atmosphere, not a portrait. primary_interaction: the person belongs naturally inside the cafe space, with posture and environment carrying the image. subject_position: seated or naturally positioned at the cafe table, framed to hip or knees, with torso, hands, part of legs, table, chair and interior visible. hands: hands must be visible and placed differently from HC-001 and HC-002, naturally on the table, near a cup, on the chair or relaxed as part of the pose. gaze: may look at the camera, but not with the same facial expression or head angle as HC-001. emotion: warm natural smile / relaxed lifestyle confidence. scene_specific_props: table, chair, cafe interior, cup or small table object, visible surrounding space. locked_elements: not a portrait, more space around the person, visible pose and cafe environment, person as part of the cafe scene, distinct body pose from HC-001 and HC-002. allowed_variations: body angle, seated pose, hand placement, warm smile, conversational gaze, visible table and interior context. forbidden_substitutions: no close portrait crop, no head-and-shoulders portrait, no repeated HC-001 or HC-002 framing, no face-only image, no outfit or hairstyle description inside HC.",
    },
    {
      id: "HC-004",
      name: "Environmental Portrait",
      shotSize: "Wide Portrait",
      compositionIntent: "Environmental Editorial",
      primaryInteraction: "quiet enjoyment of the cafe atmosphere near a window, table or cafe interior",
      subjectPosition: "knee-length, almost full body or controlled wide frame; person is integrated into the cafe space but not so distant that identity is lost",
      hands: "may hold a cup, rest on the table, hold it with both hands, or relax naturally in the scene",
      gaze: "prefer looking away toward the window, cup, street or cafe space",
      emotion: "thoughtful / calm looking away / enjoying the atmosphere",
      sceneSpecificProps: "window, cafe table, coffee or tea cup, visible cafe interior and warm atmosphere",
      lockedElements: "widest frame of the set, interior is as important as the person, prefer knee-length or almost full body over extreme full body if the face would lose recognizability, preserve maximum possible facial detail and identity clarity",
      allowedVariations: "cup position, hand position, seated on a visible cafe chair or standing body angle, window light, calm side gaze, cafe atmosphere",
      forbiddenSubstitutions: "no close portrait, no medium portrait, no oversized head, no faceless distant subject, no identity loss, no outfit or hairstyle description inside HC",
      promptText:
        "HC-004: id: HC-004. name: Environmental Portrait. shot_size: Wide Portrait. composition_intent: Environmental Editorial. role: the widest atmospheric cafe image in the set. primary_interaction: quiet enjoyment of the cafe atmosphere near a window, table or cafe interior. subject_position: knee-length, almost full body or controlled wide frame; person is integrated into the cafe space but not so distant that identity is lost. hands: may hold a cup, rest on the table, hold it with both hands, or relax naturally in the scene. gaze: prefer looking away toward the window, cup, street or cafe space. emotion: thoughtful / calm looking away / enjoying the atmosphere. scene_specific_props: window, cafe table, coffee or tea cup, visible cafe interior and warm atmosphere. locked_elements: widest frame of the set, interior is as important as the person, prefer knee-length or almost full body over extreme full body if the face would lose recognizability, preserve maximum possible facial detail and identity clarity. allowed_variations: cup position, hand position, seated on a visible cafe chair or standing body angle, window light, calm side gaze, cafe atmosphere. forbidden_substitutions: no close portrait, no medium portrait, no oversized head, no faceless distant subject, no identity loss, no outfit or hairstyle description inside HC.",
    },
  ];  return heroes.map((hero) => [shared, renderHeroComposition("SP-004", hero)].join(" "));
}
function isSp005Style(styleId: string): boolean {
  return styleId === "sp-005-sup-editorial" || styleId === "sup";
}

function getSp005HeroScenePackages(): string[] {
  const shared = [
    "ID: SP-005.",
    "Name: SUP Editorial.",
    "Category / JTBD: Luxury / Editorial / Sport Lifestyle. Create a premium paddleboard editorial photoshoot on crystal-clear water.",
    "Package Promise: Luxury editorial paddleboard photoshoot on crystal-clear water with a sporty, elegant aesthetic.",
    SP005_SERIES_APPEARANCE,
    SP005_SERIES_CONTINUITY,
    SP005_HERO_LIBRARY,
    "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine swimsuit, paddleboard, paddle, hairstyle, makeup, accessories, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
    SP005_SCENE,
    SP005_PHOTOGRAPHIC_LANGUAGE,
    SP005_CAMERA_LANGUAGE,
    "Lighting and camera: sunny day, clean natural sunlight, premium aquatic reflections, realistic water highlights, natural skin, no harsh flash, no artificial studio light.",
    "Quality: expensive luxury editorial paddleboard photoshoot, high realism, natural skin, professional photographer work, no AI image look.",
    "Must not: collage, multi-panel image, contact sheet, grid layout, changed swimsuit, changed paddleboard model, changed paddleboard color, changed paddle, changed hairstyle, changed makeup, changed accessories, copied reference clothing, copied reference hairstyle, copied reference makeup, copied reference pose or exact crop.",
    SP005_REFERENCE_BOUNDARY,
  ].join(" ");

  const heroes: HeroComposition[] = [
    {
      id: "HC-001",
      name: "Aerial Editorial",
      shotSize: "Full Body / Top-Down Aerial Editorial",
      compositionIntent: "atmospheric drone-shot where paddleboard, turquoise water, composition and relaxed vacation feeling are the main subjects",
      primaryInteraction: "the subject relaxes on the paddleboard as part of the aerial composition, not as a portrait",
      subjectPosition: "full top-down view, lying relaxed on the paddleboard, head slightly turned aside, body fully relaxed and naturally aligned with the board geometry",
      hands: "one arm rests freely along the body; the other hand or forearm naturally shades the eyes from the sun as a relaxed vacation gesture, not a posed gesture",
      gaze: "no eye contact with camera; eyes naturally closed or shaded from the sun",
      emotion: "light natural relaxed smile with restful vacation mood",
      sceneSpecificProps: "same paddleboard, same paddle placed naturally and stably on the board away from the board edge, crystal-clear turquoise water, same SUP color palette",
      lockedElements: "top-down aerial view, full body, relaxed lying pose on paddleboard, head slightly turned aside, one arm along body, second hand or forearm naturally shading eyes from sun, body fully relaxed, board and water geometry are the main focus, face remains recognizable but is not the main subject, paddle is physically stable and not on the edge of the board",
      allowedVariations: "small body angle, subtle head turn, natural sun-shading hand placement, hair movement, stable paddle placement, water reflections and board position within a clean aerial geometry",
      forbiddenSubstitutions: "no portrait, no direct eye contact, no artificially enlarged face, no extra facial-detail push, no standing pose, no seated pose, no close portrait, no beach background, no unstable paddle on the board edge, no paddle that looks like it will fall into the water, no changed board, no changed paddle, no changed swimsuit, no changed hairstyle",
      promptText:
        "HC-001: id: HC-001. name: Aerial Editorial. shot_size: Full Body / Top-Down Aerial Editorial. composition_intent: atmospheric drone-shot where paddleboard, turquoise water, composition and relaxed vacation feeling are the main subjects. role: aerial editorial atmosphere, not a hero portrait. primary_interaction: the subject relaxes on the paddleboard as part of the aerial composition, not as a portrait. subject_position: full top-down view, lying relaxed on the paddleboard, head slightly turned aside, body fully relaxed and naturally aligned with the board geometry. hands: one arm rests freely along the body; the other hand or forearm naturally shades the eyes from the sun as a relaxed vacation gesture, not a posed gesture. gaze: no eye contact with camera; eyes naturally closed or shaded from the sun. emotion: light natural relaxed smile with restful vacation mood. scene_specific_props: same paddleboard, same paddle placed naturally and stably on the board away from the board edge, crystal-clear turquoise water, same SUP color palette. locked_elements: top-down aerial view, full body, relaxed lying pose on paddleboard, head slightly turned aside, one arm along body, second hand or forearm naturally shading eyes from sun, body fully relaxed, board and water geometry are the main focus, face remains recognizable but is not the main subject, paddle is physically stable and not on the edge of the board. allowed_variations: small body angle, subtle head turn, natural sun-shading hand placement, hair movement, stable paddle placement, water reflections and board position within a clean aerial geometry. forbidden_substitutions: no portrait, no direct eye contact, no artificially enlarged face, no extra facial-detail push, no standing pose, no seated pose, no close portrait, no beach background, no unstable paddle on the board edge, no paddle that looks like it will fall into the water, no changed board, no changed paddle, no changed swimsuit, no changed hairstyle.",
    },
    {
      id: "HC-002",
      name: "Hero Beauty Portrait",
      shotSize: "Extreme Close Beauty Portrait",
      compositionIntent: "main beauty image of the series with face as the focus",
      primaryInteraction: "the subject is in the water, close to camera, naturally integrated with water reflections",
      subjectPosition: "face close to camera in water, face occupies 60-70% of the frame, shoulders or waterline may be visible",
      hands: "hands may be absent or subtly interacting with water if natural and not distracting",
      gaze: "direct eye contact with camera",
      emotion: "quiet confident beauty presence",
      sceneSpecificProps: "crystal-clear water around the face, subtle wet-look hair, luxury aquatic reflections",
      lockedElements: "very close beauty portrait, face occupies 60-70% of frame, direct eye contact, subject in water",
      allowedVariations: "minor water reflections, subtle head angle, wet hair placement, calm direct gaze",
      forbiddenSubstitutions: "no full body, no board-dominant frame, no sunglasses, no heavy glam makeup, no changed hairstyle, no copied reference expression",
      promptText:
        "HC-002: id: HC-002. name: Hero Beauty Portrait. shot_size: Extreme Close Beauty Portrait. composition_intent: main beauty image of the series with face as the focus. role: strongest beauty portrait in the SUP editorial set. primary_interaction: the subject is in the water, close to camera, naturally integrated with water reflections. subject_position: face close to camera in water, face occupies 60-70% of the frame, shoulders or waterline may be visible. hands: hands may be absent or subtly interacting with water if natural and not distracting. gaze: direct eye contact with camera. emotion: quiet confident beauty presence. scene_specific_props: crystal-clear water around the face, subtle wet-look hair, luxury aquatic reflections. locked_elements: very close beauty portrait, face occupies 60-70% of frame, direct eye contact, subject in water. allowed_variations: minor water reflections, subtle head angle, wet hair placement, calm direct gaze. forbidden_substitutions: no full body, no board-dominant frame, no sunglasses, no heavy glam makeup, no changed hairstyle, no copied reference expression.",
    },
    {
      id: "HC-003",
      name: "Board Portrait",
      shotSize: "Medium Portrait",
      compositionIntent: "classic editorial portrait beside the paddleboard with realistic natural posture",
      primaryInteraction: "the subject stands beside the vertically placed paddleboard; the board is a composition element, not a face-covering prop",
      subjectPosition: "standing naturally next to the same vertical paddleboard; paddleboard occupies about one third of the frame; full face is open and unobstructed; shoulders relaxed",
      hands: "hands rest naturally at the side or lightly on the paddleboard edge without stiff posing",
      gaze: "direct eye contact with camera",
      emotion: "calm natural editorial presence with minimal posing",
      sceneSpecificProps: "same paddleboard standing vertically beside the subject, crystal-clear turquoise water, sunny calm day",
      lockedElements: "Medium Portrait, vertical frame, subject stands beside the board, board occupies about one third of the image, full face visible, eyes nose and mouth never covered by the board, relaxed shoulders, no fashion pose",
      allowedVariations: "slight board angle, relaxed shoulder angle, natural hand placement, subtle head position, calm direct gaze",
      forbiddenSubstitutions: "no board covering eyes nose or mouth, no half-face crop, no fashion pose, no extreme editorial exaggeration, no complex body bend, no changed board, no changed swimsuit, no changed hairstyle",
      promptText:
        "HC-003: id: HC-003. name: Board Portrait. shot_size: Medium Portrait. composition_intent: classic editorial portrait beside the paddleboard with realistic natural posture. role: classic editorial portrait next to the SUP board. primary_interaction: the subject stands beside the vertically placed paddleboard; the board is a composition element, not a face-covering prop. subject_position: standing naturally next to the same vertical paddleboard; paddleboard occupies about one third of the frame; full face is open and unobstructed; shoulders relaxed. hands: hands rest naturally at the side or lightly on the paddleboard edge without stiff posing. gaze: direct eye contact with camera. emotion: calm natural editorial presence with minimal posing. scene_specific_props: same paddleboard standing vertically beside the subject, crystal-clear turquoise water, sunny calm day. locked_elements: Medium Portrait, vertical frame, subject stands beside the board, board occupies about one third of the image, full face visible, eyes nose and mouth never covered by the board, relaxed shoulders, no fashion pose. allowed_variations: slight board angle, relaxed shoulder angle, natural hand placement, subtle head position, calm direct gaze. forbidden_substitutions: no board covering eyes nose or mouth, no half-face crop, no fashion pose, no extreme editorial exaggeration, no complex body bend, no changed board, no changed swimsuit, no changed hairstyle.",
    },
    {
      id: "HC-004",
      name: "Relaxed SUP Lifestyle",
      shotSize: "Medium Lifestyle Portrait",
      compositionIntent: "light natural lifestyle photograph seated cross-legged on the paddleboard",
      primaryInteraction: "the subject sits cross-legged on the paddleboard; one hand naturally holds the paddle, the other hand rests relaxed on her knee",
      subjectPosition: "seated cross-legged on the same paddleboard, both legs fully on the board surface, no body parts hanging outside the board, torso relaxed and simple",
      hands: "one hand holds the same paddle naturally; the other hand rests relaxed on her knee",
      gaze: "natural gaze toward camera or slightly aside, not necessarily direct",
      emotion: "genuine natural smile, relaxed and joyful lifestyle mood",
      sceneSpecificProps: "same paddleboard, same paddle, crystal-clear turquoise water, sunny calm day",
      lockedElements: "Medium Lifestyle Portrait, seated cross-legged on board, both legs fully on board, one hand holds paddle, second hand relaxed on knee, full face visible, natural smile, realistic relaxed posture",
      allowedVariations: "paddle angle, relaxed hand-on-knee position, small torso angle, natural smile, gaze slightly away, gentle water movement",
      forbiddenSubstitutions: "no legs hanging off the board, no complex torso bend, no extreme fashion pose, no raised hands, no active gestures, no difficult hand-leg interaction, no close beauty portrait, no top-down lying pose, no standing board portrait, no changed paddle, no changed swimsuit, no changed hairstyle",
      promptText:
        "HC-004: id: HC-004. name: Relaxed SUP Lifestyle. shot_size: Medium Lifestyle Portrait. composition_intent: light natural lifestyle photograph seated cross-legged on the paddleboard. role: relaxed lifestyle frame with a genuine easy mood. primary_interaction: the subject sits cross-legged on the paddleboard; one hand naturally holds the paddle, the other hand rests relaxed on her knee. subject_position: seated cross-legged on the same paddleboard, both legs fully on the board surface, no body parts hanging outside the board, torso relaxed and simple. hands: one hand holds the same paddle naturally; the other hand rests relaxed on her knee. gaze: natural gaze toward camera or slightly aside, not necessarily direct. emotion: genuine natural smile, relaxed and joyful lifestyle mood. scene_specific_props: same paddleboard, same paddle, crystal-clear turquoise water, sunny calm day. locked_elements: Medium Lifestyle Portrait, seated cross-legged on board, both legs fully on board, one hand holds paddle, second hand relaxed on knee, full face visible, natural smile, realistic relaxed posture. allowed_variations: paddle angle, relaxed hand-on-knee position, small torso angle, natural smile, gaze slightly away, gentle water movement. forbidden_substitutions: no legs hanging off the board, no complex torso bend, no extreme fashion pose, no raised hands, no active gestures, no difficult hand-leg interaction, no close beauty portrait, no top-down lying pose, no standing board portrait, no changed paddle, no changed swimsuit, no changed hairstyle.",
    },
  ];

  return heroes.map((hero) => [shared, renderHeroComposition("SP-005", hero)].join(" "));
}

function isSp006Style(styleId: string): boolean {
  return styleId === "sp-006-studio-elegance" || styleId === "studio-elegance";
}

function getSp006HeroScenePackages(): string[] {
  const shared = [
    "ID: SP-006.",
    "Name: Studio Elegance.",
    "Category / JTBD: Premium Studio / Elegant Portraits. Create an elegant premium studio photoshoot in a minimalist warm-toned interior.",
    "Package Promise: Elegant premium studio photoshoot in a minimalist warm-toned interior. The result should look like a real professional studio session rather than fashion catalog imagery.",
    SP006_SERIES_APPEARANCE,
    SP006_SERIES_CONTINUITY,
    SP006_HERO_LIBRARY,
    "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine dress, hairstyle, makeup, jewelry, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
    SP006_SCENE,
    SP006_PHOTOGRAPHIC_LANGUAGE,
    SP006_CAMERA_LANGUAGE,
    "Lighting and camera: consistent soft natural sunlight inspired by the reference: warm late afternoon sunlight, soft diffused light, gentle sunlight entering from one side, subtle window light feeling, soft natural shadows, delicate light gradients and soft highlights on the background wall. The lighting should feel like expensive editorial photography in natural sunlight. Do not use flat studio lighting, beauty dish look, hard flash or evenly illuminated background.",
    "Quality: expensive elegant studio photoshoot, high realism, natural skin, professional photographer work, no AI image look, no fashion catalog exaggeration.",
    "Must not: collage, multi-panel image, contact sheet, grid layout, changed dress, changed dress color, changed hairstyle, changed jewelry, changed makeup, furniture, props, fashion poses, exaggerated body curves, complex body bends, hands covering face, fingers covering lips, plastic skin, copied reference clothing, copied reference hairstyle, copied reference makeup, copied reference pose or exact crop.",
    SP006_REFERENCE_BOUNDARY,
  ].join(" ");

  const heroes: HeroComposition[] = [
    {
      id: "HC-001",
      name: "Relaxed Sitting Portrait",
      shotSize: "Relaxed Floor Sitting Portrait",
      compositionIntent: "natural relaxed floor sitting studio portrait with calm premium elegance",
      primaryInteraction: "the subject sits naturally on the studio floor without props or furniture",
      subjectPosition: "sitting on the floor, both knees bent to one side, natural posture, slight body turn, relaxed shoulders",
      hands: "one hand rests freely on the floor; the other hand rests relaxed on the knee",
      gaze: "calm direct eye contact with camera",
      emotion: "light natural smile, relaxed and elegant",
      sceneSpecificProps: "minimal warm-toned studio floor, neutral beige background, no furniture, no props",
      lockedElements: "floor sitting pose, both knees bent to one side, one hand on floor, one hand on knee, natural posture, slight body turn, direct calm gaze, same red silk dress, no furniture, no props",
      allowedVariations: "small body turn, subtle knee angle, relaxed hand placement, calm direct gaze, soft fabric movement",
      forbiddenSubstitutions: "no standing pose, no chair, no fashion pose, no exaggerated body curve, no complex body bend, no hands near face, no changed dress, no changed hairstyle, no props",
      promptText:
        "HC-001: id: HC-001. name: Relaxed Sitting Portrait. shot_size: Relaxed Floor Sitting Portrait. composition_intent: natural relaxed floor sitting studio portrait with calm premium elegance. role: relaxed floor sitting studio frame. primary_interaction: the subject sits naturally on the studio floor without props or furniture. subject_position: sitting on the floor, both knees bent to one side, natural posture, slight body turn, relaxed shoulders. hands: one hand rests freely on the floor; the other hand rests relaxed on the knee. gaze: calm direct eye contact with camera. emotion: light natural smile, relaxed and elegant. scene_specific_props: minimal warm-toned studio floor, neutral beige background, no furniture, no props. locked_elements: floor sitting pose, both knees bent to one side, one hand on floor, one hand on knee, natural posture, slight body turn, direct calm gaze, same red silk dress, no furniture, no props. allowed_variations: small body turn, subtle knee angle, relaxed hand placement, calm direct gaze, soft fabric movement. forbidden_substitutions: no standing pose, no chair, no fashion pose, no exaggerated body curve, no complex body bend, no hands near face, no changed dress, no changed hairstyle, no props.",
    },
    {
      id: "HC-002",
      name: "Seated Portrait",
      shotSize: "Medium Portrait",
      compositionIntent: "natural seated studio portrait with a light smile and open face",
      primaryInteraction: "the subject sits calmly on a neutral low studio cube; the support is visible but not emphasized",
      subjectPosition: "seated on the neutral low studio cube, medium frame, pelvis visibly supported, relaxed torso and shoulders, face fully open",
      hands: "one hand rests relaxed on the knee; the second hand lightly touches the chin without covering lips or face",
      gaze: "natural gaze toward camera",
      emotion: "natural light smile",
      sceneSpecificProps: "minimal warm-toned studio, neutral beige background, neutral low studio cube as the only support",
      lockedElements: "Medium Portrait, seated pose, one hand on knee, second hand lightly touches chin, fingers do not cover lips, face fully visible, natural light smile",
      allowedVariations: "small head angle, relaxed seated posture, soft smile, natural finger position away from lips",
      forbiddenSubstitutions: "no fingers covering lips, no hands covering face, no complex hand pose, no standing pose, no fashion pose, no exaggerated body curve, no changed dress, no changed hairstyle, no props",
      promptText:
        "HC-002: id: HC-002. name: Seated Portrait. shot_size: Medium Portrait. composition_intent: natural seated studio portrait with a light smile and open face. role: seated medium studio portrait. primary_interaction: the subject sits calmly on a neutral low studio cube; the support is visible but not emphasized. subject_position: seated on the neutral low studio cube, medium frame, pelvis visibly supported, relaxed torso and shoulders, face fully open. hands: one hand rests relaxed on the knee; the second hand lightly touches the chin without covering lips or face. gaze: natural gaze toward camera. emotion: natural light smile. scene_specific_props: minimal warm-toned studio, neutral beige background, neutral low studio cube as the only support. locked_elements: Medium Portrait, seated pose, one hand on knee, second hand lightly touches chin, fingers do not cover lips, face fully visible, natural light smile. allowed_variations: small head angle, relaxed seated posture, soft smile, natural finger position away from lips. forbidden_substitutions: no fingers covering lips, no hands covering face, no complex hand pose, no standing pose, no fashion pose, no exaggerated body curve, no changed dress, no changed hairstyle, no props.",
    },
    {
      id: "HC-003",
      name: "Hero Close Portrait",
      shotSize: "Close Portrait",
      compositionIntent: "main close portrait with maximum emphasis on face, eyes and identity",
      primaryInteraction: "the subject is photographed closely in the warm minimalist studio, without hand gestures",
      subjectPosition: "close portrait, face occupies about 60% of the frame, shoulders may be softly visible, hands fully out of frame",
      hands: "hands completely out of frame",
      gaze: "direct eye contact",
      emotion: "natural warm smile, real and relaxed",
      sceneSpecificProps: "minimal warm-toned studio, neutral beige background, soft warm light",
      lockedElements: "Close Portrait, face about 60% of frame, hands out of frame, direct gaze, maximum face emphasis, same red silk dress only subtly visible if shoulders appear",
      allowedVariations: "subtle head angle, soft smile, small shoulder angle, warm natural light",
      forbiddenSubstitutions: "no hands in frame, no hand near face, no fingers near lips, no medium or full-body shot, no fashion pose, no changed dress, no changed hairstyle, no props",
      promptText:
        "HC-003: id: HC-003. name: Hero Close Portrait. shot_size: Close Portrait. composition_intent: main close portrait with maximum emphasis on face, eyes and identity. role: hero close studio portrait. primary_interaction: the subject is photographed closely in the warm minimalist studio, without hand gestures. subject_position: close portrait, face occupies about 60% of the frame, shoulders may be softly visible, hands fully out of frame. hands: hands completely out of frame. gaze: direct eye contact. emotion: natural warm smile, real and relaxed. scene_specific_props: minimal warm-toned studio, neutral beige background, soft warm light. locked_elements: Close Portrait, face about 60% of frame, hands out of frame, direct gaze, maximum face emphasis, same red silk dress only subtly visible if shoulders appear. allowed_variations: subtle head angle, soft smile, small shoulder angle, warm natural light. forbidden_substitutions: no hands in frame, no hand near face, no fingers near lips, no medium or full-body shot, no fashion pose, no changed dress, no changed hairstyle, no props.",
    },
    {
      id: "HC-004",
      name: "Relaxed Sitting Portrait",
      shotSize: "Relaxed Floor Sitting Portrait",
      compositionIntent: "natural relaxed floor sitting studio portrait with simple anatomy and calm elegance",
      primaryInteraction: "the subject sits relaxed on the studio floor in the same red silk dress",
      subjectPosition: "sitting on the floor, one knee slightly bent, torso natural, no complex body twist, relaxed shoulders",
      hands: "both hands rest relaxed on the legs, not near the face",
      gaze: "calm gaze slightly to the side of the camera",
      emotion: "natural relaxed smile",
      sceneSpecificProps: "minimal warm-toned studio floor, neutral beige background, no furniture, no props",
      lockedElements: "floor sitting pose, one knee slightly bent, both hands on legs, torso natural, no complex bends, side-of-camera gaze, relaxed smile, same red silk dress",
      allowedVariations: "small knee angle, relaxed hand placement on legs, slight side gaze, soft smile, natural dress folds",
      forbiddenSubstitutions: "no standing pose, no chair, no props, no hands near face, no crossed arms, no complex body twist, no exaggerated body curve, no fashion pose, no changed dress, no changed hairstyle",
      promptText:
        "HC-004: id: HC-004. name: Relaxed Sitting Portrait. shot_size: Relaxed Floor Sitting Portrait. composition_intent: natural relaxed floor sitting studio portrait with simple anatomy and calm elegance. role: relaxed sitting studio frame. primary_interaction: the subject sits relaxed on the studio floor in the same red silk dress. subject_position: sitting on the floor, one knee slightly bent, torso natural, no complex body twist, relaxed shoulders. hands: both hands rest relaxed on the legs, not near the face. gaze: calm gaze slightly to the side of the camera. emotion: natural relaxed smile. scene_specific_props: minimal warm-toned studio floor, neutral beige background, no furniture, no props. locked_elements: floor sitting pose, one knee slightly bent, both hands on legs, torso natural, no complex bends, side-of-camera gaze, relaxed smile, same red silk dress. allowed_variations: small knee angle, relaxed hand placement on legs, slight side gaze, soft smile, natural dress folds. forbidden_substitutions: no standing pose, no chair, no props, no hands near face, no crossed arms, no complex body twist, no exaggerated body curve, no fashion pose, no changed dress, no changed hairstyle.",
    },
  ];

  return heroes.map((hero) => [shared, renderHeroComposition("SP-006", hero)].join(" "));
}
function isSp007Style(styleId: string): boolean {
  return styleId === "sp-007-lakeside-walk" || styleId === "lakeside-walk";
}

function getSp007HeroScenePackages(): string[] {
  const shared = [
    "ID: SP-007.",
    "Name: Lakeside Walk.",
    "Category / JTBD: Golden Hour Romance / Outdoor Lifestyle Editorial. Create a cinematic warm lakeside photoshoot with a young nature muse mood.",
    "Package Promise: Young nature muse, woodland nymph and golden hour romance around a quiet lakeside park. The result should feel free, light, alive, dreamy and cinematic, captured by one professional lifestyle photographer.",
    SP007_SERIES_APPEARANCE,
    SP007_SERIES_CONTINUITY,
    SP007_HERO_LIBRARY,
    "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine dress, hairstyle, makeup, accessories, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
    SP007_SCENE,
    SP007_PHOTOGRAPHIC_LANGUAGE,
    SP007_CAMERA_LANGUAGE,
    "Lighting and camera: cinematic golden hour, warm backlight, sun flare, hair glow, beautiful bokeh, light breeze, sparkling water reflections, natural highlights, soft shadows, no flat light, no harsh flash, no dramatic artificial light.",
    "Quality: real cinematic romantic lifestyle photoshoot, high realism, natural skin, alive emotion, professional photographer work, dreamy lakeside atmosphere, no AI image look.",
    "Must not: collage, multi-panel image, contact sheet, grid layout, phone snapshot look, age-heavy or motherly outfit, closed heavy dress, boring static pose, full-body framing, identical facial expressions, flat light, changed dress, changed dress color, changed hairstyle, changed makeup, props, hands near face, complex body bends, excessive torso curve, strong wind covering face, hair fully covering face, plastic skin, copied reference clothing, copied reference hairstyle, copied reference makeup, copied reference pose or exact crop.",
    SP007_REFERENCE_BOUNDARY,
  ].join(" ");

  const heroes: HeroComposition[] = [
    {
      id: "HC-001",
      name: "Lakeside Walking Muse",
      shotSize: "Medium Portrait",
      compositionIntent: "cinematic medium portrait walking along the water with lightness and movement",
      primaryInteraction: "the subject walks slowly along the lakeside during golden hour, with the dress and low loose ponytail moving lightly in the breeze",
      subjectPosition: "medium portrait while walking near the water, body relaxed, slight natural movement, no full-body framing",
      hands: "arms relaxed naturally, no active gestures, no hands near face, no hair fixing gesture",
      gaze: "soft natural gaze toward camera or slightly past it",
      emotion: "light romantic smile, free and alive",
      sceneSpecificProps: "lake water, sparkling reflections, warm backlight, sun flare, rich greenery, light breeze",
      lockedElements: "Medium Portrait, walking along water, flowing dress and low loose ponytail moving lightly, same dress, no full body, no phone snapshot look",
      allowedVariations: "small step phase, soft dress movement, wind in hair, subtle gaze direction, warm backlight, natural water reflections",
      forbiddenSubstitutions: "no standing still pose, no full-body framing, no closed heavy dress, no boring static pose, no hands near face, no fashion pose, no flat light, no changed dress",
      promptText:
        "HC-001: id: HC-001. name: Lakeside Walking Muse. shot_size: Medium Portrait. composition_intent: cinematic medium portrait walking along the water with lightness and movement. role: young nature muse walking by the lake. primary_interaction: the subject walks slowly along the lakeside during golden hour, with the dress and low loose ponytail moving lightly in the breeze. subject_position: medium portrait while walking near the water, body relaxed, slight natural movement, no full-body framing. hands: arms relaxed naturally, no active gestures, no hands near face, no hair fixing gesture. gaze: soft natural gaze toward camera or slightly past it. emotion: light romantic smile, free and alive. scene_specific_props: lake water, sparkling reflections, warm backlight, sun flare, rich greenery, light breeze. locked_elements: Medium Portrait, walking along water, flowing dress and low loose ponytail moving lightly, same dress, no full body, no phone snapshot look. allowed_variations: small step phase, soft dress movement, wind in hair, subtle gaze direction, warm backlight, natural water reflections. forbidden_substitutions: no standing still pose, no full-body framing, no closed heavy dress, no boring static pose, no hands near face, no fashion pose, no flat light, no changed dress.",
    },
    {
      id: "HC-002",
      name: "Wind Portrait",
      shotSize: "Close Portrait",
      compositionIntent: "cinematic close portrait with wind in loose hair, warm backlight and lively emotion",
      primaryInteraction: "the subject is photographed closely by the lake, with natural wind moving the hair and golden backlight around the face",
      subjectPosition: "close portrait, face is the main focus, hands fully out of frame, loose wavy hair moving in the breeze but not covering the face",
      hands: "hands completely out of frame",
      gaze: "direct natural gaze or slightly playful gaze toward camera",
      emotion: "more alive expression, smiling with the eyes, gentle playful warmth",
      sceneSpecificProps: "soft lake and greenery bokeh, warm backlight, hair glow, sun flare, sparkling water reflections",
      lockedElements: "Close Portrait, wind in loose hair, hands out of frame, face emphasis, hair glow, same flowing dress only subtly visible if shoulders appear",
      allowedVariations: "subtle head angle, lively smile, wind movement in hair, warm sun flare, soft bokeh, natural highlights",
      forbiddenSubstitutions: "no hands in frame, no hand near face, no tied-up hair, no hair fully covering face, no full-body shot, no phone snapshot look, no flat light, no changed dress, no changed hairstyle, no props",
      promptText:
        "HC-002: id: HC-002. name: Wind Portrait. shot_size: Close Portrait. composition_intent: cinematic close portrait with wind in loose hair, warm backlight and lively emotion. role: close woodland nymph / nature muse portrait. primary_interaction: the subject is photographed closely by the lake, with natural wind moving the hair and golden backlight around the face. subject_position: close portrait, face is the main focus, hands fully out of frame, loose wavy hair moving in the breeze but not covering the face. hands: hands completely out of frame. gaze: direct natural gaze or slightly playful gaze toward camera. emotion: more alive expression, smiling with the eyes, gentle playful warmth. scene_specific_props: soft lake and greenery bokeh, warm backlight, hair glow, sun flare, sparkling water reflections. locked_elements: Close Portrait, wind in loose hair, hands out of frame, face emphasis, hair glow, same flowing dress only subtly visible if shoulders appear. allowed_variations: subtle head angle, lively smile, wind movement in hair, warm sun flare, soft bokeh, natural highlights. forbidden_substitutions: no hands in frame, no hand near face, no tied-up hair, no hair fully covering face, no full-body shot, no phone snapshot look, no flat light, no changed dress, no changed hairstyle, no props.",
    },
    {
      id: "HC-003",
      name: "Over-Shoulder Lakeside Portrait",
      shotSize: "Three-quarter Portrait",
      compositionIntent: "romantic three-quarter portrait standing near the water with body turn and over-shoulder gaze",
      primaryInteraction: "the subject stands near the lake and turns naturally back toward the photographer over the shoulder",
      subjectPosition: "standing near the water, three-quarter portrait, torso turned, shoulder angle visible, flowing dress and low loose bun with a few soft strands moving gently, no full-body framing",
      hands: "hands relaxed naturally and low, not near face, no active gesture",
      gaze: "over-the-shoulder gaze toward the photographer",
      emotion: "dreamy playful softness, smile in the eyes",
      sceneSpecificProps: "lake edge, golden hour backlight, sparkling reflections, rich greenery, beautiful bokeh, light breeze",
      lockedElements: "Three-quarter Portrait, body turn, over-shoulder gaze, same flowing dress, low loose bun with side part, no full body, no phone snapshot look",
      allowedVariations: "subtle shoulder turn, gentle movement in a few loose strands, soft smile, warm backlight, dress movement, natural hand placement",
      forbiddenSubstitutions: "no front-facing static portrait, no full-body framing, no closed heavy dress, no hands near face, no stretched arms, no complex body bend, no flat light, no changed dress",
      promptText:
        "HC-003: id: HC-003. name: Over-Shoulder Lakeside Portrait. shot_size: Three-quarter Portrait. composition_intent: romantic three-quarter portrait standing near the water with body turn and over-shoulder gaze. role: woodland nymph over-shoulder lakeside portrait. primary_interaction: the subject stands near the lake and turns naturally back toward the photographer over the shoulder. subject_position: standing near the water, three-quarter portrait, torso turned, shoulder angle visible, flowing dress and low loose bun with a few soft strands moving gently, no full-body framing. hands: hands relaxed naturally and low, not near face, no active gesture. gaze: over-the-shoulder gaze toward the photographer. emotion: dreamy playful softness, smile in the eyes. scene_specific_props: lake edge, golden hour backlight, sparkling reflections, rich greenery, beautiful bokeh, light breeze. locked_elements: Three-quarter Portrait, body turn, over-shoulder gaze, same flowing dress, low loose bun with side part, no full body, no phone snapshot look. allowed_variations: subtle shoulder turn, gentle movement in a few loose strands, soft smile, warm backlight, dress movement, natural hand placement. forbidden_substitutions: no front-facing static portrait, no full-body framing, no closed heavy dress, no hands near face, no stretched arms, no complex body bend, no flat light, no changed dress.",
    },
    {
      id: "HC-004",
      name: "Shore Sitting Muse",
      shotSize: "Relaxed Sitting Portrait",
      compositionIntent: "relaxed romantic sitting portrait by the shore with flowing dress around the subject",
      primaryInteraction: "the subject sits near the lakeside shore, leaning back naturally on the hands, with the dress lying freely around her",
      subjectPosition: "sitting near the shore, relaxed natural pose, supported by both hands behind or beside the body, torso open and easy, no complex twist, no full-body framing",
      hands: "both hands support the relaxed seated pose on the ground or grass, not near the face",
      gaze: "soft gaze toward camera or slightly away across the water",
      emotion: "calm dreamy thoughtfulness, romantic and relaxed",
      sceneSpecificProps: "shoreline grass, calm lake water, sparkling reflections, warm backlight, sun flare, soft greenery",
      lockedElements: "Relaxed Sitting Portrait, seated by shore, dress lying freely around, hands supporting the pose, same loose wavy hair, no full body, no phone snapshot look",
      allowedVariations: "small torso angle, natural hand support, gentle side gaze, soft dress folds, wind in hair, warm sun flare",
      forbiddenSubstitutions: "no standing pose, no walking pose, no full-body framing, no hands near face, no tied-up hair, no closed heavy dress, no complex body twist, no excessive torso curve, no flat light, no changed dress, no changed hairstyle",
      promptText:
        "HC-004: id: HC-004. name: Shore Sitting Muse. shot_size: Relaxed Sitting Portrait. composition_intent: relaxed romantic sitting portrait by the shore with flowing dress around the subject. role: dreamy sitting lakeside muse portrait. primary_interaction: the subject sits near the lakeside shore, leaning back naturally on the hands, with the dress lying freely around her. subject_position: sitting near the shore, relaxed natural pose, supported by both hands behind or beside the body, torso open and easy, no complex twist, no full-body framing. hands: both hands support the relaxed seated pose on the ground or grass, not near the face. gaze: soft gaze toward camera or slightly away across the water. emotion: calm dreamy thoughtfulness, romantic and relaxed. scene_specific_props: shoreline grass, calm lake water, sparkling reflections, warm backlight, sun flare, soft greenery. locked_elements: Relaxed Sitting Portrait, seated by shore, dress lying freely around, hands supporting the pose, same loose wavy hair, no full body, no phone snapshot look. allowed_variations: small torso angle, natural hand support, gentle side gaze, soft dress folds, wind in hair, warm sun flare. forbidden_substitutions: no standing pose, no walking pose, no full-body framing, no hands near face, no tied-up hair, no closed heavy dress, no complex body twist, no excessive torso curve, no flat light, no changed dress, no changed hairstyle.",
    },
  ];

  return heroes
    .filter((hero) => hero.id !== "HC-003")
    .map((hero) => [shared, renderHeroComposition("SP-007", hero)].join(" "));
}
function isSp008Style(styleId: string): boolean {
  return styleId === "sp-008-casual-park" || styleId === "casual-park";
}

function getSp008HeroScenePackages(): string[] {
  const shared = [
    "ID: SP-008.",
    "Name: Petersburg Walk.",
    "Category / JTBD: Atmospheric City Lifestyle / Petersburg Editorial Walk. Create a premium lifestyle photoshoot in an autumn Saint Petersburg after-rain setting.",
    "Package Promise: Atmospheric autumn editorial walk through Saint Petersburg after rain. Cool northern daylight, wet granite, canals, puddle reflections, old doors, columns, cafe facades, historic streets, quiet confidence and cinematic city mood. The photos should feel like one natural expensive day in the city, not casual phone snapshots, tourist landmark photos or fashion clothing ads.",
    SP008_SERIES_APPEARANCE,
    SP008_SERIES_CONTINUITY,
    SP008_HERO_LIBRARY,
    "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine outfit, hairstyle, makeup, accessories, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
    SP008_SCENE,
    SP008_PHOTOGRAPHIC_LANGUAGE,
    SP008_CAMERA_LANGUAGE,
    "Weather: after rain, wet granite, wet asphalt, puddles, reflections, dense gray clouds and humid northern air. No golden hour, no bright sunny day and no postcard sunbeam with a cathedral.",
    "Lighting and camera: most of the series uses soft diffused northern daylight, gentle contrast, wet-air atmosphere, natural reflections in puddles and wet asphalt, no direct sun, no golden hour, no flat phone-photo lighting, no beauty flash and natural skin texture.",
    "Quality: expensive atmospheric city editorial photoshoot, high realism, natural skin, calm confident emotion, professional photographer work, historic urban atmosphere, no AI image look.",
    "Must not: collage, multi-panel image, contact sheet, grid layout, cathedral as required subject, dome, Saint Isaac's Cathedral, more than one distant blurred landmark detail, tourist photo, postcard composition, turtleneck, camel coat, beige coat, long coat, sportswear, random clothing, phone snapshot look, excessive fashion posing, symmetrical posing, complex body plasticity, hands near face, strong wind covering face, bright sunny day, summer greenery, warm golden hour, copied reference clothing, copied reference hairstyle, copied reference pose or exact crop.",
    SP008_REFERENCE_BOUNDARY,
  ].join(" ");

  const heroes: HeroComposition[] = [
    {
      id: "HC-001",
      name: "Stone Portrait",
      shotSize: "Medium-close city portrait",
      compositionIntent: "medium-close atmospheric portrait near a stone wall or column with calm confidence and cold northern light",
      primaryInteraction: "the subject stands quietly near an old stone wall or column during the after-rain Petersburg walk",
      subjectPosition: "medium-close portrait, face and eyes important, shoulders and cropped bomber visible, soft architectural background blur, no full-body framing",
      hands: "hands out of frame or relaxed low, no hands near face",
      gaze: "calm confident gaze toward camera",
      emotion: "calm confidence",
      sceneSpecificProps: "old stone wall or column, wet stone texture, cold northern light, muted architectural background, no cathedral",
      lockedElements: "Medium-close city portrait, stone wall or column, same dark chocolate cropped suede bomber, same milk or white top, same white jeans if visible, same brown bag and outfit, same soft wave blowout, no full body, no phone snapshot look",
      allowedVariations: "subtle torso turn, slight head angle, calm direct gaze, soft architectural background blur, cool after-rain city light, polished hair waves",
      forbiddenSubstitutions: "no cathedral or landmark in this HC, no tourist portrait, no park bench, no summer greenery, no full-body framing, no hands near face, no turtleneck, no camel coat, no beige coat, no long coat, no straight messy hair, no phone snapshot, no golden hour, no changed outfit, no changed hairstyle",
      promptText:
        "HC-001: id: HC-001. name: Stone Portrait. shot_size: Medium-close city portrait. composition_intent: medium-close atmospheric portrait near a stone wall or column with calm confidence and cold northern light. role: opening editorial portrait of the autumn Petersburg after-rain walk. primary_interaction: the subject stands quietly near an old stone wall or column during the after-rain Petersburg walk. subject_position: medium-close portrait, face and eyes important, shoulders and cropped bomber visible, soft architectural background blur, no full-body framing. hands: hands out of frame or relaxed low, no hands near face. gaze: calm confident gaze toward camera. emotion: calm confidence. scene_specific_props: old stone wall or column, wet stone texture, cold northern light, muted architectural background, no cathedral. locked_elements: Medium-close city portrait, stone wall or column, same dark chocolate cropped suede bomber, same milk or white top, same white jeans if visible, same brown bag and outfit, same soft wave blowout, no full body, no phone snapshot look. allowed_variations: subtle torso turn, slight head angle, calm direct gaze, soft architectural background blur, cool after-rain city light, polished hair waves. forbidden_substitutions: no cathedral or landmark in this HC, no tourist portrait, no park bench, no summer greenery, no full-body framing, no hands near face, no turtleneck, no camel coat, no beige coat, no long coat, no straight messy hair, no phone snapshot, no golden hour, no changed outfit, no changed hairstyle.",
    },
    {
      id: "HC-002",
      name: "Cafe Facade",
      shotSize: "Medium city portrait",
      compositionIntent: "natural medium portrait by an exterior cafe facade with coffee, pocket hand and quiet city ease",
      primaryInteraction: "the subject stands or slightly leans against an exterior cafe facade after rain with a coffee cup in one hand",
      subjectPosition: "medium portrait near a stylish exterior cafe facade, slight lean or relaxed standing posture, one hand in jeans pocket, natural non-tourist stance, no cathedral in background",
      hands: "one hand holds a paper coffee cup; the other hand rests in the jeans pocket, no hands near face",
      gaze: "natural gaze toward camera or slightly aside",
      emotion: "light natural smile",
      sceneSpecificProps: "exterior cafe facade, wet pavement, muted historical street details, paper coffee cup, no cathedral background",
      lockedElements: "Medium city portrait, cafe facade, coffee cup, same dark chocolate cropped suede bomber, same milk or white top, same white jeans, same brown belt, same brown crossbody bag, same hairstyle, same outfit",
      allowedVariations: "slight lean against facade, coffee cup hand angle, pocket hand, subtle torso turn, soft smile, wet street reflections, cafe doorway depth",
      forbiddenSubstitutions: "no cathedral background, no posed fashion stance, no park tree portrait, no full-body framing, no sitting pose, no hands near face, no active gesture, no phone snapshot look, no summer greenery, no turtleneck, no camel coat, no beige coat, no long coat, no changed outfit, no changed hairstyle",
      promptText:
        "HC-002: id: HC-002. name: Cafe Facade. shot_size: Medium city portrait. composition_intent: natural medium portrait by an exterior cafe facade with coffee, pocket hand and quiet city ease. role: cafe moment of the autumn Petersburg editorial walk. primary_interaction: the subject stands or slightly leans against an exterior cafe facade after rain with a coffee cup in one hand. subject_position: medium portrait near a stylish exterior cafe facade, slight lean or relaxed standing posture, one hand in jeans pocket, natural non-tourist stance, no cathedral in background. hands: one hand holds a paper coffee cup; the other hand rests in the jeans pocket, no hands near face. gaze: natural gaze toward camera or slightly aside. emotion: light natural smile. scene_specific_props: exterior cafe facade, wet pavement, muted historical street details, paper coffee cup, no cathedral background. locked_elements: Medium city portrait, cafe facade, coffee cup, same dark chocolate cropped suede bomber, same milk or white top, same white jeans, same brown belt, same brown crossbody bag, same hairstyle, same outfit. allowed_variations: slight lean against facade, coffee cup hand angle, pocket hand, subtle torso turn, soft smile, wet street reflections, cafe doorway depth. forbidden_substitutions: no cathedral background, no posed fashion stance, no park tree portrait, no full-body framing, no sitting pose, no hands near face, no active gesture, no phone snapshot look, no summer greenery, no turtleneck, no camel coat, no beige coat, no long coat, no changed outfit, no changed hairstyle.",
    },
    {
      id: "HC-003",
      name: "Granite Embankment",
      shotSize: "Medium seated embankment portrait",
      compositionIntent: "thoughtful seated portrait on a granite embankment parapet by the canal, with wet stone and distant gaze",
      primaryInteraction: "the subject sits half-sideways on a granite embankment parapet by the canal after rain",
      subjectPosition: "medium portrait, seated half-sideways on wet granite parapet, torso slightly turned, one leg bent and the second leg freely lowered, natural stylish posture, no cathedral in background",
      hands: "one hand supports on the granite parapet or rests on the knee; the other hand relaxed naturally, no hands near face",
      gaze: "gaze directed into the distance, not into the camera",
      emotion: "thoughtful city mood",
      sceneSpecificProps: "canal, wet granite parapet, water, forged railing or muted historic street details, no cathedral background",
      lockedElements: "Medium seated embankment portrait, same dark chocolate cropped suede bomber, same milk or white top, same white jeans, same brown belt, same brown bag, same boots if visible, same hairstyle, no hands near face",
      allowedVariations: "small seated angle, one bent leg, second leg down, relaxed hand on granite or knee, distant gaze, wet stone texture, soft cold daylight",
      forbiddenSubstitutions: "no cathedral background, no frontal tourist sitting pose, no random sitting pose, no park grass, no blanket, no full-body framing, no complex body twist, no fashion pose, no raised hands, no hands near face, no turtleneck, no camel coat, no beige coat, no long coat, no changed outfit, no changed hairstyle",
      promptText:
        "HC-003: id: HC-003. name: Granite Embankment. shot_size: Medium seated embankment portrait. composition_intent: thoughtful seated portrait on a granite embankment parapet by the canal, with wet stone and distant gaze. role: contemplative canal frame of the autumn Petersburg after-rain walk. primary_interaction: the subject sits half-sideways on a granite embankment parapet by the canal after rain. subject_position: medium portrait, seated half-sideways on wet granite parapet, torso slightly turned, one leg bent and the second leg freely lowered, natural stylish posture, no cathedral in background. hands: one hand supports on the granite parapet or rests on the knee; the other hand relaxed naturally, no hands near face. gaze: gaze directed into the distance, not into the camera. emotion: thoughtful city mood. scene_specific_props: canal, wet granite parapet, water, forged railing or muted historic street details, no cathedral background. locked_elements: Medium seated embankment portrait, same dark chocolate cropped suede bomber, same milk or white top, same white jeans, same brown belt, same brown bag, same boots if visible, same hairstyle, no hands near face. allowed_variations: small seated angle, one bent leg, second leg down, relaxed hand on granite or knee, distant gaze, wet stone texture, soft cold daylight. forbidden_substitutions: no cathedral background, no frontal tourist sitting pose, no random sitting pose, no park grass, no blanket, no full-body framing, no complex body twist, no fashion pose, no raised hands, no hands near face, no turtleneck, no camel coat, no beige coat, no long coat, no changed outfit, no changed hairstyle.",
    },
    {
      id: "HC-004",
      name: "Architectural Columns Portrait",
      shotSize: "Vertical medium / three-quarter architectural portrait",
      compositionIntent: "atmospheric architectural portrait beside massive historical columns and a tall old wooden door, without cathedral or tourist landmark framing",
      primaryInteraction: "the subject stands or walks slowly beside massive historical columns and a high old wooden door after rain",
      subjectPosition: "vertical frame, architecture fills much of the background, subject placed in the lower part of the frame but not too small, medium or three-quarter portrait rather than distant full body, slight side turn, face readable",
      hands: "one hand in the jeans or bomber pocket; the other hand holds the crossbody bag strap or hangs naturally, no active gestures, no hands near face",
      gaze: "calm confident gaze toward camera or slightly aside, quiet city editorial presence",
      emotion: "calm confidence and feeling of an atmospheric Petersburg walk",
      sceneSpecificProps: "massive stone columns, tall old wooden door, granite, wet stone, overcast northern light, no cathedral, no dome, no distant tourist view",
      lockedElements: "Vertical medium / three-quarter architectural portrait, massive columns, old wooden door, wet stone, face readable, same dark chocolate cropped suede bomber, same milk or white top, same white high-waisted jeans, same brown belt, same brown boots, same brown crossbody bag, same soft polished waves, no distant full-body framing",
      allowedVariations: "standing or slow walking pause, slight side turn, one hand in pocket, bag strap held naturally, architecture occupying background, wet stone texture, soft cold daylight, calm expression",
      forbiddenSubstitutions: "no cathedral, no dome, no Saint Isaac's Cathedral, no distant tourist landmark view, no postcard composition, no full-body distant shot, no subject too small, no summer park walk, no bright green background, no phone snapshot look, no strong wind covering face, no hands near face, no turtleneck, no camel coat, no beige coat, no long coat, no changed outfit, no changed hairstyle, no golden hour",
      promptText:
        "HC-004: id: HC-004. name: Architectural Columns Portrait. shot_size: Vertical medium / three-quarter architectural portrait. composition_intent: atmospheric architectural portrait beside massive historical columns and a tall old wooden door, without cathedral or tourist landmark framing. role: final architectural Petersburg editorial frame where columns, wet stone and an old wooden door create the city mood while the person remains the emotional hero. primary_interaction: the subject stands or walks slowly beside massive historical columns and a high old wooden door after rain. subject_position: vertical frame, architecture fills much of the background, subject placed in the lower part of the frame but not too small, medium or three-quarter portrait rather than distant full body, slight side turn, face readable. hands: one hand in the jeans or bomber pocket; the other hand holds the crossbody bag strap or hangs naturally, no active gestures, no hands near face. gaze: calm confident gaze toward camera or slightly aside, quiet city editorial presence. emotion: calm confidence and feeling of an atmospheric Petersburg walk. scene_specific_props: massive stone columns, tall old wooden door, granite, wet stone, overcast northern light, no cathedral, no dome, no distant tourist view. locked_elements: Vertical medium / three-quarter architectural portrait, massive columns, old wooden door, wet stone, face readable, same dark chocolate cropped suede bomber, same milk or white top, same white high-waisted jeans, same brown belt, same brown boots, same brown crossbody bag, same soft polished waves, no distant full-body framing. allowed_variations: standing or slow walking pause, slight side turn, one hand in pocket, bag strap held naturally, architecture occupying background, wet stone texture, soft cold daylight, calm expression. forbidden_substitutions: no cathedral, no dome, no Saint Isaac's Cathedral, no distant tourist landmark view, no postcard composition, no full-body distant shot, no subject too small, no summer park walk, no bright green background, no phone snapshot look, no strong wind covering face, no hands near face, no turtleneck, no camel coat, no beige coat, no long coat, no changed outfit, no changed hairstyle, no golden hour.",
    },
  ];

  return heroes.map((hero) => [shared, renderHeroComposition("SP-008", hero)].join(" "));
}

function isSp009Style(styleId: string): boolean {
  return styleId === "sp-009-minimal-black-studio" || styleId === "minimal-black-studio";
}

function getSp009HeroScenePackages(): string[] {
  const shared = [
    "ID: SP-009.",
    "Name: Minimal Black Studio.",
    "Category / JTBD: Luxury Minimal Editorial / Quiet Authority Studio Portraits. Create a modern premium editorial session in a dark artistic studio.",
    "Package Promise: Minimal premium editorial session in a modern studio. Quiet luxury, The Ruler archetype, calm authority, timeless elegance and cinematic stillness. The photos should look like a real premium magazine editorial, not a corporate photoshoot.",
    SP009_SERIES_APPEARANCE,
    SP009_SERIES_CONTINUITY,
    SP009_HERO_LIBRARY,
    "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine outfit, hairstyle, makeup, furniture, background, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
    SP009_SCENE,
    SP009_PHOTOGRAPHIC_LANGUAGE,
    SP009_CAMERA_LANGUAGE,
    "Lighting and camera: signature large soft side light, directed window-light feeling, soft window gradients, soft shadows, subtle light patches on the dark textured background, gentle falloff, depth, volume, cool color temperature, subtle highlights on hair, soft highlights on blazer fabric, expensive editorial look, matte finish, no flat studio lighting and no beauty flash.",
    "Body Safety: all poses must be physiologically natural. Avoid extra fingers, missing fingers, deformed hands, unnatural foot position, limb intersections, excessive wrist bending, excessive neck curve, complex fashion poses and body distortions. Simple natural body positions have priority over visual effect.",
    "Quality: real premium luxury minimal editorial studio session, high realism, natural skin, professional photographer work, authority, quiet luxury mood, no AI image look, no corporate portrait look.",
    "Must not: collage, multi-panel image, contact sheet, grid layout, changed outfit, changed hairstyle, changed makeup, broad smile, corporate portrait, school portrait, passport photo, business headshot, director chair, office chair, bar stool, classic wooden chair, decorative furniture, decor, vases, flowers, interior objects, warm yellow cast, symmetrical official posing, runway posing, overacting, casual home pose, messy hairstyle, complex body plasticity, excessive torso curve, theatrical expression, flat studio lighting, harsh lighting contrast, beauty flash, plastic skin, copied reference clothing, copied reference hairstyle, copied reference makeup, copied reference pose or exact crop.",
    SP009_REFERENCE_BOUNDARY,
  ].join(" ");

  const heroes: HeroComposition[] = [
    {
      id: "HC-001",
      name: "Editorial Portrait",
      shotSize: "Chest-up editorial portrait",
      compositionIntent: "luxury calm authority portrait with visible shoulders, part of torso and generous negative space around the head",
      primaryInteraction: "the subject is captured in a composed quiet moment between directed frames, not formally posing for a business portrait",
      subjectPosition: "chest-up framing, not too tight, shoulders visible, part of torso visible, small torso turn, relaxed asymmetry, dark textured wall behind",
      hands: "hands fully out of frame",
      gaze: "calm authoritative gaze toward camera",
      emotion: "quiet confidence, calm authority, subtle softness, no broad smile",
      sceneSpecificProps: "dark matte textured wall, cool graphite background, large soft side light, soft window gradient, subtle background light patch, no furniture visible",
      lockedElements: "same black oversized blazer, same black top, same loose trousers if visible, same professional salon blowout, same makeup, hands out of frame, no furniture, cool matte grading",
      allowedVariations: "small torso angle, subtle head angle, calm eye contact, generous air around head, soft side shadow, light falloff on background, subtle hair highlights",
      forbiddenSubstitutions: "no corporate headshot, no passport photo, no school portrait, no tight face-only crop, no hands in frame, no hands near face, no broad smile, no warm yellow cast, no symmetrical official pose, no changed outfit, no changed hairstyle",
      promptText:
        "HC-001: id: HC-001. name: Editorial Portrait. shot_size: Chest-up editorial portrait. composition_intent: luxury calm authority portrait with visible shoulders, part of torso and generous negative space around the head. role: quiet luxury opening portrait of the Minimal Black Studio series. primary_interaction: the subject is captured in a composed quiet moment between directed frames, not formally posing for a business portrait. subject_position: chest-up framing, not too tight, shoulders visible, part of torso visible, small torso turn, relaxed asymmetry, dark textured wall behind. hands: hands fully out of frame. gaze: calm authoritative gaze toward camera. emotion: quiet confidence, calm authority, subtle softness, no broad smile. scene_specific_props: dark matte textured wall, cool graphite background, large soft side light, soft window gradient, subtle background light patch, no furniture visible. locked_elements: same black oversized blazer, same black top, same loose trousers if visible, same professional salon blowout, same makeup, hands out of frame, no furniture, cool matte grading. allowed_variations: small torso angle, subtle head angle, calm eye contact, generous air around head, soft side shadow, light falloff on background, subtle hair highlights. forbidden_substitutions: no corporate headshot, no passport photo, no school portrait, no tight face-only crop, no hands in frame, no hands near face, no broad smile, no warm yellow cast, no symmetrical official pose, no changed outfit, no changed hairstyle.",
    },
    {
      id: "HC-002",
      name: "Editorial Cube",
      shotSize: "Seated editorial portrait",
      compositionIntent: "relaxed luxury editorial portrait seated on a low matte cube with natural asymmetry and bare feet if visible",
      primaryInteraction: "the subject sits on a low matte cube in the minimal studio, composed and relaxed as if pausing between directed frames",
      subjectPosition: "seated on a low matte cube, torso slightly turned, one leg bent, second leg freely extended, bare feet naturally touching the floor, relaxed posture, no stool-like stiffness, no runway pose",
      hands: "one hand rests on the knee; the other hand relaxed naturally at the side or on the cube, not near the face",
      gaze: "soft direct or slightly off-camera gaze",
      emotion: "subtle softness, composed calm, no broad smile",
      sceneSpecificProps: "low matte cube, dark textured studio wall, cool shadows, large soft side light, subtle background light patch, soft highlights on blazer fabric",
      lockedElements: "same black oversized blazer, same black top, same black loose trousers, bare feet if visible, same professional salon blowout, same makeup, low matte cube only",
      allowedVariations: "small leg angle, slight torso turn, relaxed hand placement, natural asymmetry, cool matte shadows, gentle light falloff",
      forbiddenSubstitutions: "no director chair, no office chair, no bar stool, no wooden chair, no sofa in this HC, no hands near face, no crossed limbs complexity, no runway pose, no business portrait, no shoes if feet visible, no broad smile, no changed outfit, no changed hairstyle",
      promptText:
        "HC-002: id: HC-002. name: Editorial Cube. shot_size: Seated editorial portrait. composition_intent: relaxed luxury editorial portrait seated on a low matte cube with natural asymmetry and bare feet if visible. role: minimal seated editorial frame built around authority, posture, negative space and soft side light. primary_interaction: the subject sits on a low matte cube in the minimal studio, composed and relaxed as if pausing between directed frames. subject_position: seated on a low matte cube, torso slightly turned, one leg bent, second leg freely extended, bare feet naturally touching the floor, relaxed posture, no stool-like stiffness, no runway pose. hands: one hand rests on the knee; the other hand relaxed naturally at the side or on the cube, not near the face. gaze: soft direct or slightly off-camera gaze. emotion: subtle softness, composed calm, no broad smile. scene_specific_props: low matte cube, dark textured studio wall, cool shadows, large soft side light, subtle background light patch, soft highlights on blazer fabric. locked_elements: same black oversized blazer, same black top, same black loose trousers, bare feet if visible, same professional salon blowout, same makeup, low matte cube only. allowed_variations: small leg angle, slight torso turn, relaxed hand placement, natural asymmetry, cool matte shadows, gentle light falloff. forbidden_substitutions: no director chair, no office chair, no bar stool, no wooden chair, no sofa in this HC, no hands near face, no crossed limbs complexity, no runway pose, no business portrait, no shoes if feet visible, no broad smile, no changed outfit, no changed hairstyle.",
    },
    {
      id: "HC-003",
      name: "Sofa Authority Portrait",
      shotSize: "Medium seated sofa portrait",
      compositionIntent: "status-oriented editorial portrait on a dark leather sofa with calm internal strength",
      primaryInteraction: "the subject sits on a dark leather sofa in a composed luxury editorial moment, looking like the owner of the space",
      subjectPosition: "seated on a dark leather sofa, torso slightly turned, shoulders open, upright but natural posture, calm status, no casual home slouching",
      hands: "one hand rests on the sofa back; the other hand lies freely on the leg, fingers simple and relaxed, no hand supporting the head",
      gaze: "calm gaze toward camera or slightly aside",
      emotion: "calm authority, quiet confidence, inner strength, no broad smile",
      sceneSpecificProps: "dark leather sofa, dark textured studio wall, cool graphite background, large soft side light, soft window gradient, subtle highlights on hair and blazer fabric",
      lockedElements: "same black oversized blazer, same black top, same loose trousers, bare feet if visible, same professional salon blowout, same makeup, dark leather sofa only, face visible, Ruler archetype",
      allowedVariations: "small torso turn, hand on sofa back, relaxed hand on leg, soft side light, cool shadows, cinematic stillness, subtle expression variation",
      forbiddenSubstitutions: "no director chair, no office chair, no low cube in this HC, no bar stool, no hand supporting head, no casual home pose, no symmetrical corporate pose, no legs toward camera, no interlaced fingers, no hand covering mouth or eyes, no runway pose, no business portrait, no broad smile, no changed outfit, no changed hairstyle",
      promptText:
        "HC-003: id: HC-003. name: Sofa Authority Portrait. shot_size: Medium seated sofa portrait. composition_intent: status-oriented editorial portrait on a dark leather sofa with calm internal strength. role: The Ruler archetype portrait where quiet authority, light and posture matter more than visible emotion. primary_interaction: the subject sits on a dark leather sofa in a composed luxury editorial moment, looking like the owner of the space. subject_position: seated on a dark leather sofa, torso slightly turned, shoulders open, upright but natural posture, calm status, no casual home slouching. hands: one hand rests on the sofa back; the other hand lies freely on the leg, fingers simple and relaxed, no hand supporting the head. gaze: calm gaze toward camera or slightly aside. emotion: calm authority, quiet confidence, inner strength, no broad smile. scene_specific_props: dark leather sofa, dark textured studio wall, cool graphite background, large soft side light, soft window gradient, subtle highlights on hair and blazer fabric. locked_elements: same black oversized blazer, same black top, same loose trousers, bare feet if visible, same professional salon blowout, same makeup, dark leather sofa only, face visible, Ruler archetype. allowed_variations: small torso turn, hand on sofa back, relaxed hand on leg, soft side light, cool shadows, cinematic stillness, subtle expression variation. forbidden_substitutions: no director chair, no office chair, no low cube in this HC, no bar stool, no hand supporting head, no casual home pose, no symmetrical corporate pose, no legs toward camera, no interlaced fingers, no hand covering mouth or eyes, no runway pose, no business portrait, no broad smile, no changed outfit, no changed hairstyle.",
    },
    {
      id: "HC-004",
      name: "Ruler Sofa Editorial",
      shotSize: "Luxury sofa editorial portrait",
      compositionIntent: "luxury fashion editorial portrait on a large light designer sofa with rounded soft forms and Ruler archetype presence",
      primaryInteraction: "the subject sits deeper in a large light designer sofa, calm and self-possessed, as if she owns the space",
      subjectPosition: "seated deeper in a large light designer sofa with rounded soft forms, straight back, open shoulders, elegant crossed legs, relaxed but authoritative posture, not tense and not corporate",
      hands: "one hand freely rests on the sofa back; the other hand relaxed on the seat, fingers simple and natural, no hand near face",
      gaze: "calm composed gaze toward camera or slightly aside",
      emotion: "quiet authority, timeless elegance, subtle softness, no broad smile",
      sceneSpecificProps: "large light designer sofa with rounded soft forms, dark textured studio wall, cool graphite background, large soft side window light, soft gradients and subtle highlights",
      lockedElements: "same black oversized blazer, same black top, same loose trousers, bare feet if visible, same professional salon blowout, same makeup, large light designer sofa only, Ruler archetype, face visible",
      allowedVariations: "small torso angle, elegant crossed legs, hand on sofa back, relaxed hand on seat, soft side light, cool shadows, luxury editorial stillness",
      forbiddenSubstitutions: "no low cube in this HC, no dark leather sofa in this HC, no director chair, no office chair, no bar stool, no casual home pose, no tense model pose, no corporate portrait, no hand supporting head, no hands near face, no interlaced fingers, no exaggerated fashion posing, no broad smile, no changed outfit, no changed hairstyle",
      promptText:
        "HC-004: id: HC-004. name: Ruler Sofa Editorial. shot_size: Luxury sofa editorial portrait. composition_intent: luxury fashion editorial portrait on a large light designer sofa with rounded soft forms and Ruler archetype presence. role: final premium magazine frame where the subject looks like the owner of the space: calm, expensive, confident and timeless. primary_interaction: the subject sits deeper in a large light designer sofa, calm and self-possessed, as if she owns the space. subject_position: seated deeper in a large light designer sofa with rounded soft forms, straight back, open shoulders, elegant crossed legs, relaxed but authoritative posture, not tense and not corporate. hands: one hand freely rests on the sofa back; the other hand relaxed on the seat, fingers simple and natural, no hand near face. gaze: calm composed gaze toward camera or slightly aside. emotion: quiet authority, timeless elegance, subtle softness, no broad smile. scene_specific_props: large light designer sofa with rounded soft forms, dark textured studio wall, cool graphite background, large soft side window light, soft gradients and subtle highlights. locked_elements: same black oversized blazer, same black top, same loose trousers, bare feet if visible, same professional salon blowout, same makeup, large light designer sofa only, Ruler archetype, face visible. allowed_variations: small torso angle, elegant crossed legs, hand on sofa back, relaxed hand on seat, soft side light, cool shadows, luxury editorial stillness. forbidden_substitutions: no low cube in this HC, no dark leather sofa in this HC, no director chair, no office chair, no bar stool, no casual home pose, no tense model pose, no corporate portrait, no hand supporting head, no hands near face, no interlaced fingers, no exaggerated fashion posing, no broad smile, no changed outfit, no changed hairstyle.",
    },
  ];

  return heroes.map((hero) => [shared, renderHeroComposition("SP-009", hero)].join(" "));
}function isSp010Style(styleId: string): boolean {
  return styleId === "sp-010-russian-editorial" || styleId === "russian-editorial";
}

function getSp010HeroScenePackages(): string[] {
  const shared = [
    "ID: SP-010.",
    "Name: Russian Editorial.",
    "Category / JTBD: Fine Art Editorial / Modern Cultural Portraits. Create a contemporary authorial editorial photoshoot inspired by Russian aesthetics.",
    "Package Promise: Modern authorial editorial photoshoot inspired by Russian aesthetics. Not folklore, not a historical costume, not a theatrical photoshoot. The result should feel like a fine-art portrait project by a contemporary fashion photographer: museum-inspired, quiet luxury, minimalistic, artistic and timeless.",
    SP010_SERIES_APPEARANCE,
    SP010_SERIES_CONTINUITY,
    SP010_HERO_LIBRARY,
    "Hero Composition contract: each HC must provide id, name, shot_size, composition_intent, primary_interaction, subject_position, hands, gaze, emotion, scene_specific_props, locked_elements, allowed_variations and forbidden_substitutions. Hero Composition does not redefine dress, headpiece, jewelry, hairstyle, makeup, color palette or overall photoshoot style; these come from Series Appearance and Series Continuity.",
    SP010_SCENE,
    SP010_PHOTOGRAPHIC_LANGUAGE,
    SP010_CAMERA_LANGUAGE,
    "Props: use at most one prop per image. Allowed props are one red apple, one red textile bird or one red ribbon. Prefer no prop except when the selected Hero Composition explicitly requires it. Never use multiple props in the same image.",
    "Lighting and camera: directional soft studio light, deep shadows, higher local contrast, sculptural volume, artistic depth, soft matte highlights, realistic skin texture, no beauty flash, no flat lighting and no evenly bright family-studio look. Lighting should feel like expensive fine-art editorial photography.",
    "Quality: premium modern fine-art editorial photoshoot, high realism, natural skin, professional photographer work, intellectual minimal mood, no AI image look, no theatrical costume look.",
    "Must not: collage, multi-panel image, contact sheet, grid layout, changed dress, changed headpiece, changed jewelry, changed hairstyle, changed makeup, historical costume, theatrical Russian folk costume, oversized kokoshnik, large traditional kokoshnik, crown, tiara, sarafan, folk festival, matryoshka, samovar, excessive folklore, rustic atmosphere, vintage countryside mood, red ornament wall, large folk patterns, overloaded props, multiple props at once, fashion poses, hands near face, exaggerated expressions, excessive retouching, plastic skin, copied reference clothing, copied reference hairstyle, copied reference makeup, copied reference pose or exact crop.",
    SP010_REFERENCE_BOUNDARY,
  ].join(" ");

  const heroes: HeroComposition[] = [
    {
      id: "HC-001",
      name: "Hero Close Portrait",
      shotSize: "Close Portrait",
      compositionIntent: "fine-art close portrait with emphasis on face, eyes, red headpiece and restrained intellectual presence",
      primaryInteraction: "the subject is photographed closely against a dark cool minimal artistic background",
      subjectPosition: "tight close portrait, face occupies approximately 60% of the frame, hands fully out of frame, minimal dark background",
      hands: "hands completely out of frame",
      gaze: "strong natural eye contact with the camera",
      emotion: "calm intellectual confidence, refined and minimal",
      sceneSpecificProps: "no prop in frame; compact red kokoshnik-inspired headband and red necklace visible if framing allows",
      lockedElements: "Close Portrait, face about 60% of frame, strong eye contact, hands out of frame, dark cool background, same white textured dress, same compact red headband, same jewelry, same hairstyle, same makeup",
      allowedVariations: "subtle head angle, calm direct eye contact, soft large curls around face, directional soft light, deep navy or charcoal background texture",
      forbiddenSubstitutions: "no hands in frame, no hands near face, no prop, no standing pose, no full body shot, no oversized kokoshnik, no folk costume, no sarafan, no theatrical expression, no warm rustic background, no changed headpiece, no changed dress, no changed hairstyle",
      promptText:
        "HC-001: id: HC-001. name: Hero Close Portrait. shot_size: Close Portrait. composition_intent: fine-art close portrait with emphasis on face, eyes, red headpiece and restrained intellectual presence. role: main close portrait of the modern Russian fine-art editorial series. primary_interaction: the subject is photographed closely against a dark cool minimal artistic background. subject_position: tight close portrait, face occupies approximately 60% of the frame, hands fully out of frame, minimal dark background. hands: hands completely out of frame. gaze: strong natural eye contact with the camera. emotion: calm intellectual confidence, refined and minimal. scene_specific_props: no prop in frame; compact red kokoshnik-inspired headband and red necklace visible if framing allows. locked_elements: Close Portrait, face about 60% of frame, strong eye contact, hands out of frame, dark cool background, same white textured dress, same compact red headband, same jewelry, same hairstyle, same makeup. allowed_variations: subtle head angle, calm direct eye contact, soft large curls around face, directional soft light, deep navy or charcoal background texture. forbidden_substitutions: no hands in frame, no hands near face, no prop, no standing pose, no full body shot, no oversized kokoshnik, no folk costume, no sarafan, no theatrical expression, no warm rustic background, no changed headpiece, no changed dress, no changed hairstyle.",
    },
    {
      id: "HC-002",
      name: "Standing Three-quarter Portrait",
      shotSize: "Three-quarter Portrait",
      compositionIntent: "standing three-quarter fine-art portrait with small torso turn and calm confident posture",
      primaryInteraction: "the subject stands calmly in the dark artistic studio, using posture and silhouette as the main visual language",
      subjectPosition: "standing three-quarter portrait, slight torso turn, relaxed shoulders, elegant natural posture, visible dress volume and sleeves",
      hands: "hands relaxed low, lightly resting together or along the dress, no hand near face, no complex gesture",
      gaze: "calm gaze toward camera or slightly aside",
      emotion: "quiet confidence, restrained editorial presence",
      sceneSpecificProps: "no prop; deep navy, midnight blue or charcoal artistic background",
      lockedElements: "Three-quarter Portrait, standing pose, slight torso turn, relaxed shoulders, same dress, same compact red headband, same necklace, same earrings, same hairstyle, same makeup",
      allowedVariations: "small torso angle, relaxed low hand placement, calm direct or slight side gaze, sculptural directional light, dark matte background",
      forbiddenSubstitutions: "no seated pose, no hands near face, no necklace-touch gesture, no prop, no folk pattern wall, no red ornament background, no oversized kokoshnik, no changed dress, no changed headpiece, no changed jewelry, no changed hairstyle",
      promptText:
        "HC-002: id: HC-002. name: Standing Three-quarter Portrait. shot_size: Three-quarter Portrait. composition_intent: standing three-quarter fine-art portrait with small torso turn and calm confident posture. role: standing portrait that shows the white textured dress and modern designer silhouette against a dark cool background. primary_interaction: the subject stands calmly in the dark artistic studio, using posture and silhouette as the main visual language. subject_position: standing three-quarter portrait, slight torso turn, relaxed shoulders, elegant natural posture, visible dress volume and sleeves. hands: hands relaxed low, lightly resting together or along the dress, no hand near face, no complex gesture. gaze: calm gaze toward camera or slightly aside. emotion: quiet confidence, restrained editorial presence. scene_specific_props: no prop; deep navy, midnight blue or charcoal artistic background. locked_elements: Three-quarter Portrait, standing pose, slight torso turn, relaxed shoulders, same dress, same compact red headband, same necklace, same earrings, same hairstyle, same makeup. allowed_variations: small torso angle, relaxed low hand placement, calm direct or slight side gaze, sculptural directional light, dark matte background. forbidden_substitutions: no seated pose, no hands near face, no necklace-touch gesture, no prop, no folk pattern wall, no red ornament background, no oversized kokoshnik, no changed dress, no changed headpiece, no changed jewelry, no changed hairstyle.",
    },
    {
      id: "HC-003",
      name: "Chair Portrait with Red Apple",
      shotSize: "Three-quarter Portrait",
      compositionIntent: "seated chair portrait with one red apple as the only accent object",
      primaryInteraction: "the subject sits on a simple chair and holds one red apple naturally as a restrained crimson accent",
      subjectPosition: "seated on a chair, torso slightly turned, relaxed upright posture, three-quarter framing, dark artistic background, no theatrical posing",
      hands: "hands hold exactly one red apple naturally at lap or waist level, not near the face, no complex finger pose",
      gaze: "natural gaze toward camera or softly aside",
      emotion: "thoughtful calm expression, intelligent and subtle",
      sceneSpecificProps: "exactly one red apple only; simple chair; dark navy or charcoal artistic background",
      lockedElements: "Three-quarter Portrait, seated on chair, one red apple only, same dress, same compact red headband, same jewelry, same hairstyle, same makeup",
      allowedVariations: "red apple in lap or hands, small torso turn, natural hand placement around apple, thoughtful expression, directional soft light",
      forbiddenSubstitutions: "no multiple props, no textile bird in this HC, no ribbon in this HC, no hands near face, no standing pose, no floor pose, no complex body twist, no folk costume, no matryoshka, no samovar, no theatrical posing, no changed dress, no changed headpiece, no changed hairstyle",
      promptText:
        "HC-003: id: HC-003. name: Chair Portrait with Red Apple. shot_size: Three-quarter Portrait. composition_intent: seated chair portrait with one red apple as the only accent object. role: seated fine-art editorial portrait with restrained symbolic red accent. primary_interaction: the subject sits on a simple chair and holds one red apple naturally as a restrained crimson accent. subject_position: seated on a chair, torso slightly turned, relaxed upright posture, three-quarter framing, dark artistic background, no theatrical posing. hands: hands hold exactly one red apple naturally at lap or waist level, not near the face, no complex finger pose. gaze: natural gaze toward camera or softly aside. emotion: thoughtful calm expression, intelligent and subtle. scene_specific_props: exactly one red apple only; simple chair; dark navy or charcoal artistic background. locked_elements: Three-quarter Portrait, seated on chair, one red apple only, same dress, same compact red headband, same jewelry, same hairstyle, same makeup. allowed_variations: red apple in lap or hands, small torso turn, natural hand placement around apple, thoughtful expression, directional soft light. forbidden_substitutions: no multiple props, no textile bird in this HC, no ribbon in this HC, no hands near face, no standing pose, no floor pose, no complex body twist, no folk costume, no matryoshka, no samovar, no theatrical posing, no changed dress, no changed headpiece, no changed hairstyle.",
    },
    {
      id: "HC-004",
      name: "Low Podium Editorial Portrait",
      shotSize: "Editorial Sitting Portrait",
      compositionIntent: "floor or low podium editorial portrait with the white dress spreading sculpturally around the subject",
      primaryInteraction: "the subject sits calmly on the studio floor or a low dark podium, with the white textured dress naturally spreading around her",
      subjectPosition: "seated on the floor or low podium, relaxed natural posture, dress spreads beautifully around, no second chair pose, no complex plasticity",
      hands: "hands relaxed on lap, dress or floor, not near the face and not covering the face",
      gaze: "natural calm gaze toward camera or softly aside",
      emotion: "quiet thoughtful presence, calm and timeless",
      sceneSpecificProps: "minimal dark artistic background, dress spread naturally around the seated pose, no required prop",
      lockedElements: "Editorial Sitting Portrait, floor or low podium pose, dress naturally spread around, hands relaxed, same dress, same headband, same jewelry, same hairstyle, same makeup",
      allowedVariations: "relaxed leg angle, natural hand placement, dress folds spreading around, sculptural soft shadows, subtle expression variation",
      forbiddenSubstitutions: "no standing pose, no chair pose, no multiple props, no hands near face, no hands covering face, no complex body bend, no fashion pose, no oversized kokoshnik, no folk costume, no sarafan, no matryoshka, no samovar, no changed dress, no changed headpiece, no changed hairstyle",
      promptText:
        "HC-004: id: HC-004. name: Low Podium Editorial Portrait. shot_size: Editorial Sitting Portrait. composition_intent: floor or low podium editorial portrait with the white dress spreading sculpturally around the subject. role: widest calm fine-art editorial sitting portrait of the series. primary_interaction: the subject sits calmly on the studio floor or a low dark podium, with the white textured dress naturally spreading around her. subject_position: seated on the floor or low podium, relaxed natural posture, dress spreads beautifully around, no second chair pose, no complex plasticity. hands: hands relaxed on lap, dress or floor, not near the face and not covering the face. gaze: natural calm gaze toward camera or softly aside. emotion: quiet thoughtful presence, calm and timeless. scene_specific_props: minimal dark artistic background, dress spread naturally around the seated pose, no required prop. locked_elements: Editorial Sitting Portrait, floor or low podium pose, dress naturally spread around, hands relaxed, same dress, same headband, same jewelry, same hairstyle, same makeup. allowed_variations: relaxed leg angle, natural hand placement, dress folds spreading around, sculptural soft shadows, subtle expression variation. forbidden_substitutions: no standing pose, no chair pose, no multiple props, no hands near face, no hands covering face, no complex body bend, no fashion pose, no oversized kokoshnik, no folk costume, no sarafan, no matryoshka, no samovar, no changed dress, no changed headpiece, no changed hairstyle.",
    },
  ];

  return heroes.map((hero) => [shared, renderHeroComposition("SP-010", hero)].join(" "));
}
function getHeroScenePackagesForPhotoshoot(photoshoot: Photoshoot): string[] {
  if (isSp005Style(photoshoot.style_id)) return getSp005HeroScenePackages();
  if (isSp006Style(photoshoot.style_id)) return getSp006HeroScenePackages();
  if (isSp007Style(photoshoot.style_id)) return getSp007HeroScenePackages();
  if (isSp008Style(photoshoot.style_id)) return getSp008HeroScenePackages();
  if (isSp009Style(photoshoot.style_id)) return getSp009HeroScenePackages();
  if (isSp010Style(photoshoot.style_id)) return getSp010HeroScenePackages();
  return getSp004HeroScenePackages();
}

function shouldRunHeroCompositionSet(photoshoot: Photoshoot, options: MvpGenerationOptions): boolean {
  return ENABLE_SP004_HERO_COMPOSITION_SET_EXPERIMENT && !options.scenePrompt && (photoshoot.style_id === "dating" || isSp005Style(photoshoot.style_id) || isSp006Style(photoshoot.style_id) || isSp007Style(photoshoot.style_id) || isSp008Style(photoshoot.style_id) || isSp009Style(photoshoot.style_id) || isSp010Style(photoshoot.style_id));
}
function buildBodyLayer(photoshoot: Photoshoot): string {
  const snapshotGender = getPersonaSnapshotString(photoshoot, "gender");
  const gender = (snapshotGender ?? photoshoot.gender) === "man" ? "man" : "woman";
  const heightCm =
    typeof photoshoot.height_cm === "number" && Number.isFinite(photoshoot.height_cm)
      ? photoshoot.height_cm
      : getPersonaSnapshotNumber(photoshoot, "height");
  const weightKg =
    typeof photoshoot.weight_kg === "number" && Number.isFinite(photoshoot.weight_kg)
      ? photoshoot.weight_kg
      : getPersonaSnapshotNumber(photoshoot, "weight");
  const heightProfile = getPersonaSnapshotString(photoshoot, "heightProfile");
  const bodyBuild = getPersonaSnapshotString(photoshoot, "bodyBuild");
  const figureType = getPersonaSnapshotString(photoshoot, "figureType");
  const bustSize = getPersonaSnapshotString(photoshoot, "bustSize");
  const physique = getPersonaSnapshotString(photoshoot, "physique");
  const bodyType = (bodyBuild ?? photoshoot.body_type) || "unknown";
  const hasBodyMeasurements = heightCm !== null && weightKg !== null;
  const questionnaireGuidance = [
    heightProfile ? `height class: ${heightProfile}` : null,
    bodyBuild ? `body build: ${bodyBuild}` : null,
    figureType ? `figure proportions: ${figureType}` : null,
    bustSize ? `bust proportions: ${bustSize}` : null,
    physique ? `physique: ${physique}` : null,
  ].filter((line): line is string => Boolean(line));

  const bodyLayer = [
    "Body profile:",
    `gender: ${gender}`,
    `height: ${hasBodyMeasurements ? `${heightCm} cm` : "unknown"}`,
    `approximate weight: ${hasBodyMeasurements ? `${weightKg} kg` : "unknown"}`,
    `body type: ${bodyType}`,
    "clothing size: unknown",
    "body notes: use only known profile fields; do not invent body measurements.",
    "",
    "Preserve the person's real-world body presence from the profile.",
    "Keep the head-to-body ratio natural for an adult portrait.",
    "Keep shoulders, torso, waist, hips, arms and legs proportionate to each other.",
    "Use a believable non-model body, not fashion-catalog proportions.",
    "The person should look like a real client in a professional photoshoot, not a retouched model.",
    "Clothing should follow the actual body volume naturally.",
    "Do not make the body thinner, taller, younger or more model-like than the body profile.",
    "Avoid oversized head, small body with large face, slimming, elongated legs, doll-like proportions or changing body type because of the scene or clothing.",
  ];

  if (questionnaireGuidance.length > 0) {
    bodyLayer.push(
      "",
      "User-provided visual body profile:",
      ...questionnaireGuidance,
      "Use these selections as neutral proportional guidance.",
      "Do not reinterpret them as health, attractiveness or fashion-model categories.",
      "Do not override the person's visible identity and natural real-world proportions.",
    );
  }

  if (hasBodyMeasurements) {
    bodyLayer.push(
      "",
      "Body Proportions Guidance:",
      "Use the provided height and weight only as a proportional reference.",
      "Preserve realistic adult body proportions matching the user profile.",
      "Do not transform the person into a fashion model body type.",
      "Do not make the body noticeably slimmer, taller, longer-legged, longer-necked, or more athletic than implied by the user profile.",
      "Do not shrink waist, arms, shoulders, hips or thighs beyond realistic profile-based proportions.",
      "Maintain natural neck length, natural shoulder width, natural torso length and natural leg proportions.",
      "Body realism is more important than idealized model proportions.",
    );
  }

  return bodyLayer.join("\n");
}

function buildMvpPromptWithScenePackage(photoshoot: Photoshoot, scenePackage: string): string {
  const { seriesAndScene, heroComposition } = splitSceneAndHeroPrompt(scenePackage);
  const poseAnatomySafety = heroComposition ? getPoseAnatomySafety(heroComposition) : null;
  const layers = [
    "Generation task: create one new realistic professional photograph of the Persona for the selected scene package and current Hero Composition.",
    [IDENTITY_V2, IDENTITY_AND_COMPOSITION_CONTRACT].join(" "),
    [buildBodyLayer(photoshoot), buildProfileAttributeLayer(photoshoot), AGE_V1].join("\n\n"),
    seriesAndScene,
    heroComposition ? `Current Hero Composition - highest priority for variable traits:\n${heroComposition}` : null,
    poseAnatomySafety,
    [REALISM_V1, STYLE_MVP].join(" "),
    "Short constraints: one photograph only; preserve identity and realistic anatomy; follow the current Hero Composition; no collage, grid, contact sheet, pasted face or copied reference pose.",
  ].filter((layer): layer is string => Boolean(layer));

  if (process.env.NODE_ENV !== "production") {
    console.debug("[MVP generation] prompt layer order", [
      "GENERATION_TASK",
      "IDENTITY",
      "PERSONA_APPEARANCE",
      "SERIES_AND_SCENE",
      heroComposition ? "CURRENT_HERO_COMPOSITION" : null,
      poseAnatomySafety ? "POSE_ANATOMY_SAFETY" : null,
      "REALISM",
      "SHORT_CONSTRAINTS",
    ].filter(Boolean));
  }

  return layers.join("\n\n");
}

function buildMvpPrompt(photoshoot: Photoshoot, scenePrompt?: string): string {
  return buildMvpPromptWithScenePackage(photoshoot, getScenePackage(photoshoot, scenePrompt));
}


function getPersonaSnapshotPhotoKeys(photoshoot: Photoshoot): string[] {
  const snapshot = photoshoot.persona_snapshot;
  if (!snapshot || Array.isArray(snapshot) || typeof snapshot !== "object") return [];
  const photos = snapshot.photos;
  if (!Array.isArray(photos)) return [];
  return photos.filter((value): value is string => typeof value === "string" && value.length > 0);
}
export async function startMvpGenerationForPhotoshoot(
  photoshootId: string,
  options: MvpGenerationOptions = {},
): Promise<MvpGenerationResult> {
  const sessionClient = await createClient();
  const userId = options.userId;
  const {
    data: { user },
  } = userId ? { data: { user: null } } : await sessionClient.auth.getUser();
  const ownerId = userId || user?.id;

  if (!ownerId) {
    throw new Error("Authentication required.");
  }

  const { data: photoshoot, error } = await sessionClient
    .from("photoshoots")
    .select("*")
    .eq("id", photoshootId)
    .eq("user_id", ownerId)
    .single();

  if (error || !photoshoot) {
    throw new Error("Photoshoot not found.");
  }

  const personaReferenceKeys = getPersonaSnapshotPhotoKeys(photoshoot);
  if (personaReferenceKeys.length === 0) {
    throw new Error("Photoshoot Persona snapshot has no reference photos.");
  }

  if (["generating", "completed", "failed", "cancelled"].includes(photoshoot.status)) {
    return {
      predictionId: photoshoot.generation_id?.split(",")[0]?.trim() || "",
      resultImages: photoshoot.result_images || [],
    };
  }

  if (photoshoot.status !== "queued") {
    throw new Error("PHOTOSHOOT_NOT_QUEUED");
  }

  const serviceClient = createServiceRoleClient();
  const claimed = await claimPhotoshootGeneration(serviceClient, photoshoot.id);
  if (!claimed) {
    const { data: current } = await serviceClient
      .from("photoshoots")
      .select("generation_id,result_images")
      .eq("id", photoshoot.id)
      .single();
    return {
      predictionId: current?.generation_id?.split(",")[0]?.trim() || "",
      resultImages: current?.result_images || [],
    };
  }

  const referenceKeys = selectPersonaReferenceKeys(personaReferenceKeys, options.referenceCount);
  const referenceUrls: string[] = [];

  if (process.env.NODE_ENV !== "production") {
    console.debug("[MVP generation] Persona reference selection", {
      sourceCount: personaReferenceKeys.length,
      selectedCount: referenceKeys.length,
      selectedIndexes: referenceKeys.map((key) => personaReferenceKeys.indexOf(key)),
    });
  }

  for (const [index, key] of referenceKeys.entries()) {
    const crop = await createIdentityReferenceCrop(photoshoot.id, key, index + 1);
    referenceUrls.push(await createSignedReadUrl(crop.key));

    if (process.env.NODE_ENV !== "production") {
      console.debug("[MVP generation] prepared identity reference", {
        selectedIndex: index,
        width: crop.width,
        height: crop.height,
      });
    }
  }

  const replicate = new Replicate({ auth: getReplicateApiToken() });
  const version = await getLatestModelVersion();

  const shouldWaitForCompletion = options.waitForCompletion ?? true;
  const webhookUrl = `${getSiteUrl()}/api/webhooks/replicate/generation?secret=${getWebhookSecret()}&photoshootId=${photoshoot.id}`;

  const shouldRunHeroSet = shouldRunHeroCompositionSet(photoshoot, options);

  if (shouldRunHeroSet) {
    const heroScenePackages = getHeroScenePackagesForPhotoshoot(photoshoot);
    const predictionIds: string[] = [];
    const resultImages: string[] = [];

    for (const [heroIndex, heroScenePackage] of heroScenePackages.entries()) {
      const prediction = (await createPredictionWithRateLimit(replicate, {
        version,
        input: {
          prompt: buildMvpPromptWithScenePackage(photoshoot, heroScenePackage),
          input_images: referenceUrls,
          aspect_ratio: "2:3",
          quality: "high",
          output_format: "jpeg",
          number_of_images: 1,
          output_compression: 95,
        },
        ...(shouldWaitForCompletion
          ? {}
          : {
              webhook: webhookUrl,
              webhook_events_filter: ["completed"],
            }),
      })) as ReplicatePredictionResponse;

      predictionIds.push(prediction.id);

      await serviceClient
        .from("photoshoots")
        .update({ generation_id: predictionIds.join(",") })
        .eq("id", photoshoot.id);

      if (!shouldWaitForCompletion) {
        continue;
      }

      const completedPrediction = await waitForPrediction(replicate, prediction.id);

      if (completedPrediction.status !== "succeeded") {
        if (resultImages.length === 0) {
          await updatePhotoshootStatus(serviceClient, photoshoot.id, "failed");
          throw new Error(completedPrediction.error || `Prediction ${completedPrediction.status}`);
        }

        continue;
      }

      const outputUrls = getOutputUrls(completedPrediction.output);

      for (const [outputIndex, url] of outputUrls.entries()) {
        resultImages.push(await saveGeneratedImage(photoshoot.id, url, heroIndex + outputIndex + 1));
      }
    }

    if (!shouldWaitForCompletion) {
      return {
        predictionId: predictionIds.join(","),
        resultImages: [],
      };
    }

    await updatePhotoshootGenerationStatus(serviceClient, photoshoot.id, "completed", resultImages);

    return {
      predictionId: predictionIds.join(","),
      resultImages,
    };
  }

  const prediction = (await createPredictionWithRateLimit(replicate, {
    version,
    input: {
      prompt: buildMvpPrompt(photoshoot, options.scenePrompt),
      input_images: referenceUrls,
      aspect_ratio: "2:3",
      quality: "high",
      output_format: "jpeg",
      number_of_images: 1,
      output_compression: 95,
    },
    ...(shouldWaitForCompletion
      ? {}
      : {
          webhook: webhookUrl,
          webhook_events_filter: ["completed"],
        }),
  })) as ReplicatePredictionResponse;

  await serviceClient
    .from("photoshoots")
    .update({ generation_id: prediction.id })
    .eq("id", photoshoot.id);

  if (!shouldWaitForCompletion) {
    return {
      predictionId: prediction.id,
      resultImages: [],
    };
  }

  const completedPrediction = await waitForPrediction(replicate, prediction.id);

  if (completedPrediction.status !== "succeeded") {
    await updatePhotoshootStatus(serviceClient, photoshoot.id, "failed");
    throw new Error(completedPrediction.error || `Prediction ${completedPrediction.status}`);
  }

  const outputUrls = getOutputUrls(completedPrediction.output);

  if (!outputUrls.length) {
    await updatePhotoshootStatus(serviceClient, photoshoot.id, "failed");
    throw new Error("Prediction succeeded without output images.");
  }

  const resultImages: string[] = [];
  for (const [index, url] of outputUrls.entries()) {
    resultImages.push(await saveGeneratedImage(photoshoot.id, url, index + 1));
  }

  await updatePhotoshootGenerationStatus(serviceClient, photoshoot.id, "completed", resultImages);

  return {
    predictionId: completedPrediction.id,
    resultImages,
  };
}
