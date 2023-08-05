module.exports = {
    //host: "arrastwo-io.glitch.me",
    host: "localhost",
    servesStatic: true,
    port: 3000,
    networkUpdateFactor: 24,
    socketWarningLimit: 5,
    networkFrontlog: 1,
    networkFallbackTime: 150,
    visibleListInterval: 250,
    gameSpeed: 3,
    runSpeed: 1.5,
    maxHeartbeatInterval: 300000,
    verbose: true,
    bossSpawnInterval: 8,
    WIDTH: 0,
    HEIGHT: 0,
    MODE: "ffa",
    TEAMS: 0,
    RANDOM_COLORS: false,
    ARENA_TYPE: "rect",
    BANNED_CHARACTER_REGEX: "/[\uFDFD\u200E\u0000]/gi",
    ROOM_SETUP: [],
    X_GRID: 0,
    Y_GRID: 0,
    DAMAGE_CONSTANT: 0.5,
    KNOCKBACK_CONSTANT: 1.5,
    GLASS_HEALTH_FACTOR: 2,
    ROOM_BOUND_FORCE: 0.01,
    FOOD: [0, 0.75, 0.22, 0.1, 0.005, 0, 0],
    FOOD_NEST: [0, 0.0, 0.0, 0.75, 0.23, 0.02, 0],
    LEVEL_SKILL_POINT_FUNCTION: null,
    MAX_SKILL: 9,
    SOFT_MAX_SKILL: 0.59,
    MAX_UPGRADE_TIER: 14,
    // Dreadnoughts team
    DREADNOUGHT_TEAM: 10,
    TIER_MULTIPLIER: 15,
    GROWTH: 71,
    SKILL_CAP: 210,
    SKILL_SOFT_CAP: 0,
    SKILL_CHEAT_CAP: 45,
    SKILL_LEAK: 0,
    STEALTH: 4,
    MIN_SPEED: 0.001,
    FOOD_AMOUNT: 100,
    NEST_FOOD_AMOUNT: 1.5,
    CRASHER_RATIO: 2,
    SKILL_BOOST: 5,
    // Use defaults?
    BOTS_USE_DEFAULT: true,
    BOTS: 6,
    GLASS_HEALTH_FACTOR: 2,
    HALF: false,
    TRAIN: false,
    SOCCER: false,
    SHINY: false,
    SPECIAL_BOSS_SPAWNS: false,
    MOTHERSHIP_LOOP: false,
    SPACE_PHYSICS: false,
    SPACE_MODE: false,
    MAZE: false,
    DOMINATOR_LOOP: false,
    secondaryGameMode: "",
    GROUPS: false,
    TAG: false,
    DEFAULT_FILE: 'index.html',
    WELCOME_MESSAGE: "You have spawned! Welcome to the game.\n"
                    +"You will be invulnerable until you move or shoot.\n"
                    +"This is a beta release. Please join the official discord server to report any bugs you encounter!"
}