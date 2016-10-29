
/**
 * Read the level
 *
 * @param plan
 * @constructor
 */
function Level(plan) {
    this.width = plan[0].length;
    this.height = plan.length;
    this.grid = [];
    this.actors = [];

    for (var y = 0; y < this.height; y++) {
        var line = plan[y], gridLine = [];
        for (var x = 0; x < this.width; x++) {
            var ch = line[x], fieldType = null;
            var Actor = actorChars[ch];
            if (Actor)
                this.actors.push(new Actor(new Vector(x, y), ch));
            else {
                if (ch == "x")
                    fieldType = "wall";
                else if (ch == "!")
                    fieldType = "lava";
            }
            gridLine.push(fieldType);
        }
        this.grid.push(gridLine);
    }

    this.trump = this.actors.filter(function (actor) {
        return actor.type == "trump";
    })[0];
    this.status = this.finishDelay = null;
}

/**
 * Check if the level is finished
 * @returns {boolean}
 */
Level.prototype.isFinished = function () {
    return this.status != null && this.finishDelay < 0;
};

/**
 * Vectorize our characters
 *
 * @param x
 * @param y
 * @constructor
 */
function Vector(x, y) {
    this.x = x;
    this.y = y;
}
Vector.prototype.plus = function (other) {
    return new Vector(this.x + other.x, this.y + other.y);
};
Vector.prototype.times = function (factor) {
    return new Vector(this.x * factor, this.y * factor);
};

/**
 * Establish our characters
 *
 * @type {{@: *, o: *, =: *, |: *, v: *}}
 */
var actorChars = {
    "@": Trump,
    "o": Money,
    "=": Lava, "|": Lava, "v": Lava,
    "d": Hillary
};

/**
 * Our Main character
 *
 * @param pos
 * @constructor
 */
function Trump(pos) {
    this.pos = pos.plus(new Vector(0, -2.0));
    this.size = new Vector(1.7, 2.0);
    this.speed = new Vector(0, 0);
}
Trump.prototype.type = "trump";

/**
 * Our Lava
 *
 * @param pos
 * @param ch
 * @constructor
 */
function Lava(pos, ch) {
    this.pos = pos;
    this.size = new Vector(1, 1);
    if (ch == "=") {
        this.speed = new Vector(2, 0);
    } else if (ch == "|") {
        this.speed = new Vector(0, 2);
    } else if (ch == "v") {
        this.speed = new Vector(0, 3);
        this.repeatPos = pos;
    }
}
Lava.prototype.type = "lava";

/**
 * Our Money~~ $$$
 *
 * @param pos
 * @constructor
 */
function Money(pos) {
    this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
    this.size = new Vector(1, 1);
    this.wobble = Math.random() * Math.PI * 2;
}
Money.prototype.type = "money";

/**
 * Hillary
 *
 * @param pos
 * @constructor
 */
function Hillary(pos) {
    this.pos = pos.plus(new Vector(0, -1.5));
    this.size = new Vector(1.7, 2.0);
    this.speed = new Vector(0, 0);
}
Hillary.prototype.type = "hillary";

/**
 * Draw our elements
 *
 * @param name
 * @param className
 * @returns {Element}
 */
function elt(name, className) {
    var elt = document.createElement(name);
    if (className) elt.className = className;
    return elt;
}

/**
 * Display our elements
 *
 * @param parent
 * @param level
 * @constructor
 */
function DOMDisplay(parent, level) {
    this.wrap = parent.appendChild(elt("div", "game"));
    this.level = level;

    this.wrap.appendChild(this.drawBackground());
    this.actorLayer = null;
    this.drawFrame();
}

var scale = 20;

/**
 * Draw our background
 *
 * @returns {Element}
 */
DOMDisplay.prototype.drawBackground = function () {
    var table = elt("table", "background");
    table.style.width = this.level.width * scale + "px";
    this.level.grid.forEach(function (row) {
        var rowElt = table.appendChild(elt("tr"));
        rowElt.style.height = scale + "px";
        row.forEach(function (type) {
            rowElt.appendChild(elt("td", type));
        });
    });
    return table;
};


/**
 * Draw the actors
 *
 * @returns {Element}
 */
DOMDisplay.prototype.drawActors = function () {
    var wrap = elt("div");
    this.level.actors.forEach(function (actor) {
        var rect = wrap.appendChild(elt("div",
            "actor " + actor.type));
        rect.style.width = actor.size.x * scale + "px";
        rect.style.height = actor.size.y * scale + "px";
        rect.style.left = actor.pos.x * scale + "px";
        rect.style.top = actor.pos.y * scale + "px";
    });
    return wrap;
};

/**
 * Draw the frame as it appears
 */
DOMDisplay.prototype.drawFrame = function () {
    if (this.actorLayer)
        this.wrap.removeChild(this.actorLayer);
    this.actorLayer = this.wrap.appendChild(this.drawActors());
    this.wrap.className = "game " + (this.level.status || "");
    this.scrollTrumpIntoView();
};

/**
 * Make sure the trump stays in the viewport
 */
DOMDisplay.prototype.scrollTrumpIntoView = function () {
    var width = this.wrap.clientWidth;
    var height = this.wrap.clientHeight;
    var margin = width / 3;

    // The viewport
    var left = this.wrap.scrollLeft, right = left + width;
    var top = this.wrap.scrollTop, bottom = top + height;

    var trump = this.level.trump;
    var center = trump.pos.plus(trump.size.times(0.5))
        .times(scale);

    if (center.x < left + margin)
        this.wrap.scrollLeft = center.x - margin;
    else if (center.x > right - margin)
        this.wrap.scrollLeft = center.x + margin - width;
    if (center.y < top + margin)
        this.wrap.scrollTop = center.y - margin;
    else if (center.y > bottom - margin)
        this.wrap.scrollTop = center.y + margin - height;
};

/**
 * GC Stuff
 */
DOMDisplay.prototype.clear = function () {
    this.wrap.parentNode.removeChild(this.wrap);
};


/**
 * We need to put things into motion
 *
 * @param pos
 * @param size
 * @returns {*}
 */
Level.prototype.obstacleAt = function (pos, size) {
    var xStart = Math.floor(pos.x);
    var xEnd = Math.ceil(pos.x + size.x);
    var yStart = Math.floor(pos.y);
    var yEnd = Math.ceil(pos.y + size.y);

    if (xStart < 0 || xEnd > this.width || yStart < 0)
        return "wall";
    if (yEnd > this.height)
        return "lava";
    for (var y = yStart; y < yEnd; y++) {
        for (var x = xStart; x < xEnd; x++) {
            var fieldType = this.grid[y][x];
            if (fieldType) return fieldType;
        }
    }
};

/**
 * Find out where things are
 *
 * @param actor
 * @returns {*}
 */
Level.prototype.actorAt = function (actor) {
    for (var i = 0; i < this.actors.length; i++) {
        var other = this.actors[i];
        if (other != actor &&
            actor.pos.x + actor.size.x > other.pos.x &&
            actor.pos.x < other.pos.x + other.size.x &&
            actor.pos.y + actor.size.y > other.pos.y &&
            actor.pos.y < other.pos.y + other.size.y)
            return other;
    }
};

/**
 * Global for how man steps to take
 *
 * @type {number}
 */
var maxStep = 0.05;

/**
 * Basic animation
 *
 * @param step
 * @param keys
 */
Level.prototype.animate = function (step, keys) {
    if (this.status != null)
        this.finishDelay -= step;

    while (step > 0) {
        var thisStep = Math.min(step, maxStep);
        this.actors.forEach(function (actor) {
            actor.act(thisStep, this, keys);
        }, this);
        step -= thisStep;
    }
};

/**
 * Lava does stuff :)
 *
 * @param step
 * @param level
 */
Lava.prototype.act = function (step, level) {
    var newPos = this.pos.plus(this.speed.times(step));
    if (!level.obstacleAt(newPos, this.size))
        this.pos = newPos;
    else if (this.repeatPos)
        this.pos = this.repeatPos;
    else
        this.speed = this.speed.times(-1);
};

/**
 * Globals for wobbling
 *
 * @type {number}
 */
var wobbleSpeed = 8, wobbleDist = 0.07;

/**
 * Money moves in a wobbly sort of way
 *
 * @param step
 */
Money.prototype.act = function (step) {
    this.wobble += step * wobbleSpeed;
    var wobblePos = Math.sin(this.wobble) * wobbleDist;
    this.pos = this.basePos.plus(new Vector(0, wobblePos));
};

/**
 * Hillary movements. Hillary only jumps. :|
 *
 * @param step
 * @param level
 * @param keys
 */
Hillary.prototype.act = function (step, level, keys) {
    this.speed.y += step * gravity;
    var motion = new Vector(0, this.speed.y * step);
    var newPos = this.pos.plus(motion);
    var obstacle = level.obstacleAt(newPos, this.size);
    if (obstacle) {
        level.trumpTouched(obstacle);
        this.speed.y = -jumpSpeed;
    } else {
        this.pos = newPos;
    }
};

/**
 * The speed of the trumps x cord
 *
 * @type {number}
 */
var trumpXSpeed = 7;

/**
 * The trump's x movement
 *
 * @param step
 * @param level
 * @param keys
 */
Trump.prototype.moveX = function (step, level, keys) {
    if (level.status !== "lost") {
        this.speed.x = 0;
        if (keys.left) this.speed.x -= trumpXSpeed;
        if (keys.right) this.speed.x += trumpXSpeed;

        var motion = new Vector(this.speed.x * step, 0);
        var newPos = this.pos.plus(motion);
        var obstacle = level.obstacleAt(newPos, this.size);
        if (obstacle)
            level.trumpTouched(obstacle);
        else
            this.pos = newPos;
    }
};

/**
 * Gravity sucks
 *
 * @type {number}
 */
var gravity = 30;

/**
 * How high can we jump?
 *
 * @type {number}
 */
var jumpSpeed = 17;

/**
 * Y speed of the trump
 *
 * @param step
 * @param level
 * @param keys
 */
Trump.prototype.moveY = function (step, level, keys) {
    if (level.status !== "lost") {
        if(!keys.shift){
            this.speed.y += step * gravity;
            var motion = new Vector(0, this.speed.y * step);
            var newPos = this.pos.plus(motion);
            var obstacle = level.obstacleAt(newPos, this.size);
            if (obstacle) {
                level.trumpTouched(obstacle);
                if (keys.up && this.speed.y > 0) {
                    this.speed.y = -jumpSpeed;
                }
                else
                    this.speed.y = 0;
            } else {
                this.pos = newPos;
            }
        } else {
            this.speed.y = 0;
        }
    }
};

/**
 * Let's move the trump now
 *
 * @param step
 * @param level
 * @param keys
 */
Trump.prototype.act = function (step, level, keys) {
    this.moveX(step, level, keys);
    this.moveY(step, level, keys);

    var otherActor = level.actorAt(this);
    if (otherActor)
        level.trumpTouched(otherActor.type, otherActor);

    // Losing animation
    if (level.status == "lost") {
        dead = true;
        this.pos.y += step;
        this.size.y -= step;
    }
};

/**
 * Was the trump touched?
 *
 * @param type
 * @param actor
 */
Level.prototype.trumpTouched = function (type, actor) {
    if (type == "lava" && this.status == null) {
        this.status = "lost";
        this.finishDelay = 3;
    } else if (type == "hillary") {
        this.status = "lost";
        this.finishDelay = 3;
    } else if (type == "money") {
        this.actors = this.actors.filter(function (other) {
            return other != actor;
        });
        // If there aren't any coins left, trump wins
        if (!this.actors.some(function (actor) {
                return actor.type == "money";
            })) {
            this.status = "won";
            this.finishDelay = 1;
        }
    }
};

/**
 * D-Pad controls
 * todo add wasd and space
 * @type {{37: string, 38: string, 39: string}}
 */
var arrowCodes = {37: "left", 38: "up", 39: "right", 65: "left", 87: "up", 68: "right", 32: "up", 16: "shift"};

/**
 * Track the keys on the keyboard
 * todo add touch
 *
 * @param codes
 * @returns {null}
 */
function trackKeys(codes) {
    var pressed = Object.create(null);

    function handler(event) {
        if (codes.hasOwnProperty(event.keyCode)) {
            var down = event.type == "keydown";
            pressed[codes[event.keyCode]] = down;
            event.preventDefault();
        }
    }

    addEventListener("keydown", handler);
    addEventListener("keyup", handler);
    return pressed;
}

/**
 * helper method to run the animations
 *
 * @param frameFunc
 */
function runAnimation(frameFunc) {
    var lastTime = null;

    function frame(time) {
        var stop = false;
        if (lastTime != null) {
            var timeStep = Math.min(time - lastTime, 100) / 1000;
            stop = frameFunc(timeStep) === false;
        }
        lastTime = time;
        if (!stop)
            requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

/**
 * Let's use the keys that we have now and trace them
 *
 * @type {null}
 */
var arrows = trackKeys(arrowCodes);

/**
 * Using our runAnimation, we build the level run it
 *
 * @param level
 * @param Display
 * @param andThen
 */
function runLevel(level, Display, andThen) {
    var display = new Display(document.body, level);
    runAnimation(function (step) {
        level.animate(step, arrows);
        display.drawFrame(step);
        if (level.isFinished()) {
            display.clear();
            if (andThen)
                andThen(level.status);
            return false;
        }
    });
}

/**
 * Run the game (Main loop)
 *
 * @param plans
 * @param Display
 */
function runGame(plans, Display) {

    function startGame(event) {
        console.log(event.keyCode);
        if (event.keyCode == 13) {
            removeEventListener("keydown", startGame);
            startLevel(0);
            var startScreen = document.getElementById("startScreen");
            startScreen.style.display = "none";
        }
    }

    function startClick(event) {
        removeEventListener("keydown", startGame);
        startLevel(0);
        var startScreen = document.getElementById("startScreen");
        startScreen.style.display = "none";
    }

    var startScreen = document.getElementById("startScreen");
    startScreen.style.display = "block";
    startScreen.addEventListener("click", startClick);

    addEventListener("keydown", startGame);

    function startLevel(n) {
        runLevel(new Level(plans[n]), Display, function (status) {
            if (status == "lost") {
                function getEnter(event) {
                    if (event.keyCode == 13) {
                        removeEventListener("keydown", getEnter);
                        var loseScreen = document.getElementById("loseScreen");
                        loseScreen.style.display = "none";
                        startLevel(n);
                    }
                }

                var loseScreen = document.getElementById("loseScreen");
                loseScreen.style.display = "block";

                addEventListener("keydown", getEnter);
            }
            else if (n < plans.length - 1) {
                startLevel(n + 1);
            }
            else {
                console.log("You win!");
                // TODO Win Screen
                function startOver(event) {
                    if (event.keyCode == 13) {
                        removeEventListener("keydown", startOver);
                        var winScreen = document.getElementById("winScreen");
                        winScreen.style.display = "none";
                        startLevel(0);
                    }

                    var winScreen = document.getElementById("winScreen");
                    winScreen.style.display = "block";
                }
                addEventListener("keydown", startOver);
            }
        });
    }
}
