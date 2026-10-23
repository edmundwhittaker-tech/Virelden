# Neutral armour fit diagnostic — not release acceptance

Base reference: main18e725722001b12698091b6a4dc08b47f94f0149. Isolated candidate; no change to the live game is authorized by a successful diagnostic.

## Evidence and diagnosis

The original Ward front/rear atlas pixels and actual source registrations were inspected. Existing main's native neutral pose has a large cuirass/helmet assembly over zig-zag knees, a diagonal tasset registration, near thighs drawn on top of the fauld/tassets and long loose arms. This matches the owner's complaint about standing as well as walking. Gait cadence changes cannot repair these defects.

The target is a polished video-game idle/ready silhouette and responsive transitions, using Elden Ring as a movement reference, adapted rather than copied. Official publisher clips at https://static.bandainamcoent.eu/video/eldenring-kf-02-animated-new.webm and https://static.bandainamcoent.eu/video/eldenring-kf-03-animated-new.webm were inspected for stance/carry/body cohesion. They do not establish a complete plated walk-cycle reference, and no game art is included in this repository.

## Bounded fit prototype

- Separate the hip locations from the pelvis art's horizontal registration: the tasset assembly no longer follows a hip-to-hip diagonal.
- Put both thigh assemblies behind the fauld/tassets rather than allowing the near thigh to cut across the cuirass.
- Reduce the oversized torso/head internal fit axes from31/17 to24/15 pixels while retaining roughly88px outer stature. Keep18/20px leg chains, with nearly aligned neutral hips/knees/ankles instead of a large permanent knee break.
- Tuck the shoulders and bring relaxed wrists upward, with two10.5px arm segments. Shared two-hand carry center is raised2.5px to retain exact shaft registration within the shorter chain's reachable region.
- Keep all original armour pixels and independent four-slot swapping. No new artwork, cloth, open helmet, physics, movement speed or save changes.

The actual-renderer diagnostic compares main and candidate at native scale across front/rear and both mirrors; sword, spear and unarmed; Ward, Delver, Marcher and three representative mixed outfits. A fixed main reference evaluator is retained only under tests/fixtures/reference. Both rows use the production Phaser armour renderer. The optional evaluator constructor parameter is test injection; gameplay uses the candidate default on this isolated branch only.

## Explicit limits

This is STANDING evidence only, not a walking-animation acceptance. The old global-clock walk remains a known unsuitable placeholder and will need actual projected-travel/contact-owned trajectories and responsive state transitions. Foot-art scale/sole registration and tasset length still need visual judgment. Exact side/north/south artwork is not newly authored; current two three-quarter views and mirroring remain.

The existing full regression suite intentionally has outstanding geometry/interaction expectations after changed proportions. Contact, two-hand support, roll, lever reach, state transitions, all armour/weapon combinations and saved campaign behavior must be revalidated before adoption. Do not weaken acceptance assertions merely to make this branch green. This workflow runs build and the specifically labelled neutral diagnostic, NOT release acceptance. No main merge, Pages publication or live replacement is part of this branch.

## Post-review interaction work (not gameplay acceptance)

The owner/root accepted the fitted standing direction after native sword/spear/mirror/mixed-set inspection. The fitted21px arm chains and24px torso cannot honestly reach the old49px-forward handle position. Station and both service-lever operating stances are therefore moved8screenpx closer exactly once at interaction start (world delta +5,−5). Lever positions/grip paths are unchanged. The fitted torso rotates about the same pelvis; feet stay fixed for every pull sample. Actual production gauntlet-image transforms are exposed read-only for native303sample auditing. The pre-existing one-time interaction entry alignment still requires gameplay/approach visual review; this isolated pull fixture does not prove it is seamless.

Updated pure tests retain exact fixed fitted limb lengths and use the new18→41px operating range rather than pretending the old49px target is reachable. Remaining old walk/support and view-registration tests are not disabled; projected locomotion must replace their obsolete global-clock model honestly before release. Legacy NPC HUMAN_BODY remains unchanged; a distinct player target provider is required when current player-pose contact is integrated.
