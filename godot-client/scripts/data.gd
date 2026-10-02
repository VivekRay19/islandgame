class_name CID
extends RefCounted

const API_BASE_DEFAULT := "http://192.168.8.10:8067/api"

static func api_base() -> String:
    var env := OS.get_environment("CI_API_BASE")
    if env.strip_edges() != "":
        return env.rstrip("/")
    return API_BASE_DEFAULT

const TILE_DEFS := {
    "tile_farm": {"label":"FARM", "name":"Terraced Grain Farm", "color":Color("#a9bf62"), "accent":Color("#dfeaa0"), "res":"grain", "cost":{"grain":1,"water":1}, "desc":"Produces grain; benefits from water.", "kind":"farm"},
    "tile_sacred_forest": {"label":"FOREST", "name":"Ancient Banyan Forest", "color":Color("#3c735a"), "accent":Color("#80b887"), "res":"wood", "cost":{"wood":1}, "desc":"A productive woodland with higher fire exposure.", "kind":"forest"},
    "tile_river_bend": {"label":"RIVER", "name":"Scenic River Waterway", "color":Color("#4daec7"), "accent":Color("#a7e7ef"), "res":"water", "cost":{"water":1}, "desc":"Adds water and supports emergency response.", "kind":"water"},
    "tile_textile_workshop": {"label":"LOOM", "name":"Textile Workshop", "color":Color("#b67a4c"), "accent":Color("#f0bc7c"), "res":"fibre", "cost":{"fibre":1,"wood":1}, "desc":"Turns fibre into productive craft capacity.", "kind":"loom"},
    "tile_haat_market": {"label":"HAAT", "name":"Haat Trading Square", "color":Color("#9b6cc2"), "accent":Color("#d9b4f4"), "res":"clay", "cost":{"wood":2,"clay":1}, "desc":"A cultural market that anchors exchange.", "kind":"market"},
    "tile_community_house": {"label":"HALL", "name":"Community Gathering Hall", "color":Color("#cc975d"), "accent":Color("#f0c998"), "res":"wood", "cost":{"wood":2,"stone":1}, "desc":"Supports settlement and social cohesion.", "kind":"house"},
    "tile_sacred_shrine": {"label":"SHRINE", "name":"Ancestral Heritage Shrine", "color":Color("#7864b2"), "accent":Color("#d7cbff"), "res":"stone", "cost":{"stone":2,"music":1}, "desc":"Strengthens cultural identity and harmony.", "kind":"shrine"},
    "tile_clay_pit": {"label":"CLAY", "name":"Riverbed Clay Pit", "color":Color("#c87357"), "accent":Color("#f3bd89"), "res":"clay", "cost":{"water":1}, "desc":"Extracts clay from the riverbed.", "kind":"clay"},
    "tile_music_pavilion": {"label":"MUSIC", "name":"Melodic Music Pavilion", "color":Color("#6659a8"), "accent":Color("#bdaef8"), "res":"music", "cost":{"wood":1,"music":1}, "desc":"Provides space for festivals and music.", "kind":"music"},
    "tile_quarry": {"label":"QUARRY", "name":"Stone Quarry & Mine", "color":Color("#747d80"), "accent":Color("#ced5d2"), "res":"stone", "cost":{"stone":1,"ore":1}, "desc":"Produces stone and supports construction.", "kind":"quarry"}
}

const TILE_ORDER := [
    "tile_farm", "tile_sacred_forest", "tile_river_bend", "tile_textile_workshop", "tile_haat_market",
    "tile_community_house", "tile_sacred_shrine", "tile_clay_pit", "tile_music_pavilion", "tile_quarry"
]

const RES := {
    "grain": {"label":"Grain", "short":"GR", "color":Color("#e3c35b")},
    "fibre": {"label":"Fibre", "short":"FB", "color":Color("#df78b5")},
    "wood": {"label":"Wood", "short":"WD", "color":Color("#c48b53")},
    "stone": {"label":"Stone", "short":"ST", "color":Color("#9aa6a9")},
    "clay": {"label":"Clay", "short":"CL", "color":Color("#d37e55")},
    "water": {"label":"Water", "short":"WT", "color":Color("#55b8d6")},
    "music": {"label":"Music", "short":"MU", "color":Color("#aa8bef")},
    "ore": {"label":"Ore", "short":"OR", "color":Color("#748695")}
}

const RES_ORDER := ["grain","fibre","wood","stone","clay","water","music","ore"]

const ISLANDS := {
    "farming": {"name":"Farming Island", "tag":"GRAIN TERRACES", "adv":"Starts with +Grain", "risk":"Drought can hurt crop output", "color":Color("#a9bf62")},
    "forest": {"name":"Forest Island", "tag":"WOODLAND", "adv":"Starts with +Wood", "risk":"Forest tiles face greater fire exposure", "color":Color("#3c735a")},
    "coastal": {"name":"Coastal Island", "tag":"WATERFRONT", "adv":"Starts with +Water", "risk":"Storms and floods are the trade-off", "color":Color("#4daec7")},
    "mountain": {"name":"Mountain Island", "tag":"STONE RIDGE", "adv":"Starts with +Stone", "risk":"Construction is harder around scarce materials", "color":Color("#747d80")}
}

static func tile(id: String) -> Dictionary:
    return TILE_DEFS.get(id, TILE_DEFS["tile_farm"])

static func res_name(id: String) -> String:
    return RES.get(id, {"label":id.capitalize()}).get("label", id.capitalize())

static func cost_text(cost: Dictionary) -> String:
    var bits: Array[String] = []
    for key in cost.keys():
        bits.append("%s %s" % [str(cost[key]), res_name(key)])
    return " · ".join(bits)

static func event_meta(id: String) -> Dictionary:
    return {
        "fire_event": {"title":"Fire at the Craft Centre", "tone":"danger", "action":"extinguish", "cost":"2 Water", "desc":"The workshop is under threat. Spend water to resolve the fire before the consequences land."},
        "festival_event": {"title":"Seasonal Community Festival", "tone":"positive", "action":"celebrate", "cost":"No resource cost", "desc":"A rare positive event. Resolve it to convert the moment into harmony and score."},
        "harvest_bounty": {"title":"Golden Harvest Day", "tone":"positive", "action":"harvest", "cost":"No resource cost", "desc":"The farms are flourishing. Claim the bounty while it is available."},
        "drought": {"title":"The Long Dry Season", "tone":"warning", "action":"resolve", "cost":"2 Water", "desc":"Water reserves decide whether the island can protect crop production."},
        "storm": {"title":"Cyclone Warning", "tone":"warning", "action":"resolve", "cost":"1 Water", "desc":"Protect the community before the storm turns into structural damage."}
    }.get(id, {"title":"Island Event", "tone":"warning", "action":"resolve", "cost":"Respond now", "desc":"An event is active on your island."})
