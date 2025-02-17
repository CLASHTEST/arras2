const fs = require('fs');
const path = require('path');
let enviroment = require('../server/lib/dotenv.js')(fs.readFileSync(path.join(__dirname, '../.env')).toString());
for (let key in enviroment) {
    process.env[key] = enviroment[key];
}
const GLOBAL = require("./modules/global.js");

console.log(`[${GLOBAL.creationDate}]: Server initialized.\nRoom Info:\n Dimensions: ${room.width} x ${room.height}\n Max Food / Nest Food: ${room.maxFood} / ${room.maxFood * room.nestFoodAmount}`);

// Let's get a cheaper array removal thing
Array.prototype.remove = function (index) {
    if (index === this.length - 1) return this.pop();
    let r = this[index];
    this[index] = this.pop();
    return r;
};

util.log(room.width + " x " + room.height + " room initalized.  Max food: " + room.maxFood + ", max nest food: " + room.maxFood * room.nestFoodAmount + ".");

// Collision stuff
function collide(collision) {
    // Pull the two objects from the collision grid
    let instance = collision[0],
        other = collision[1];
    // Check for ghosts...
    if (other.isGhost) {
        util.error("GHOST FOUND");
        util.error(other.label);
        util.error("x: " + other.x + " y: " + other.y);
        util.error(other.collisionArray);
        util.error("health: " + other.health.amount);
        if (grid.checkIfInHSHG(other)) {
            util.warn("Ghost removed.");
            grid.removeObject(other);
        }
        return 0;
    }
    if (instance.isGhost) {
        util.error("GHOST FOUND");
        util.error(instance.label);
        util.error("x: " + instance.x + " y: " + instance.y);
        util.error(instance.collisionArray);
        util.error("health: " + instance.health.amount);
        if (grid.checkIfInHSHG(instance)) {
            util.warn("Ghost removed.");
            grid.removeObject(instance);
        }
        return 0;
    }
    if (
        (!instance.activation.check() && !other.activation.check()) ||
        (instance.label === "Spectator" || other.label === "Spectator")
    ) {
        return 0;
    }
    if ((instance.label === "Substance" || other.label === "Substance") &&
        instance.team != other.team) {
        let food = instance.label === "Substance" ? other : instance;
        let entity = instance.label === "Substance" ? instance : other;
        food.color = entity.color;
        food.team = entity.team;
    }
    if (
        (instance.label == "Portal" || other.label == "Portal") &&
        (instance.isPlayer || other.isPlayer)
    ) {
        if (instance.label == "Portal" && other.label == "Portal") return;
        let player = instance.isPlayer ? instance : other;
        let portal = instance.isPlayer ? other : instance;
        if (disconnections.filter(r => r.body.id == player.id).length) return;
        if (portal.realSize > player.realSize * 1.2) {
            portal.SIZE = 50;
            let timeout = setTimeout(function () {
                if (player.body != null) {
                    player.body.kill();
                }
                util.remove(disconnections, disconnections.indexOf(disconnection));
            }, 60000 * 60 * 12); // 12 hours
            disconnections.push({
                body: player,
                ip: player.socket.ip,
                timeout: timeout
            });
            player.socket.talk("t");
            player.socket.kick("Teleporting.");
        } else {
            portal.SIZE += 0.02;
        }
    } else if (!disconnections.filter(dis => dis.body.id == instance.id || dis.body.id == other.id).length) {
        switch (true) {
            case instance.type === "wall" || other.type === "wall":
                if (instance.type === "wall" && other.type === "wall") return;
                let wall = instance.type === "wall" ? instance : other;
                let entity = instance.type === "wall" ? other : instance;
                if (entity.ac || entity.master.ac) return;
                if (entity.type == "atmosphere") return;
                switch (wall.shape) {
                    case 4:
                        reflectCollide(wall, entity);
                        break;
                    default:
                        let a =
                            entity.type === "bullet"
                                ? 1 + 10 / (entity.velocity.length + 10)
                                : 1;
                        advancedcollide(wall, entity, false, false, a);
                        break;
                }
                break;
            case instance.team === other.team &&
                (instance.settings.hitsOwnType === "pushOnlyTeam" ||
                    other.settings.hitsOwnType === "pushOnlyTeam"):
                {
                    // Dominator / Mothership collisions
                    if (instance.settings.hitsOwnType === other.settings.hitsOwnType) return;
                    let pusher = instance.settings.hitsOwnType === "pushOnlyTeam" ? instance : other;
                    let entity = instance.settings.hitsOwnType === "pushOnlyTeam" ? other : instance;
                    if (entity.type !== "tank" || entity.settings.hitsOwnType === "never") return;
                    let a =
                        1 + 10 /
                        (Math.max(entity.velocity.length, pusher.velocity.length) + 10);
                    advancedcollide(pusher, entity, false, false, a);
                }
                break;
            case (instance.type === "crasher" && other.type === "food") ||
                (other.type === "crasher" && instance.type === "food"):
                firmcollide(instance, other);
                break;
            case instance.team !== other.team ||
                (
                    instance.team == other.team &&
                    (instance.healer || other.healer)
                ):
                advancedcollide(instance, other, true, true);
                break;
            case instance.settings.hitsOwnType == "never" ||
                other.settings.hitsOwnType == "never":
                break;
            case instance.settings.hitsOwnType === other.settings.hitsOwnType:
                switch (instance.settings.hitsOwnType) {
                    case "push":
                        advancedcollide(instance, other, false, false);
                        break;
                    case "hard":
                        firmcollide(instance, other);
                        break;
                    case "hardWithBuffer":
                        firmcollide(instance, other, 30);
                        break;
                    case "hardOnlyTanks":
                        if (
                            instance.type === "tank" &&
                            other.type === "tank" &&
                            !instance.isDominator &&
                            !other.isDominator
                        )
                            firmcollide(instance, other);
                    case "hardOnlyBosses":
                        if (instance.type === other.type && instance.type === "miniboss")
                            firmcollide(instance, other);
                    case "repel":
                        simplecollide(instance, other);
                        break;
                }
                break;
        }
    }
}

// Living stuff
function entitiesactivationloop(my) {
    // Update collisions.
    my.collisionArray = [];
    // Activation
    my.activation.update();
    my.updateAABB(my.activation.check());
}
function entitiesliveloop(my) {
    // Consider death.
    if (my.contemplationOfMortality()) {
        my.destroy();
    } else {
        if (my.bond == null) {
            // Resolve the physical behavior from the last collision cycle.
            logs.physics.set();
            my.physics();
            logs.physics.mark();
        }
        if (my.activation.check() || my.isPlayer) {
            logs.entities.tally();
            // Think about my actions.
            logs.life.set();
            my.life();
            logs.life.mark();
            // Apply friction.
            my.friction();
            my.confinementToTheseEarthlyShackles();
            logs.selfie.set();
            my.takeSelfie();
            logs.selfie.mark();
        }
        entitiesactivationloop(my);
    }
    // Update collisions.
    my.collisionArray = [];
}

// The most important loop. Lots of looping.
let time, ticks = 0;
const gameloop = () => {
    logs.loops.tally();
    logs.master.set();
    logs.activation.set();
    logs.activation.mark();
    // Do collisions
    logs.collide.set();
    if (entities.length > 1) {
        // Load the grid
        grid.update();
        // Run collisions in each grid
        const pairs = grid.queryForCollisionPairs();
        loopThrough(pairs, collide);
    }
    logs.collide.mark();
    // Do entities life
    logs.entities.set();
    for (let e of entities) entitiesliveloop(e);
    logs.entities.mark();
    logs.master.mark();
    // Remove dead entities
    purgeEntities();
    room.lastCycle = util.time();
    ticks++;
    if (isEven(ticks)) {
        loopThrough(sockets.players, function (instance) {
            instance.socket.view.gazeUpon();
            instance.socket.lastUptime = Infinity;
        });
        if (Math.min(1, (global.fps / roomSpeed / 1000) * 30) < 0.8) antiLagbot();
    }
};

function placeRoids() {
    function placeRoid(type, entityClass) {
        let x = 0;
        let position;
        do {
            position = room.randomType(type);
            x++;
            if (x > 200) {
                util.warn("Could not place some roids.");
                return 0;
            }
        } while (dirtyCheck(position, 10 + entityClass.SIZE));
        let o = new Entity(position);
        o.define(entityClass);
        o.team = -101;
        o.facing = ran.randomAngle();
        o.protect();
        o.life();
    }
    // Start placing them
    let roidcount =
        (room.roid.length * room.width * room.height) /
        room.xgrid /
        room.ygrid /
        50000 /
        1.5;
    let rockcount =
        (room.rock.length * room.width * room.height) /
        room.xgrid /
        room.ygrid /
        250000 /
        1.5;
    let count = 0;
    for (let i = Math.ceil(roidcount); i; i--) {
        count++;
        placeRoid("roid", Class.rock);
    }
    for (let i = Math.ceil(roidcount * 0.3); i; i--) {
        count++;
        placeRoid("roid", Class.gravel);
    }
    for (let i = Math.ceil(rockcount * 0.8); i; i--) {
        count++;
        placeRoid("rock", Class.rock);
    }
    for (let i = Math.ceil(rockcount * 0.5); i; i--) {
        count++;
        placeRoid("rock", Class.gravel);
    }
    util.log("Placing " + count + " obstacles!");
}

function spawnWall(loc) {
    let o = new Entity(loc);
    o.define(Class.wall);
    o.team = -101;
    o.SIZE = room.width / room.xgrid / 2;
    o.protect();
    o.life();
}

let timer = Math.round(c.bossSpawnInterval * 60); // It's in minutes
const bossSelections = [
    {
        bosses: [Class.eliteDestroyer, Class.eliteGunner, Class.eliteSprayer, Class.eliteBattleship, Class.eliteSpawner],
        location: "nest",
        amount: [5, 5, 4, 2, 1],
        nameType: "a",
        chance: 2,
    },
    {
        bosses: [Class.roguePalisade],
        location: "norm",
        amount: [4, 1],
        nameType: "castle",
        message: "A strange trembling...",
        chance: 1,
    },
    {
        bosses: [Class.summoner, Class.eliteSkimmer, Class.nestKeeper],
        location: "norm",
        amount: [2, 2, 1],
        nameType: "a",
        message: "A strange trembling...",
        chance: 1,
    },
    {
        bosses: [Class.paladin],
        location: "norm",
        amount: [1],
        nameType: "paladin",
        message: "The world tremors as the celestials are reborn anew!",
        chance: 0.1,
    },
    {
        bosses: [Class.freyja],
        location: "norm",
        amount: [1],
        nameType: "freyja",
        message: "The world tremors as the celestials are reborn anew!",
        chance: 0.1,
    },
    {
        bosses: [Class.zaphkiel],
        location: "norm",
        amount: [1],
        nameType: "zaphkiel",
        message: "The world tremors as the celestials are reborn anew!",
        chance: 0.1,
    },
    {
        bosses: [Class.nyx],
        location: "norm",
        amount: [1],
        nameType: "nyx",
        message: "The world tremors as the celestials are reborn anew!",
        chance: 0.1,
    },
    {
        bosses: [Class.theia],
        location: "norm",
        amount: [1],
        nameType: "theia",
        message: "The world tremors as the celestials are reborn anew!",
        chance: 0.1,
    },
    {
        bosses: [Class.alviss],
        location: "norm",
        amount: [1],
        nameType: "alviss",
        message: "The darkness arrives as the realms are torn apart!",
        chance: 0.1,
    }
];

let spawnBosses = (census) => {
    if (!census.miniboss && !timer--) {
        timer--;
        const selection = bossSelections[ran.chooseChance(...bossSelections.map((selection) => selection.chance))];
        const amount = ran.chooseChance(...selection.amount) + 1;
        let bossMessage = amount > 1 ? "Visitors are coming..." : "A visitor is coming...";
        sockets.broadcast(bossMessage);
        console.log(bossMessage);
        if (selection.message) {
            bossMessage = selection.message;
            console.log(bossMessage);
            setTimeout(sockets.broadcast, 2500, bossMessage);
        }
        setTimeout(() => {
            let names = ran.chooseBossName(selection.nameType, amount);
            bossMessage = amount > 1 ? util.listify(names) + " have arrived!" : names + " has arrived!";
            sockets.broadcast(bossMessage);
            console.log(bossMessage);
            if (typeof names === "string") names = [names];
            names.forEach((name, i) => {
                let spot,
                    m = 0;
                do {
                    spot = room.randomType(selection.location);
                    m++;
                } while (dirtyCheck(spot, 500) && m < 30);
                let boss = new Entity(spot);
                boss.name = name;
                boss.define(selection.bosses.sort(() => 0.5 - Math.random())[i % selection.bosses.length]);
                boss.team = -100;
            });
        }, 5000);
        timer = Math.round(c.bossSpawnInterval * 60 + 5); // 5 seconds due to spawning process
    }
};

const crasherConfig = {
    max: Math.floor(room["nest"].length * c.CRASHER_RATIO),
    chance: 0.9,
    sentryChance: 0.95,
    crashers: [Class.crasher],
    sentries: [Class.sentryGun, Class.sentrySwarm, Class.sentryTrap],
};
function getCrasherType() {
    const seed = Math.random();
    if (seed > crasherConfig.sentryChance) return ran.choose(crasherConfig.sentries);
    return ran.choose(crasherConfig.crashers);
}
let spawnCrasher = (census) => {
    if (census.crasher < crasherConfig.max) {
        for (let i = 0; i < crasherConfig.max - census.crasher; i++) {
            if (Math.random() > crasherConfig.chance) {
                let spot,
                    i = 25;
                do {
                    spot = room.randomType("nest");
                    i--;
                    if (!i) return 0;
                } while (dirtyCheck(spot, 250));
                let o = new Entity(spot);
                o.define(getCrasherType());
                o.team = -100;
            }
        }
    }
};

let bots = [];
// The NPC function
let makenpcs = () => {
    let census = {
        crasher: 0,
        miniboss: 0,
        tank: 0,
        mothership: 0,
        sanctuary: 0,
    };
    let npcs = entities.filter(e => e)
    .map(instance => {
        if (instance.isSanctuary) {
            census.sanctuary++;
            return instance;
        }
        if (census[instance.type] != null) {
            census[instance.type]++;
            return instance;
        }
        if (instance.isMothership) {
            census.mothership++;
            return instance;
        }
    });
    // Spawning
    spawnCrasher(census);
    spawnBosses(census);

    // remove dead bots
    bots = bots.filter(e => !e.isDead());

    // upgrade existing ones
    for (let i = 0; i < bots.length; i++) {
        let o = bots[i];
        if (o.invuln) o.invuln = false;
        if (o.skill.level < c.SKILL_CAP) o.skill.score += 125;
        o.skill.maintain();
        o.skillUp([ "atk", "hlt", "spd", "str", "pen", "dam", "rld", "mob", "rgn", "shi" ][ran.chooseChance(1, 1, 3, 4, 4, 4, 4, 2, 1, 1)]);
        if (o.leftoverUpgrades && o.upgrade(ran.irandomRange(0, o.upgrades.length))) o.leftoverUpgrades--;
    }

    // then add new bots
    if (bots.length < c.BOTS && !arenaClosed) {
        let dread_bots = bots.filter(e => e.label.includes("Dreadnought"));
        let o = new Entity(room.randomType("norm")),
            color = 17,
            team = o.id,
            dread_bot = c.secondaryGameMode.includes("Manhunt") ? false : (ran.chooseChance(10, 1)
                    ? (dread_bots.length < (Math.round(c.BOTS / 6) + 1)
                            ? true
                            : false)
                    : (dread_bots < 1 && bots.length == c.BOTS - 1) ? true : false);
        o.define(Class.bot);
        if (!dread_bot) {
            if (c.RANDOM_COLORS && room.gameMode === "ffa") {
                color = Math.floor(Math.random() * 20);
            } else if (room.gameMode === "tdm") {
                team = getTeam(0);
                if (room["bas" + team].length) {
                    let loc;
                    do {
                        loc = room.randomType("bas" + team);
                    } while (dirtyCheck(loc, 50));
                    o.x = loc.x;
                    o.y = loc.y;
                }
                color = [10, 11, 12, 15, 25, 26, 27, 28][team - 1];
                team = -team;
            }
            o.define(Class.basic);
            o.team = team;
            o.color = color;
        } else {
            o.define(Class.dreadnought);
            o.setLevel(c.SKILL_CHEAT_CAP);
        }
        o.refreshBodyAttributes();
        o.isBot = true;
        o.name += ran.chooseBotName();
        //some guy in discord once suggested that some bots shouldnt upgrade to latest tier
        //o.leftoverUpgrades = ran.chooseChance(1, 5, 20, 37, 37);
        o.leftoverUpgrades = 1;
        bots.push(o);

        //TODO: add support for tag mode
        //NOTE: this code will
        if (c.GROUPS) {
            let master = {
                player: {
                    body: o,
                },
            };
            groups.addMember(master);
            o.team = -master.rememberedTeam;
            o.on('dead', () => groups.removeMember(master));
        }
    }
};

// Place obstacles and base protectors
placeRoids();

for (let loc of room["wall"]) spawnWall(loc);

class FoodType {
    constructor(groupName, types, chances, chance, isNestFood = false) {
        let scale;
        if (chances[0] === "scale") {
            scale = chances[1];
            chances = [];
            for (let i = types.length; i > 0; i--) {
                chances.push(i ** scale);
            }
        }
        this.name = groupName;
        if (types.length !== chances.length) {
            throw new RangeError(groupName + ": error with group. Please make sure there is the same number of types as chances.");
        }
        this.types = types;
        this.chances = chances;
        this.chance = chance * (scale > 4 && c.SHINY ? 1000 : 1);
        this.isNestFood = isNestFood;
    }
    choose(dev) {
        return dev
                ? this.types[ran.chooseChance(...this.chances.reverse())]
                : this.types[ran.chooseChance(...this.chances)];
    }
}
const foodTypes = [
    new FoodType("Normal Food",
        [Class.egg, Class.square, Class.triangle, Class.pentagon, Class.betaPentagon, Class.alphaPentagon],
        ["scale", 4], 2000
    ),
    new FoodType("Shiny Food",
        [Class.gem, Class.shinySquare, Class.shinyTriangle, Class.shinyPentagon, Class.shinyBetaPentagon, Class.shinyAlphaPentagon],
        ["scale", 5], 1
    ),
    new FoodType("Legendary Food",
        [Class.jewel, Class.legendarySquare, Class.legendaryTriangle, Class.legendaryPentagon, Class.legendaryBetaPentagon, Class.legendaryAlphaPentagon],
        ["scale", 5], 0.02
    ),
    new FoodType("Shadow Food",
        [Class.shadowSquare, Class.shadowTriangle, Class.shadowPentagon, Class.shadowBetaPentagon, Class.shadowAlphaPentagon],
        ["scale", 6], 0.005
    ),
    new FoodType("Rainbow Food",
        [Class.rainbowSquare, Class.rainbowTriangle, Class.rainbowPentagon, Class.rainbowBetaPentagon, Class.rainbowAlphaPentagon],
        ["scale", 6], 0.001
    ),
    // new FoodType("Trans Food",
    //     [Class.egg],
    //     ["scale", 9], 0.0005
    // ),
    new FoodType("Extradimensional Food",
        [Class.cube, Class.dodecahedron, Class.icosahedron],
        ["scale", 7], 0.0001
    ),
    new FoodType("Nest Food", // Commented out because stats aren't done yet.
        [Class.pentagon, Class.betaPentagon, Class.alphaPentagon, /*Class.alphaHexagon, Class.alphaHeptagon, Class.alphaOctogon, Class.alphaNonagon, Class.alphaDecagon, Class.icosagon*/],
        ["scale", 4], 1, true
    ),
];
function getFoodType(isNestFood = false) {
    const possible = [[], []];
    for (let i = 0; i < foodTypes.length; i++) {
        if (foodTypes[i].isNestFood == isNestFood) {
            possible[0].push(i);
            possible[1].push(foodTypes[i].chance);
        }
    }
    return possible[0][ran.chooseChance(...possible[1])];
}
function spawnShape(location, type = 0, how = false) {
    let o = new Entity(location);
    type = foodTypes[type].choose(how);
    o.define(type);
    o.define({
        BODY: {
            ACCELERATION: 0.015 / (type.FOOD.LEVEL + 1),
        },
    });
    o.facing = ran.randomAngle();
    o.team = -102;
    return o;
}
function spawnGroupedFood() {
    let location,
        i = 5;
    do {
        location = room.random();
        i--;
        if (i <= 0) {
            return;
        }
    } while (room.isIn("nest", location));
    for (let i = 0, amount = (Math.random() * 20) | 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2;
        spawnShape(
            {
                x: location.x + Math.cos(angle) * (Math.random() * 50),
                y: location.y + Math.sin(angle) * (Math.random() * 50),
            },
            getFoodType()
        );
    }
}
function spawnDistributedFood() {
    let location,
        i = 5;
    do {
        location = room.random();
        i--;
        if (i <= 0) return;
    } while (room.isIn("nest", location));
    spawnShape(location, getFoodType());
}
function spawnNestFood() {
    let shape = spawnShape(room.randomType("nest"), getFoodType(true));
    shape.isNestFood = true;
}
const makefood = () => {
    const maxFood =
        Math.sqrt(c.FOOD_AMOUNT) +
        (Math.sqrt(room.width * room.height) / c.FOOD_AMOUNT) * views.length;
    const maxNestFood =
        maxFood *
        (room["nest"].length / (room.xgrid * room.ygrid)) *
        c.NEST_FOOD_AMOUNT;
    const census = (() => {
        let food = 0;
        let nestFood = 0;
        for (let instance of entities) {
            if (instance.type === "food") {
                if (instance.isNestFood) nestFood++;
                else food++;
            }
        }
        return {
            food,
            nestFood,
        };
    })();
    if (census.food < maxFood) {
        for (let i = 0; i < maxFood - census.food; i++) {
            if (Math.random() > 0.875) {
                if (Math.random() > 0.375) {
                    spawnDistributedFood();
                } else {
                    spawnGroupedFood();
                }
            }
        }
    }
    if (census.nestFood < maxNestFood) {
        for (let i = 0; i < maxNestFood - census.nestFood; i++) {
            if (Math.random() > 0.75) {
                spawnNestFood();
            }
        }
    }
    loopThrough(sockets.players, function (instance) {
        // we love cheats
        if (instance.body != null && instance.body.spawnShape) {
            const loc = {
                x: instance.body.x,
                y: instance.body.y
            }
            spawnShape(loc, 1 + Math.random() * 5 | 0, true);
            instance.body.spawnShape = false;
        }
    });
};
// A less important loop. Runs at an actual 5Hz regardless of game speed.
const maintainloop = () => {
    // Do stuff
    makenpcs();
    makefood();
    // Regen health and update the grid
    loopThrough(entities, function (instance) {
        if (instance.shield.max) instance.shield.regenerate();
        if (instance.health.amount > 0) instance.health.regenerate(instance.shield.max && instance.shield.max === instance.shield.amount);
    });
};

const portalLoop = () => {
    let o = new Entity(room.randomType("nest"));
    o.define(Class.portal);
    o.team = -100;
    setTimeout(() => {
        o.destroy();
    }, 60000 * 1); // 1 minute
};

// Bring it to life
if (c.TRAIN) {
    setInterval(() => {
        let teams = new Set(entities.filter(r => (r.isPlayer || r.isBot)).map(r => r.team));

        for (let team of teams) {
            let train = entities.filter(r => (r.isPlayer || r.isBot) && r.team === team && !r.invuln).sort((a, b) => b.skill.score - a.skill.score);

            for (let [i, player] of train.entries()) {
                if (i === 0) continue;

                player.velocity.x = util.clamp(train[i - 1].x - player.x, -90, 90) * player.damp * 2;
                player.velocity.y = util.clamp(train[i - 1].y - player.y, -90, 90) * player.damp * 2;
            }
        }
    }, 33.33);
}
if (c.SPACE_MODE) {
    setInterval(() => {
        let players = entities.filter(r => (r.isPlayer || r.isBot) && !r.invuln);
        for (let player of players) {
            if (
                room.blackHoles[0].id == player.id &&
                (util.getDistance(player.x, room.width / 2) < 100 && util.getDistance(player.y, room.height / 2) < 100)
            ) {
                player.velocity.x += util.clamp(room.width / 2 - player.x, -90, 90) * player.damp * 0.1;
                player.velocity.y += util.clamp(room.height / 2 - player.y, -90, 90) * player.damp * 0.1;
            } else if (player.label != "Spectator") {
                player.velocity.x += util.clamp(room.blackHoles[0].x - player.x, -90, 90) * player.damp * 0.02;
                player.velocity.y += util.clamp(room.blackHoles[0].y - player.y, -90, 90) * player.damp * 0.02;
            }
        }
    }, 33.33);
}
setInterval(gameloop, room.cycleSpeed);
setInterval(maintainloop, 1000);
setInterval(speedcheckloop, 1000);
setInterval(gamemodeLoop, 1000);
portalLoop();
setInterval(portalLoop, 60000 * 3); // Every 3 minutes
setInterval(closeArena, 60000 * 60 * 24); // Restart every 24 hours
