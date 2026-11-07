/**
 * the words word wheel knows (readme 7.19): common english words of three
 * to seven letters, lowercase, no plurals, nothing rude. the grid's words
 * come from here, and so do the extra words. where british and american
 * spelling differ, both are in (color and colour), since either may be
 * the one you reach for. a real word that isn't here is quietly refused.
 *
 * kept as plain text, one line per first letter, and only turned into a
 * list the first time word wheel asks, so nothing else pays for it.
 */

const THREE = `
ace act add ado age ago aid ail aim air ale all amp and ant any ape apt arc are ark arm art ash ask ate awe axe
bad bag ban bar bat bay bed bee beg bet bib bid big bin bit bow box boy bud bug bun bus but buy bye
cab can cap car cat cob cod cog cop cot cow coy cry cub cue cup cut
dab dad dam day den dew did die dig dim din dip doe dog dot dry dud due dug duo dye
ear eat ebb eel egg ego elf elk elm emu end era eve ewe eye
fad fan far fat fax fed fee few fig fin fir fit fix flu fly foe fog for fox fry fun fur
gap gas gel gem get gig gnu got gum gut guy gym
had ham has hat hay hem hen her hid him hip his hit hoe hog hop hot how hub hue hug hum hut
ice icy ill imp ink inn ion ire irk its ivy
jab jam jar jaw jay jet jig job jog jot joy jug
keg key kid kin kit
lab lad lag lap law lax lay led leg let lid lie lip lit lob log lot low lug
mad man map mat may men met mid mix mob mop mow mud mug mum
nab nag nap net new nib nil nip nod nor not now nun nut
oaf oak oar oat odd ode off oil old one opt orb ore our out owe owl own
pad pal pan par pat paw pay pea peg pen pep per pet pew pie pig pin pit ply pod pop pot pro pry pub pug pun pup put
rag ram ran rap rat raw ray red ref rib rid rig rim rip rob rod roe rot row rub rug rum run rut rye
sad sag sap sat saw sax say sea see set sew she shy sin sip sir sit six ski sky sly sob son sow soy spa spy sty sub sum sun
tab tad tag tan tap tar tax tea tee ten the tie tin tip toe ton too top tot tow toy try tub tug two
urn use
van vat vet vex via vie vow
wag was wax way web wed wet who why wig win wit woe wok won woo wow
yak yam yap yes yet yew you
zap zen zip zoo
`;

const FOUR = `
able ache acid aged aide airy ajar akin also alto amid apex aqua arch area aria army atom aunt aura auto avid away awed awry axis
baby back bail bait bake bald bale ball balm band bang bank bare bark barn base bash bath bead beak beam bean bear beat beef been beep beer beet bell belt bend bent best bike bill bind bird bite blew blob blot blow blue blur boar boat body boil bold bolt bond bone bony book boom boot bore born boss both bout bowl brag bran brew brim brow buck bulb bulk bull bump bunk buoy burn bury bush busy buzz
cafe cage cake calf call calm came camp cane cape card care cart case cash cask cast cave cell cent chap char chat chef chew chin chip chop cite city clad clam clan clap claw clay clip clog clot club clue coal coat coax code coil coin cola cold colt comb come cone cook cool coop cope copy cord core cork corn cost cosy cozy crab crew crib crop crow crux cube cuff cult curb cure curl cute
dale dame damp dare dark darn dart dash data date dawn deal dear debt deck deed deem deep deer deft demo dent deny desk dial dice diet dime dine dire dirt disc dish disk dive dock dome done doom door dose dote dove down doze drab drag draw drew drip drop drum dual duck duct duel duet duke dull dune dusk dust duty
each earl earn ease east easy echo edge edgy edit else emit envy epic even ever evil exam exit
face fact fade fail fair fake fall fame fare farm fast fate fawn fear feat feed feel fell felt fern feud file fill film find fine fire firm fish fist five flag flap flat flaw flax flea fled flew flex flip flit flop flow flux foal foam foil fold folk fond font food fool foot fork form fort foul four fowl fray free fret frog from fuel full fume fund fuse fuss
gain gait gala gale game gang gape gash gasp gate gave gaze gear gift gild gill gilt girl gist give glad glee glen glib glow glue glum gnat gnaw goal goat gold golf gone gong good gown grab gram gray grew grey grid grim grin grip grit grow grub gulf gull gulp gush gust
hail hair half hall halo halt hand hang hard hare harm harp hash hate haul have hawk haze hazy head heal heap hear heat heed heel heir held helm help herb herd here hero hers hide high hike hill hilt hind hint hire hive hoax hold hole holy home hone hood hoof hook hoop hoot hope horn hose host hour howl huge hull hump hung hunt hurl hurt hush husk hymn
icon idea idle idol inch info into iron isle item
jail jazz jeep jest join joke jolt jump junk jury just
keel keen keep kelp kept kick kind king kiss kite knee knew knit knob knot know
lace lack lacy lady laid lain lair lake lamb lame lamp land lane lard lark last late lava lawn lazy lead leaf leak lean leap left lend lens lent less liar lick lied life lift like lily limb lime limp line link lint lion lisp list live load loaf loam loan lobe lock loft logo lone long look loom loop loot lord lore lose loss lost loud love luck lull lump lung lure lurk lush lute
made maid mail main make male mall malt mane many mare mark mash mask mass mast mate math maze meal mean meat meek meet meld melt memo mend menu mere mesh mess mice mild mile milk mill mime mind mine mint mire miss mist mite moan moat mock mode mold mole monk mood moon moor moot more moss most moth move much muck mule mull muse must mute myth
nail name nape navy near neat neck need neon nest news next nice nine node none nook noon norm nose note noun
oath obey odor oily omen once only onto ooze open oral oven over owed
pace pack pact page paid pail pain pair pale palm pane pant pare park part pass past path pave peak peal pear peck peel peep peer pelt perk pest pick pier pile pill pine ping pink pint pipe pity plan play plea plod plot plow ploy plug plum plus poem poet poke pole poll polo pond pony pool poor pore pork port pose posh post pour pout pray prey prim prod prop prow puck puff pull pulp puma pump punt pure purr push
quit quiz
race rack raft rage raid rail rain rake ramp rang rank rant rare rash rate rave read real ream reap rear reed reef reek reel rein rely rend rent rest rice rich ride rife rift ring rink riot ripe rise risk rite road roam roar robe rock rode role roll romp roof room root rope rose rosy rote rove ruby rude rule rump rung ruse rush rust
sack safe saga sage said sail sake sale salt same sand sane sang sank sash save scan scar seal seam sear seat sect seed seek seem seen seep self sell send sent sewn shed shin ship shoe shop shot show shun shut sick side sift sigh sign silk sill silo silt sing sink site size skid skim skin skip skit slab slam slap slat sled slew slid slim slip slit slot slow slug slur smog snag snap snip snob snow snub snug soak soap soar sock soda sofa soft soil sold sole solo some song soon soot sore sort soul soup sour sown span spar spat sped spin spit spot spud spun spur stab stag star stay stem step stew stir stop stow stub stud stun such suit sulk sung sunk sure surf swam swan swap sway swim
tack tact tail take tale talk tall tame tang tank tape tart task taut taxi teal team tear teen tell tend tent term tern test text than that thaw them then they thin this thud thus tick tide tidy tied tier tile till tilt time tint tiny tire toad tofu toil told toll tomb tome tone took tool tore torn toss tote tour town trap tray tree trek trim trio trip trod trot true tuba tube tuck tuft tuna tune turf turn tusk twig twin type
ugly undo unit upon urge used user
vain vane vary vase vast veal veer veil vein vent verb very vest veto vial vice view vile vine visa void vole vote
wade waft wage wail wait wake walk wall wand wane want ward ware warm warn warp wary wash wasp wave wavy waxy weak wean wear weed week weep weld well went wept were west what when whim whip wick wide wife wild will wilt wily wind wine wing wink wipe wire wiry wise wish wisp with woke wolf wood wool word wore work worm worn wove wrap wren
yank yard yarn yawn year yell yelp yoga yolk your
zany zeal zero zest zinc zone zoom
`;

const FIVE = `
about above acorn actor acute adapt admit adopt adore adult after again agent agile aging agree ahead aisle alarm album alert algae alien align alike alive alley allow alloy alone along aloof aloud alpha altar alter amaze amber amble amend among ample amuse angel anger angle angry ankle apart apple apply apron arena argue arise armor aroma arose array arrow ashen aside asset atlas attic audio audit avoid await awake award aware awful
bacon badge badly bagel baker balmy banjo baron basic basil basin basis batch bathe baton beach beard beast began begin being belly below bench berry birch birth bison black blade blame bland blank blare blast blaze bleak bleat bleed blend bless blimp blind blink bliss bloat block blond blood bloom blown bluff blunt blurb blurt blush board boast bonus boost booth bored bossy botch bough bound boxer brace braid brain brake brand brash brass brave bravo brawn bread break breed brick bride brief brine bring brink brisk broad broil broke brook broom broth brown brunt brush brute buddy budge buggy bugle build built bulge bully bunch bunny burly burnt burst bushy buyer
cabin cable cadet camel cameo canal candy canoe caper cargo carol carry carve catch cater cause cease cedar chafe chain chair chalk champ chant chaos charm chart chase chasm cheap cheat check cheek cheer chess chest chick chide chief child chili chill chime chimp china chirp chive choir choke chord chore chose chuck chunk churn cider cinch civic civil clack claim clamp clang clank clash clasp class clean clear cleat cleft clerk click cliff climb cling cloak clock clone close cloth cloud clout clove clown cluck clump clung coach coast cobra cocoa colon color comet comfy comic comma conch coral corny couch cough could count coupe court cover covet crack craft cramp crane crank crash crate crave crawl craze crazy creak cream creek creep crepe crest crisp croak crock crook croon cross crowd crown crude cruel crumb crush crust crypt cubic cumin curly curry curve curvy cycle cynic
daily dairy daisy dally dance dandy dared dated dealt debit debut decal decay decor decoy decry delay delta delve denim dense depot depth deter detox diary dicey digit dimly diner dingy dirty disco ditch ditto ditty diver dizzy dodge doing dolly donor donut doubt dough dowel downy dozen draft drain drake drama drank drape drawl drawn dread dream dress dried drier drift drill drink drive droll drone drool droop drove drown dryer dryly dully dusky dusty duvet dwarf dwell dwelt
eager eagle early earth easel eaten eater ebony eerie eight elbow elder elect elfin elite elope elude elves email embed ember empty enact endow enemy enjoy ensue enter entry envoy epoch equal equip erase erode error erupt essay ethic evade event every evict exact excel exert exile exist expel extra
fable facet faint fairy faith false fancy farce fatal fatty fault fauna favor feast femur fence feral ferry fetch fever fewer fiber fibre field fiend fiery fifth fifty fight filer final finch finer first fishy fixed fizzy flail flair flake flaky flame flank flare flash flask fleck fleet flesh flick flier fling flint flirt float flock flood floor flora floss flour flown fluff fluid fluke flung flunk flush flute foamy focal focus foggy folly foray force forge forgo forte forth forty forum found foyer frail frame frank fraud freak freed fresh friar fried frill frisk frock frond front frost froth frown froze fruit fudge fully fungi funky funny furor furry fussy fuzzy
gable gaily gamer gamma gamut gassy gaudy gauge gaunt gauze gavel gecko geese genie genre ghost giant giddy girth given giver gizmo glade gland glare glass glaze gleam glean glide glint gloat globe gloom glory gloss glove gnome goody gooey goose gorge gouge gourd grace grade graft grail grain grand grant grape graph grasp grass grate grave gravy graze great greed green greet grief grill grime grimy grind gripe groan groom gross group grout grove growl grown gruel gruff grunt guard guava guess guest guide guild guile guilt guise gulch gully gummy guppy gusto gusty
habit hairy halve handy happy hardy harsh haste hasty hatch hater haunt haven havoc hazel heady heard heart heath heave heavy hedge hefty heist hello hence heron hilly hinge hippo hitch hoard hobby hoist holly honey honor horde horse hotel hound house hover human humid humor hunch hurry husky hutch hyena
icing ideal idiom igloo image imply inbox incur index inept inert infer ingot inlay inlet inner input irate irony issue itchy ivory
jaunt jazzy jeans jelly jerky jetty jewel jiffy joint joker jolly joust judge juice juicy jumbo jumpy juror
kayak kebab khaki kiosk kitty knack knead kneel knelt knife knock knoll known koala
label labor laden ladle lance lanky lapel lapse large larva laser lasso latch later lathe latte laugh layer leafy leaky leapt learn lease leash least leave ledge leech legal lemon lemur level lever light liken lilac limbo limit linen liner lingo lithe liver livid llama lobby local lodge lofty logic loose lorry lotus lover lower lowly loyal lucid lucky lumpy lunar lunch lunge lurch lying lyric
macaw madam magic magma maize major maker mambo mango mania manic manly manor maple march marry marsh mason match mauve maxim maybe mayor meant meaty medal media medic melon mercy merge merit merry messy metal meter metre metro midst might milky mimic mince minor minty minus mirth miser mocha modal model modem moist molar moldy money month moody moose moral motel motif motor motto mound mount mourn mouse mouth mover movie mower muddy mulch munch mural murky mushy music musty muted
nacho naive nanny nasal nasty naval navel needy neigh nerve never newer newly nicer niche niece night ninja ninth noble nobly noise noisy nomad noose north notch noted novel nudge nurse nutty nylon
oasis occur ocean odour offer often olive omega onion onset opera optic orbit order organ other otter ought ounce outdo outer owing owner oxide ozone
paint paler panda panel panic pansy paper parch parka parse party pasta paste pasty patch patio patty pause peace peach pearl pecan pedal penne penny perch peril perky pesky pesto petal petty phase phone phony photo piano picky piece piggy pilot pinch pinky piper pitch pithy pivot pixel pizza place plaid plain plane plank plant plate plaza plead pleat pluck plumb plume plump plunk plush poach point poise poker polar polka pooch poppy porch pouch pound pouty power prank prawn preen press price prick pride pried prime print prior prism prize probe prone prong proof prose proud prove prowl proxy prune pulse punch pupil puppy puree purge purse pushy putty
quack quail quake qualm quart queen quell query quest queue quick quiet quill quilt quirk quite quota quote
rabid racer radar radio rainy raise rally ramen ranch range rapid rarer raspy ratio raven rayon razor reach react ready realm rebel recap refer regal rehab reign relax relay relic remit renew repay repel reply rerun reset resin retro retry reuse revel rhino rhyme rider ridge rifle right rigid rigor rinse ripen riper risen riser risky rival river rivet roach roast robin robot rocky rodeo rogue roomy roost rotor rouge rough round rouse route rover rowdy rower royal rugby ruler rumba rumor runny rural rusty
sadly safer saint salad salon salsa salty samba sandy saner sassy satin sauce saucy sauna savor savvy scale scalp scaly scant scare scarf scary scene scent scold scone scoop scope score scorn scour scout scowl scrap screw scrub scuba seize sense serum serve setup seven sever sewer shack shade shady shaft shake shaky shall shame shape shard share shark sharp shave shawl shear sheen sheep sheer sheet shelf shell shift shine shiny shirt shock shone shook shoot shore shorn short shout shove shown showy shred shrew shrub shrug siege sieve sight sigma silky silly since singe siren sitar sixth sixty skate skier skill skirt skull skunk slack slain slang slant slash slate sleek sleep sleet slept slice slick slide slime slimy sling slink slope slosh sloth slump slung slurp slush slyly smack small smart smash smear smell smelt smile smirk smith smock smoke smoky snack snail snake snare snarl sneak sneer snide sniff snipe snoop snore snort snout snowy snuck snuff soapy sober soggy solar solid solve sonar sonic sooty sorry sound south space spade spare spark spasm spawn speak spear speck speed spell spend spent spice spicy spied spike spiky spill spine spiny spire spite splat split spoil spoke spoof spook spool spoon spore sport spout spray spree sprig spurt squad squat squid stack staff stage stain stair stake stale stalk stall stamp stand stank stare stark start stash state steak steal steam steed steel steep steer stern stick stiff still stilt sting stink stint stock stoic stoke stole stomp stone stony stood stool stoop store stork storm story stout stove strap straw stray strip strut stuck study stuff stump stung stunt style suave sugar suite sulky sunny super surge surly sushi swamp swarm swear sweat sweep sweet swell swept swift swing swipe swirl swish swoop sword swore sworn swung syrup
tabby table taboo tacky taffy taken taker tally talon tamer tango tangy taper tapir tardy tarot taste tasty taunt tawny teach teary tease teddy teeth tempo tenor tense tenth tepid testy theft their theme there these thick thief thigh thing think third thorn those three threw throb throw thumb thump tiara tidal tiger tight timer timid tipsy title toast today token tonal tonic tooth topaz topic torch torso total totem touch tough towel tower toxic trace track tract trade trail train trait tramp trash trawl tread treat trend trial tribe trick tried trike trill trite troll troop trout truce truck truly trump trunk truss trust truth tubby tulip tummy tumor tuner tunic turbo tutor twang tweak tweed tweet twice twine twirl twist tying
udder ultra uncle uncut under undid undue unfit unify union unite unity unlit untie until upper upset urban urged usage usher using usual utter
vague valet valid valor value valve vapor vault vegan venom venue verge verse video vigor villa vinyl viola viper viral virus visit visor vista vital vivid vocal vogue voice voter vouch vowel
wacky wafer wager wagon waist waive waltz watch water waver weary weave wedge weedy weigh weird whack whale wharf wheat wheel where which whiff while whine whiny whirl whisk white whole whose widen wider widow width wield wince winch windy wiser witch witty woken woman women woody wordy world worry worse worst worth would wound woven wrath wreck wring wrist write wrong wrote
yacht yearn yeast yield yodel young youth yummy
zebra zesty
`;

const SIX = `
aboard absent accent accept access accord across action active actual adjust admire advent adverb advice affair afford afloat afraid agency agenda almost always amount anchor angler animal annual answer anthem anyhow anyone anyway appeal appear arcade archer arisen armour around arrest arrive artist ascend ashore aspect assert assess assign assist assume assure attach attack attain attend author autumn avenue awaken
badger bakery ballad ballet bamboo banana bandit banner banter barber barely barley barrel basket batter battle beacon beaker beauty become before behave behind belong beside better beware beyond binder bitter blazer bleach blonde blouse boiler bonnet border boring borrow bother bottle bottom bought bounce bounty bowler brainy branch brandy breath breeze bridal bridge bright broken broker bronze brooch bubble bucket buckle budget buffet bundle bunker burden bureau burger burrow bushel butler butter button buzzer
cactus camera campus canary cancel candle canine cannon canopy canvas canyon carbon career carpet carrot carton castle casual catchy cattle caught celery cellar cement center centre cereal chalet chance change chapel charge cheery cheese cherry choice choose chorus chosen chrome cinema circle circus citrus clammy classy clause clever client climax clinic closet clothe cloudy clumsy coarse cobweb coffee collar colour column combat comedy coming commit common comply convey cookie copper corner cosmic costly cotton county couple coupon course cousin coward cowboy coyote cradle crater crayon creamy create credit crisis crispy critic crouch cruise crunch cuddle cuddly custom
damage dampen dancer danger daring darken dazzle dealer debate debris decade decent decide decode deduct deepen defeat defend define degree delete deluxe demand denial dental depart depend deploy deputy desert design desire detail detect device devote devour differ digest dimple dinner direct divide divine doctor dollar domain donate donkey dotted double dragon drawer dreamy drench driven driver drowsy
easily eating editor effect effort eighty either eldest eleven embark emblem emerge empire employ enable encore ending endure energy engage engine enigma enlist enough enrich enroll ensure entire errand escape escort estate esteem evolve exceed except excess excite excuse exhale exotic expand expect expert expire export expose extend extent
fabric facial facing factor fairly fallen falter family famous farmer fasten father faucet favour feeble fellow female fender ferret fierce figure filter finale finger finish flavor flight flimsy floppy floral flower fluent fluffy flying folder follow forbid forest forget forgot formal format fossil foster fought fourth freely freeze fridge friend fright fringe frisky frosty frozen frugal fruity fumble fungus funnel future
gadget galaxy gallon gallop gamble garage garden garlic gather gazebo gentle gently gerbil gifted giggle ginger glance glider global glossy golden goblin gopher gossip grassy grater gravel grease greasy grocer groove groovy ground growth grumpy guitar gutter
hamlet hammer hamper handle hangar happen harbor hardly hassle health hearth hearty heater heaven hectic height helium helmet helper herbal hermit heroic hiccup hidden hiking hinder hockey hollow honest honour hoping hostel hourly humble humour hunger hungry hunter hurdle hustle hybrid
icicle iconic ignite ignore impact import impose income indeed indoor infant inform injure injury inland insect insert inside insist intact intend intent invent invest invite island itself
jacket jaguar jersey jester jigsaw jingle jockey jogger joyful jumble jungle junior
karate kennel kernel kettle kidney kindle kindly kitten knight
labour ladder lagoon lament laptop lately latest latter launch lavish lawyer layout leader league legacy legend lender length lesson letter likely linear lining liquid listen litter little lively living lizard locker locket lonely lovely loving lumber
magnet maiden mainly mammal manage manner mantel mantle marble margin marine market marrow marvel mascot master matter meadow medium mellow melody member memory menace mental mentor method midday middle mighty mingle minnow minute mirror mitten mobile modern modest modify moment monkey morsel mostly mother motion motive muffin murmur museum muscle mutter mutual muzzle myself
napkin narrow nation native nature nearby nearly neatly nectar needle nephew nestle nettle nicely nickel nimble nobody noodle normal notice notion novice nugget number nutmeg
object oblong obtain occupy office offset oldest online opener oppose option oracle orange orchid ordeal orient origin ornate outfit outlet output outset oxygen oyster
packet paddle palace palate pantry papaya parade parcel pardon parent parrot pastel pastor pastry patrol patron pebble pencil people pepper period permit person petrol phrase pickle picnic piglet pillar pillow pirate placid planet plaque plasma plenty pliers plight plunge plural pocket poetry poison police policy polish polite pollen ponder poodle porous portal poster potato potion potter pounce powder praise prance prefer pretty priest prince prompt proper public puddle puffin pulley puppet purely purple pursue puzzle
quartz quench quiche quiver
rabbit racket radish raffle raisin ramble random ranger rarely rascal rather rattle ravine reader really reason recall recent recess recipe reckon record redeem reduce refill refine reform refund refuse regain regard region regret reject relate relief relish remain remark remedy remind remote remove render rental repair repeat report rescue reside resist resort result resume retail retain retire return reveal review revise revive reward rhythm ribbon riddle ripple ritual robust rocket rodent rookie rotate rubber rubble rudder rumble rumour runner rustic rustle
saddle safari safely safety sailor salami salmon salute sample sandal saucer saving scarce scenic scheme school scorch scream screen script scroll season second secret sector secure seldom select seller senior sensor serene series settle severe shadow shaker shaggy shield shiver shower shrimp shrink signal silent silver simmer simple simply singer single sister sizzle sketch skiing sleepy sleeve sleigh slider slight slogan slower smooth smudge sneaky sneeze snooze snugly soccer social socket soften softly solemn sorbet sorrow sought source spider spirit splash spoken sponge spooky sprain spread spring sprint sprout spruce squash squeak squirm stable stance staple starch starry statue steady stereo sticky stitch stolen strain strand streak stream street stress stride strike string stripe strive stroke stroll strong studio sturdy subtle suburb sudden suffer summer summit sundae sunlit sunset superb supper supply surely survey swampy sweaty switch symbol system
tablet tackle tailor talent tangle tanker target tartan tassel tattoo teacup teapot teaser temper temple tenant tender tennis thanks theirs thesis thirst thirty thorny though thread threat thrill thrive throat throne thrown thrust ticket tickle timber timely tinsel tiptoe tissue toffee toggle tomato tongue toucan toward trance travel treaty trench trendy tribal trophy tropic trowel tumble tunnel turkey turnip turtle tuxedo twelve twenty
umpire unable undone unfair unfold unique unison unkind unless unlike unload unlock unpack unrest unseen untidy unveil unwind update uphill uplift upload uproar upside upward urchin urgent usable useful
vacant valley vanish vapour velvet vendor verbal versus vessel violet violin virtue visual volume voyage
waffle waiter walker wallet walnut walrus wander warden warmer warmth washer wealth weaken weasel weaver weekly weight wicked widely willow window winner winter wiring wisdom within wizard wobble wonder wooden woolen worker worthy wreath wrench writer
yearly yellow yogurt
zigzag zipper
`;

const SEVEN = `
abandon ability absence academy account achieve acrobat actress adapter address admiral adviser against airline airport amateur amazing ancient another antenna anxiety anxious anybody apology apricot arrange arrival article artwork athlete attempt attract auction average avocado awkward
baggage balance balloon bandage banquet bargain barrier battery beehive believe beloved benefit between bicycle billion biscuit blanket blender blister blossom bonfire booklet bouquet bracket breathe brewery brigade brother brownie buffalo builder bulldog butcher
cabbage cabinet caravan careful caribou cartoon cascade cashier catalog ceiling central century ceramic certain chamber channel chapter charity cheaper cheetah chemist chicken chimney circuit citizen clarify clarity classic cleaner climate closing clothes cluster coastal coconut collect college combine comfort command comment company compare compass compete complex concert conduct confirm connect consent contact contain content contest context control convert cooking copycat correct costume cottage council counter country courage creator crimson crystal cuisine culture cupcake curious current curtain cushion custard
dancing daytime decline default deliver density dentist deposit descent desktop dessert destroy diagram diamond digital dilemma discuss display distant dolphin doorway drastic drawing dresser driving drizzle drought dungeon dustpan dynamic
earlier earnest earning earring eastern economy edition elastic elation elderly element elevate embrace emerald emotion empathy endless enforce engaged enhance enlarge episode equator erosion essence eternal evening exactly examine example excited exclude execute exhibit expense explain explore express extinct extreme
factory faculty failure fairway fantasy farming farther fashion feature federal feeling festive fiction fifteen finally finance fishing fitness fixture flannel flatten flavour florist foliage foreign forever forgive formula fortune forward founder fragile freedom freight frantic freezer furnace further
gallery garment gateway gazelle general genuine gesture giraffe glacier glimpse glisten glitter glowing gondola gorilla gourmet grading gradual grammar granite graphic grapple gravity greater grizzly grocery gymnast
habitat haircut halfway hallway hamster handful harbour harmony harvest heading healthy hearing heating heavily helpful herring hexagon highway himself history holiday honesty horizon housing however hundred hunting husband
iceberg imagine imitate immense impress improve impulse include initial insight inspect install instant instead invoice involve isolate
janitor jasmine javelin jealous jewelry journal journey jubilee juggler jukebox justice
kingdom kitchen knuckle
lantern largely laundry leading leaflet learner leather lecture leisure lettuce liberal liberty library license lighter limited lioness lobster logical longing lottery loyalty luggage lullaby
machine madness magical mailbox majesty mammoth manager manatee mansion married massive meaning measure medical meeting melting mention mermaid message migrate mileage million mindful mineral minimal minimum miracle mission mistake mixture monarch monitor monster morning mustard mystery
narrate natural neglect neither nervous network neutral newborn nightly notable nothing nowhere nucleus numeral nursery
oatmeal obscure observe obvious octagon octopus officer ongoing opening operate opinion orchard organic ostrich outdoor outline outlook outside overall oversee
package padlock pajamas pancake panther parking parsnip partial partner passage passing passion passive pasture patient pattern payment peacock pelican penalty penguin pension percent perfect perform perfume perhaps persist phantom pianist picture pigment pilgrim pinball pioneer plaster plastic platter playful pleased plumber polygon popcorn popular portion portray postage postman pottery poultry prairie precise predict premium prepare present pretend prevent primary printer privacy problem proceed process produce product profile program project promise protect protein protest proudly provide publish pudding pumpkin purpose pyramid
quality quarrel quarter quickly quietly
raccoon railway rainbow readily reading reality realize receipt receive recital recover recycle reflect refresh refusal regular related release relieve removal replace request require reserve resolve respect restore retreat revenue reverse revival rhubarb rooftop routine rubbish
sailing sapling satchel satisfy sausage scallop scarlet scatter scenery scholar science scooter scratch seafood seagull seaport seaside section segment seminar senator serious servant serving session setback setting settler seventy several shampoo shelter shimmer shorten shuffle silence silicon similar sincere singing sitting skating slender slipper smaller snorkel snowman soldier someday someone sparkle sparrow special spinach spinner sponsor squeeze stadium stamina stapler starter station steamer stellar stencil stomach storage strange stretch student stylish subject succeed success suggest summary sunbeam sundial sunrise supreme surface surgeon survive suspect swallow sweater swimmer
tadpole tangent teacher tension terrace terrain texture theater theatre therapy thermal thinker thirsty thought thunder toaster tonight tornado tourism tourist towards tractor trading traffic tragedy trailer trainer transit trapeze triumph trolley trouble trumpet twinkle typical
ukulele unaware undergo uniform unknown unravel unusual upgrade upright utensil utility
vampire vanilla variety various varnish vehicle venture verdict version veteran victory village vintage virtual visible visitor vitamin volcano
waiting waitress walking washing wealthy weather website wedding weekday weekend welcome welfare western whisper whistle willing winning without witness worried writing written
`;

let list: readonly string[] | null = null;
let known: ReadonlySet<string> | null = null;

/** every word word wheel knows, once each, shortest first */
export function wheelWordList(): readonly string[] {
  if (!list) {
    const all = [THREE, FOUR, FIVE, SIX, SEVEN]
      .join(' ')
      .split(/\s+/)
      .filter((w) => /^[a-z]{3,7}$/.test(w));
    list = [...new Set(all)];
  }
  return list;
}

/** whether word wheel knows this word */
export function isWheelWord(word: string): boolean {
  if (!known) known = new Set(wheelWordList());
  return known.has(word);
}
