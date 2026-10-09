# Bundled media credits

Every file below is downloaded into this game (`public/images/scares`, `public/sounds`)
rather than hot-linked, so the game works offline and no URL can rot. Each licence
permits reuse; attribution is shown on screen during the scare and repeated here.

## Jump-scare photographs — Wikimedia Commons

| File | Title | Author | Licence | Source |
| --- | --- | --- | --- | --- |
| `face-zombie.jpg` | Zombie Walk — Into The Lens | Anthony Ingram-Westover | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Zombie_Walk_-_Into_The_Lens.jpg |
| `face-clown.jpg` | Horror Clown Maske | Unlisted Commons contributor | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Horror_Clown_Maske.jpg |
| `face-mask.jpg` | Zombie Halloween Mask | Unlisted Commons contributor | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Zombie_Halloween_Mask.jpg |
| `face-family.jpg` | Scary Zombie Family Faces | Joe Shlabotnik | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Scary_Zombie_Family_Faces_(15482446698).jpg |
| `doll.jpg` | Creepy Doll, Barnaul, Russia | Anjum Vahanvati | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Creepy_Doll,_Barnaul,_Russia_(21454199012).jpg |
| `skull.jpg` | Human skull of a boy (anatomical specimen) | Unlisted Commons contributor | CC BY 3.0 de | https://commons.wikimedia.org/wiki/File:Anthroplogy_-_human_skull_of_a_boy.JPG |
| `zombie-horde.jpg` | Zombie Walk Cannes 2013 | Unlisted Commons contributor | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Zombie_Walk_Cannes_2013.JPG |
| `noh-ghost.jpg` | Shuosai — Yase-Onna ("Grieving Woman"), mask for a ghost role in a Nō play | Walters Art Museum | Public domain | https://commons.wikimedia.org/wiki/File:Shuosai_-_Yase-Onna_(%22Grieving_Woman%22)_Mask_for_a_Ghost_Role_in_a_No_Play_-_Walters_61251.jpg |

Kid mode only draws `noh-ghost.jpg`, `skull.jpg`, `face-mask.jpg` and `doll.jpg`
(the non-gory half of the set) and drops every blood layer.

## Scream audio — Wikimedia Commons

| File | Title | Licence | Source |
| --- | --- | --- | --- |
| `scream-wilhelm.ogg` | Wilhelm Scream | CC0 (public-domain dedication — no attribution required) | https://commons.wikimedia.org/wiki/File:Wilhelm_Scream.ogg |
| `scream-human.wav` | Scream-e (voice "e") | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Scream-e.wav |

Both are played through the game's sound engine, layered under the synthesised
sting, and both respect the 🔇 master mute.

## Replacing them

Drop your own files in the same folders and update `SCARE_PHOTOS` in
`src/horrorArt.tsx` (and the audio paths in `SoundEngine.init`) — nothing else
needs to change. Relative paths (`images/scares/...`) are used so the game also
works when it is served from a sub-path such as `/tutorly-games/...`.
