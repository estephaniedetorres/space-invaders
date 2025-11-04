const scoreEl = document.querySelector('#scoreEl');
const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = innerWidth
canvas.height = innerHeight

// Game state
let game = {
    over: false,
    active: false
}

let score = 0
let animationId; // holds the requestAnimationFrame ID

let lives = 3;


let level = 1;
const maxLevels = 3;

const levelConfig = {
    1: { name: 'Easy', gridSpeed: 2, invaderRows: [2, 3], invaderCols: [5, 8], spawnRate: 120 },
    2: { name: 'Moderate', gridSpeed: 3, invaderRows: [3, 5], invaderCols: [7, 10], spawnRate: 80 },
    3: { name: 'Hard', gridSpeed: 4, invaderRows: [5, 7], invaderCols: [8, 12], spawnRate: 60 }
};


// DOM elements
const startMenu = document.querySelector('#startMenu')
const playBtn = document.querySelector('#playBtn')
const instructionsBtn = document.querySelector('#instructionsBtn')
const instructionsModal = document.querySelector('#instructionsModal')
const closeInstructions = document.querySelector('#closeInstructions')
const backBtn = document.querySelector('#backBtn')
const restartBtn = document.querySelector('#restartBtn')
const gameOverMenu = document.querySelector('#gameOverMenu')
const restartTopBtn = document.querySelector('#restartTopBtn');
const backToMenuBtn = document.querySelector('#backToMenuBtn');



// --- Audio ---
const sfx = {
    shoot: './audio/shoot.mp3',
    explosion: './audio/explosion.mp3',
    shield: './audio/shield.mp3',
    background: './audio/bg.mp3',
    gameOver: './audio/gameover.mp3',
    levelUp: './audio/levelup.mp3'
};

// Helper to play a sound with overlap
function playSound(path, volume = 1) {
    const audio = new Audio(path);
    audio.volume = volume;
    audio.play().catch(err => console.warn("Sound error:", err));
}



// Mobile buttons
const mobileControls = document.querySelector('#mobileControls');

const keys = {
    a: { pressed: false },
    d: { pressed: false },
    space: { pressed: false }
};

function checkMobileControls() {
    const mobileControls = document.querySelector('#mobileControls');
    if (!game.active) {
        mobileControls.style.display = 'none';
        return;
    }
    mobileControls.style.display = window.innerWidth <= 1024 ? 'flex' : 'none';
}

// call this once (you already call bindMobileControls() on load)
function bindMobileControls() {
    // guard: don't bind twice
    if (bindMobileControls._bound) return;
    bindMobileControls._bound = true;

    const left = document.querySelector('#leftBtn');
    const right = document.querySelector('#rightBtn');
    const shoot = document.querySelector('#shootBtn');

    if (!left || !right || !shoot) {
        console.warn('Mobile control elements not found');
        return;
    }

    // helper to add many event types
    function addControlHandlers(el, downHandler, upHandler) {
        // pointer events - best support (covers mouse + touch + pen)
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); downHandler(e); });
        el.addEventListener('pointerup', (e) => { e.preventDefault(); upHandler(e); });
        el.addEventListener('pointercancel', (e) => { e.preventDefault(); upHandler(e); });

        // fallback: touch
        el.addEventListener('touchstart', (e) => { e.preventDefault(); downHandler(e); }, { passive: false });
        el.addEventListener('touchend', (e) => { e.preventDefault(); upHandler(e); }, { passive: false });
        el.addEventListener('touchcancel', (e) => { e.preventDefault(); upHandler(e); }, { passive: false });

        // fallback: mouse (desktop)
        el.addEventListener('mousedown', (e) => { e.preventDefault(); downHandler(e); });
        el.addEventListener('mouseup', (e) => { e.preventDefault(); upHandler(e); });
        // mouseleave - when cursor leaves the button, stop movement
        el.addEventListener('mouseleave', (e) => { e.preventDefault(); upHandler(e); });
    }

    addControlHandlers(left,
        () => { keys.a.pressed = true; },
        () => { keys.a.pressed = false; }
    );

    addControlHandlers(right,
        () => { keys.d.pressed = true; },
        () => { keys.d.pressed = false; }
    );

    addControlHandlers(shoot,
        () => { keys.space.pressed = true; },
        () => { keys.space.pressed = false; }
    );

    shoot.addEventListener('pointerdown', () => {
        unlockAudio();
    });

}

window.addEventListener('resize', checkMobileControls);
checkMobileControls(); // initial 
bindMobileControls(); // enable mobile buttons


// Show modal when instructions button clicked
instructionsBtn.addEventListener('click', () => {
    instructionsModal.style.display = 'flex'
})

// Close modal when X clicked
closeInstructions.addEventListener('click', () => {
    instructionsModal.style.display = 'none'
})

// Optional: close modal when clicking outside the content
instructionsModal.addEventListener('click', (e) => {
    if (e.target === instructionsModal) {
        instructionsModal.style.display = 'none'
    }
})

let bgMusic;
// Play button
playBtn.addEventListener('click', () => {
    startMenu.style.display = 'none'
    startGame()

    if (!bgMusic) {
        bgMusic = new Audio(sfx.background);
        bgMusic.volume = 0.4;
        bgMusic.loop = true;
        bgMusic.play().catch(err => console.warn("BG music error:", err));
    }
})

// Restart button (after game over)
restartBtn.addEventListener('click', () => {
    gameOverMenu.style.display = 'none';
    gameOverSoundPlayed = false; // reset
    setTimeout(() => startGame(), 1000); // small 1s delay
});

restartTopBtn.addEventListener('click', () => {
    setTimeout(() => startGame(), 1000);
});

let audioUnlocked = false;

function unlockAudio() {
    if (audioUnlocked) return;
    // play a silent sound to unlock the audio context
    const audio = new Audio(sfx.shoot);
    audio.volume = 0;
    audio.play().catch(() => { });
    audioUnlocked = true;
}

// Call this once on any first user interaction
playBtn.addEventListener('click', unlockAudio);
window.addEventListener('keydown', unlockAudio, { once: true });



function startGame(newLevel = 1, keepScore = false) {
    cancelAnimationFrame(animationId);

    // Reset game state first
    game.active = true;
    game.over = false;
    // Only reset score if not continuing a level
    if (!keepScore) score = 0;
    lives = 3;
    updateHUD();

    level = newLevel
    scoreEl.innerHTML = score;
    document.querySelector('#levelDisplay').innerHTML = `Level: ${level} (${levelConfig[level].name})`;

    checkMobileControls();

    // Show HUD & buttons
    document.querySelector('#hud').style.display = 'flex';
    restartTopBtn.style.display = 'block';
    backToMenuBtn.style.display = 'block';


    // Reset player
    player.position.x = canvas.width / 2 - player.width / 2;
    player.position.y = canvas.height - player.height - 20;
    player.opacity = 1;

    // Clear arrays
    projectiles.length = 0;
    grids.length = 0;
    invaderProjectiles.length = 0;
    particles.length = 0;
    delete window.mothership;



    // Generate background particles
    for (let i = 0; i < 100; i++) {
        particles.push(new Particle({
            position: { x: Math.random() * canvas.width, y: Math.random() * canvas.height },
            velocity: { x: 0, y: 0.2 },
            radius: Math.random() * 3,
            color: 'white'
        }));
    }

    frames = 0;
    randomInterval = Math.floor((Math.random() * 500) + 500);

    if (level >= 2 && level < 3) {
        grids.push(new Grid());
    }

    const waitForAssets = setInterval(() => {
        // Wait until player *and* at least one invader image are loaded
        const gridReady = grids.length === 0 || grids[0].invaders.some(inv => inv.image);
        if (player.image && gridReady) {
            clearInterval(waitForAssets);
            animate();
            checkMobileControls();
        }
    }, 50);


}

// Back to Menu button
backToMenuBtn.addEventListener('click', () => {
    game.active = false;

    grids.length = 0;
    projectiles.length = 0;
    invaderProjectiles.length = 0;
    particles.length = 0;

    c.fillStyle = 'black';
    c.fillRect(0, 0, canvas.width, canvas.height);
    startMenu.style.display = 'block';
    document.querySelector('#hud').style.display = 'none';
    restartTopBtn.style.display = 'none';
    backToMenuBtn.style.display = 'none';

    checkMobileControls(); // ensure buttons hide when going back
});




class Player {
    constructor() {

        this.velocity = {
            x: 0,
            y: 0
        }

        this.rotation = 0
        this.opacity = 1

        const image = new Image()
        image.src = './img/spaceship.png'
        image.onload = () => {
            const scale = 0.15
            this.image = image
            this.width = image.width * scale
            this.height = image.height * scale
            this.position = {
                x: canvas.width / 2 - this.width / 2,
                y: canvas.height - this.height - 20
            }
        }
    }

    draw() {

        // c.fillStyle = 'red'
        // c.fillRect(this.position.x, this.position.y, this.width, this.height)
        if (this.image) {
            c.save()
            c.globalAlpha = this.opacity
            c.translate(player.position.x + player.width / 2, player.position.y + player.height / 2)
            c.rotate(this.rotation)
            c.translate(-player.position.x - player.width / 2, -player.position.y - player.height / 2)
            c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height)
            c.restore()
        }
    }

    update() {
        if (this.image) {
            this.draw()
            this.position.x += this.velocity.x
        }
    }
}

class Projectile {
    constructor({ position, velocity }) {
        this.position = position
        this.velocity = velocity

        this.radius = 4
    }

    draw() {
        c.beginPath()
        c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
        c.fillStyle = 'red'
        c.fill()
        c.closePath()
    }
    update() {
        this.draw()
        this.position.x += this.velocity.x
        this.position.y += this.velocity.y
    }
}

class Particle {
    constructor({ position, velocity, radius, color, fades }) {
        this.position = position
        this.velocity = velocity

        this.radius = radius
        this.color = color
        this.opacity = 1
        this.fades = fades
    }

    draw() {
        c.save()
        c.globalAlpha = this.opacity
        c.beginPath()
        c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
        c.fillStyle = this.color
        c.fill()
        c.closePath()
        c.restore()
    }
    update() {
        this.draw()
        this.position.x += this.velocity.x
        this.position.y += this.velocity.y

        if (this.fades)
            this.opacity -= 0.01
    }
}

class invaderProjectile {
    constructor({ position, velocity }) {
        this.position = position
        this.velocity = velocity

        this.width = 3
        this.height = 10
    }

    draw() {
        c.fillStyle = 'lightblue'
        c.fillRect(this.position.x, this.position.y, this.width, this.height)
    }
    update() {
        this.draw()
        this.position.x += this.velocity.x
        this.position.y += this.velocity.y
    }
}

class Invader {
    constructor({ position }) {

        this.velocity = {
            x: 0,
            y: 0
        }

        const image = new Image()
        image.src = './img/invader.png'
        image.onload = () => {
            const scale = 1
            this.image = image
            this.width = image.width * scale
            this.height = image.height * scale
            this.position = {
                x: position.x,
                y: position.y
            }
        }
    }

    draw() {

        // c.fillStyle = 'red'
        // c.fillRect(this.position.x, this.position.y, this.width, this.height)
        if (this.image) {
            c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height)
        }
    }

    update({ velocity }) {
        if (this.image) {
            this.draw()
            this.position.x += velocity.x
            this.position.y += velocity.y
        }
    }

    shoot(InvaderProjectiles) {
        InvaderProjectiles.push(new invaderProjectile({
            position: {
                x: this.position.x + this.width / 2,
                y: this.position.y + this.height
            },
            velocity: {
                x: 0,
                y: 5
            }
        }))
    }
}

class Mothership extends Invader {
    constructor() {
        super({
            position: {
                x: canvas.width / 2 - 75,
                y: 100
            }
        });

        // Load its own (or bigger) image
        const image = new Image();
        image.src = './img/invader.png'; // replace with 'mothership.png' if you have one
        image.onload = () => {
            this.image = image;
            this.width = image.width * 5;  // twice the normal invader
            this.height = image.height * 5;
        };

        // Boss stats
        this.health = 20;
        this.velocity = { x: 3, y: 0 };
        this.cooldown = 0;
    }

    update() {
        if (!this.image) return;

        // Move side-to-side
        this.position.x += this.velocity.x;

        if (this.position.x + this.width >= canvas.width || this.position.x <= 0) {
            this.velocity.x = -this.velocity.x;
            this.position.y += 30;
        }

        // 💥 If mothership health is low, add a red flashing effect
        const lowHealth = this.health <= 5;
        if (lowHealth) {
            const flash = Math.sin(Date.now() / 100) > 0 ? 'rgba(255, 0, 0, 0.4)' : 'rgba(255, 0, 0, 0.1)';
            c.save();
            c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);

            // red overlay pulse
            c.fillStyle = flash;
            c.fillRect(this.position.x, this.position.y, this.width, this.height);
            c.restore();

            // subtle shake
            this.position.x += (Math.random() - 0.5) * 2;
            this.position.y += (Math.random() - 0.5) * 1;
        } else {
            // Normal draw
            c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
        }
        // Draw health bar
        const barWidth = this.width;
        const barHeight = 6;
        const healthRatio = Math.max(this.health / 20, 0);
        c.fillStyle = 'red';
        c.fillRect(this.position.x, this.position.y - 10, barWidth, barHeight);
        c.fillStyle = 'lime';
        c.fillRect(this.position.x, this.position.y - 10, barWidth * healthRatio, barHeight);
        c.strokeStyle = 'black';
        c.strokeRect(this.position.x, this.position.y - 10, barWidth, barHeight);

    }


    shoot() {
        if (this.cooldown > 0) {
            this.cooldown--;
            return;
        }

        // Fire projectile
        invaderProjectiles.push(
            new invaderProjectile({
                position: {
                    x: this.position.x + this.width / 2,
                    y: this.position.y + this.height
                },
                velocity: { x: 0, y: 4 }
            })
        );

        this.cooldown = 40;
    }
}




class Grid {
    constructor() {
        const config = levelConfig[level];

        this.position = {
            x: 0,
            y: 0
        }

        this.velocity = {
            x: config.gridSpeed,
            y: 0
        }

        this.invaders = []

        let rows = Math.floor(Math.random() * (config.invaderRows[1] - config.invaderRows[0] + 1)) + config.invaderRows[0];
        let cols = Math.floor(Math.random() * (config.invaderCols[1] - config.invaderCols[0] + 1)) + config.invaderCols[0];

        if (level === 2) {
            rows += 2;        // +2 rows
            cols += 3;        // +3 columns
            this.velocity.x *= 1.5; // 50% faster side-to-side
        }

        this.width = cols * 30
        const topOffset = 100;
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                this.invaders.push(new Invader({
                    position: {
                        x: x * 30,
                        y: y * 30 + topOffset
                    }
                }))
            }
        }
        console.log(this.invaders)
    }

    update() {
        this.position.x += this.velocity.x
        this.position.y += this.velocity.y

        this.velocity.y = 0

        if (this.position.x + this.width >= canvas.width || this.position.x <= 0) {
            this.velocity.x = -this.velocity.x
            this.velocity.y = 30
        }
    }
}

const player = new Player()
const projectiles = []
const grids = []
const invaderProjectiles = []
const particles = []

let frames = 0
let randomInterval = Math.floor((Math.random() * 500) + 500)

let lastShotTime = 0;
const shotCooldown = 200; // milliseconds between shots


const shootAudio = new Audio(sfx.shoot);
shootAudio.volume = 0.7;
shootAudio.preload = 'auto';


for (let i = 0; i < 100; i++) {
    particles.push(new Particle({
        position: {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height
        },
        velocity: {
            x: 0,
            y: 0.2
        },
        radius: Math.random() * 3,
        color: 'white'
    }))
}

function createParticles({ object, color, fades }) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle({
            position: {
                x: object.position.x + object.width / 2,
                y: object.position.y + object.height / 2
            },
            velocity: {
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2
            },
            radius: Math.random() * 3,
            color: color || '#BAA0DE',
            fades
        }))
    }
}

function explodeMothership(mothership) {
    // Big flash
    for (let i = 0; i < 50; i++) {
        particles.push(new Particle({
            position: {
                x: mothership.position.x + Math.random() * mothership.width,
                y: mothership.position.y + Math.random() * mothership.height
            },
            velocity: {
                x: (Math.random() - 0.5) * 6,
                y: (Math.random() - 0.5) * 6
            },
            radius: Math.random() * 5 + 2,
            color: ['white', 'yellow', 'orange', 'red'][Math.floor(Math.random() * 4)],
            fades: true
        }));
    }

    // Shake effect
    let shakeTime = 15;
    const originalX = c.getTransform().e;
    const originalY = c.getTransform().f;

    const shake = setInterval(() => {
        const dx = (Math.random() - 0.5) * 20;
        const dy = (Math.random() - 0.5) * 20;
        c.setTransform(1, 0, 0, 1, dx, dy);
        shakeTime--;
        if (shakeTime <= 0) {
            clearInterval(shake);
            c.setTransform(1, 0, 0, 1, originalX, originalY);
        }
    }, 30);

    // Gradual fade (optional debris fade out)
    mothership.health = 0;
}

// --- Special Powers System ---

const powers = {
    shield: { active: false, cooldown: 0, duration: 3000, key: 's', ready: true },
    rapidFire: { active: false, cooldown: 0, duration: 5000, key: 'f', ready: true },
};

// Helper to activate power
function activatePower(type) {
    const power = powers[type];
    if (!power.ready) return; // still cooling down

    switch (type) {
        case 'shield':
            power.active = true;
            power.ready = false;
            player.opacity = 0.5;
            setTimeout(() => {
                power.active = false;
                player.opacity = 1;
                startCooldown(type, 10000); // 10s cooldown
            }, power.duration);
            break;

        case 'rapidFire':
            power.active = true;
            power.ready = false;
            setTimeout(() => {
                power.active = false;
                startCooldown(type, 15000); // 15s cooldown
            }, power.duration);
            break;
    }
}

function startCooldown(type, ms) {
    powers[type].cooldown = ms;
    const interval = setInterval(() => {
        powers[type].cooldown -= 1000;
        if (powers[type].cooldown <= 0) {
            clearInterval(interval);
            powers[type].ready = true;
        }
    }, 1000);
}


// Power HUD
function drawPowersHUD() {
    const ctx = c;
    const baseX = canvas.width - 850; // distance from left
    const baseY = 40;
    ctx.font = '16px monospace';
    ctx.fillStyle = 'white';
    ctx.fillText('POWERS:', baseX, baseY);

    let offset = 20;
    Object.entries(powers).forEach(([name, p]) => {
        const text = `${name.toUpperCase()} [${p.key.toUpperCase()}] ${p.ready ? 'READY' : `${Math.ceil(p.cooldown / 1000)}s`}`;
        ctx.fillStyle = p.ready ? '#00ff00' : '#888';
        ctx.fillText(text, baseX, baseY + offset);
        offset += 20;
    });
}

const shootPoolSize = 5; // number of audio instances
const shootPool = [];
for (let i = 0; i < shootPoolSize; i++) {
    const audio = new Audio(sfx.shoot);
    audio.volume = 0.7;
    audio.preload = 'auto';
    shootPool.push(audio);
}
let shootIndex = 0;


function shootProjectile() {
    const now = Date.now();
    const cooldown = powers.rapidFire.active ? 50 : shotCooldown; // faster if rapid fire is active

    if (now - lastShotTime < cooldown) return; // respect cooldown
    projectiles.push(new Projectile({
        position: {
            x: player.position.x + player.width / 2,
            y: player.position.y
        },
        velocity: { x: 0, y: -10 }
    }));
    lastShotTime = now;

    // Play sound instantly using a clone
    if (audioUnlocked) {
        const audio = shootPool[shootIndex];
        audio.currentTime = 0; // reset to start
        audio.volume = powers.rapidFire.active ? 0.5 : 0.7;
        audio.play().catch(err => console.warn("Shoot sound failed:", err));

        shootIndex = (shootIndex + 1) % shootPoolSize; // cycle through pool
    }
}


let gameOverSoundPlayed = false;

function animate() {
    if (!game.active) return;
    animationId = requestAnimationFrame(animate);

    c.fillStyle = 'black'
    c.fillRect(0, 0, canvas.width, canvas.height)
    player.update()

    particles.forEach((particle, i) => {

        if (particle.position.y - particle.radius >= canvas.height) {
            particle.position.x = Math.random() * canvas.width
            particle.position.y = -particle.radius
        }
        if (particle.opacity <= 0) {
            setTimeout(() => {
                particles.splice(i, 1)
            }, 0)

        } else {
            particle.update()
        }
    })



    //console.log(particles)
    invaderProjectiles.forEach((invaderProjectile, index) => {
        if (invaderProjectile.position.y + invaderProjectile.height >= canvas.height) {
            setTimeout(() => {
                invaderProjectiles.splice(index, 1)
            }, 0)
        } else
            invaderProjectile.update()

        //projectile hits player
        if (
            invaderProjectile.position.y + invaderProjectile.height >= player.position.y &&
            invaderProjectile.position.x + invaderProjectile.width >= player.position.x &&
            invaderProjectile.position.x <= player.position.x + player.width
        ) {
            if (powers.shield.active) {
                createParticles({ object: player, color: 'cyan', fades: true });
                invaderProjectiles.splice(index, 1);
                return;
            }

            // Lose a life
            lives--;
            updateHUD();

            // Small explosion + sound
            createParticles({ object: player, color: 'white', fades: true });
            playSound(sfx.explosion, 0.6);
            invaderProjectiles.splice(index, 1);

            if (lives > 0) {
                // brief invulnerability
                player.opacity = 0.3;
                setTimeout(() => player.opacity = 1, 1500);
            } else {
                // No lives left — Game Over
                player.opacity = 0;
                playSound(sfx.gameOver, 1);
                game.over = true;

                setTimeout(() => {
                    game.active = false;
                    showGameOverMenu();
                }, 1500);
            }
        }

    })

    console.log(invaderProjectiles)

    projectiles.forEach((projectile, index) => {
        if (projectile.position.y + projectile.radius <= 0) {
            setTimeout(() => {
                projectiles.splice(index, 1)
            }, 0)
        } else {
            projectile.update()
        }
    })

    grids.forEach((grid, gridIndex) => {
        grid.update()
        //spawn projectiles
        let shootRate = level === 2 ? 70 : 100; // shoot faster on level 2
        if (frames % shootRate === 0 && grid.invaders.length > 0) {
            grid.invaders[Math.floor(Math.random() * grid.invaders.length)].shoot(invaderProjectiles);
        }

        grid.invaders.forEach((invader, i) => {
            invader.update({ velocity: grid.velocity })

            // Check if invader hits the player or bottom of the screen
            if (
                invader.position.y + invader.height >= player.position.y ||
                invader.position.y + invader.height >= canvas.height
            ) {
                // Game Over: invaders reached bottom or hit player
                game.over = true;
                game.active = false;
                playSound(sfx.gameOver, 1);
                player.opacity = 0;

                setTimeout(() => {
                    showGameOverMenu();
                }, 1000);

                return; // stop further checks
            }


            //projectiles hit enemy
            projectiles.forEach((projectile, j) => {
                if (projectile.position.y - projectile.radius <= invader.position.y + invader.height && projectile.position.x + projectile.radius >= invader.position.x && projectile.position.x - projectile.radius <= invader.position.x + invader.width && projectile.position.y + projectile.radius >= invader.position.y) {


                    setTimeout(() => {
                        const invaderFound = grid.invaders.find(invader2 => invader2 === invader)
                        const projectileFound = projectiles.find(projectile2 => projectile2 === projectile)

                        //remove invader and projectile
                        if (invaderFound && projectileFound) {
                            score += 100
                            scoreEl.innerHTML = score
                            createParticles({
                                object: invader,
                                fades: true
                            })
                            playSound(sfx.explosion, 0.7);
                            grid.invaders.splice(i, 1)
                            projectiles.splice(j, 1)

                            if (grid.invaders.length > 0) {
                                const firstInvader = grid.invaders[0]
                                const lastInvader = grid.invaders[grid.invaders.length - 1]

                                grid.width = lastInvader.position.x - firstInvader.position.x + lastInvader.width

                                grid.position.x = firstInvader.position.x
                            } else {
                                grids.splice(gridIndex, 1)
                            }
                            // If all invaders and grids are gone — level cleared
                            if (grids.length === 0 && game.active && !game.over) {
                                if (level < maxLevels) {
                                    game.active = false;
                                    playSound(sfx.levelUp, 0.8);
                                    showLevelTransition(level + 1, true);
                                } else {
                                    game.active = false;
                                    showWinScreen();
                                }
                            }


                        }
                    }, 0)


                }
            })
        })
    })

    // Spawn mothership only in level 3
    // Spawn mothership only in level 3
    if (level === 3 && !window.mothership) {
        window.mothership = new Mothership();
    }

    if (window.mothership) {
        window.mothership.update();
        window.mothership.shoot();

        // Check for projectile hits
        projectiles.forEach((proj, i) => {
            if (
                proj.position.x > window.mothership.position.x &&
                proj.position.x < window.mothership.position.x + window.mothership.width &&
                proj.position.y < window.mothership.position.y + window.mothership.height
            ) {
                window.mothership.health--;
                projectiles.splice(i, 1);
                createParticles({ object: window.mothership, color: 'purple', fades: true });

                if (window.mothership.health <= 0) {
                    score += 1000;
                    scoreEl.innerHTML = score;
                    c.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    c.fillRect(0, 0, canvas.width, canvas.height);


                    explodeMothership(window.mothership); // 💥 big animated explosion
                    playSound(sfx.explosion, 1);

                    // Remove mothership after short delay
                    setTimeout(() => {
                        delete window.mothership;
                        showWinScreen();
                    }, 1500);
                }

            }
        });

        if (window.mothership && window.mothership.health <= 3) {
            c.save();
            const alpha = Math.abs(Math.sin(Date.now() / 150)) * 0.3;
            c.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            c.fillRect(0, 0, canvas.width, canvas.height);
            c.restore();
        }

    }

    // Fire projectile continuously while holding space / shoot button
    // Inside animate() loop
    if (keys.space.pressed) shootProjectile();
    if (player.image) {
        if (keys.a.pressed && player.position.x >= 0) {
            player.velocity.x = -7;
            player.rotation = -0.15;
        } else if (keys.d.pressed && player.position.x + player.width <= canvas.width) {
            player.velocity.x = 7;
            player.rotation = 0.15;
        } else {
            player.velocity.x = 0;
            player.rotation = 0;
        }
    }

    console.log(frames)
    //spawning enemies
    // if (frames % randomInterval === 0) {
    //     grids.push(new Grid())
    //     randomInterval = Math.floor((Math.random() * 500) + 500)
    //     frames = 0
    //     //console.log(randomInterval)
    // }
    // Spawn new grid only in Level 1
    // Spawn new grid only in Level 1 if no grids are present
    if (level === 1 && grids.length === 0 && frames % randomInterval === 0) {
        grids.push(new Grid());
        randomInterval = Math.floor((Math.random() * 500) + 500);
        frames = 0;
    }


    drawPowersHUD();
    updateHUD(); // 💥 add this
    frames++
}
//animate()

let lastLives = null; // to detect when hit for flash

function updateHUD() {
    const scoreEl = document.querySelector('#scoreEl');
    const levelDisplay = document.querySelector('#levelDisplay');
    const livesBar = document.querySelector('#livesBar');

    if (scoreEl) scoreEl.textContent = score;
    if (levelDisplay) levelDisplay.textContent = `Level: ${level} (${levelConfig[level].name})`;

    if (livesBar) {
        const maxLives = 3;
        const ratio = Math.max(lives / maxLives, 0);

        const barWidth = 50;
        const barHeight = 8;

        const off = document.createElement('canvas');
        off.width = barWidth;
        off.height = barHeight;
        const ctx = off.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, barWidth, barHeight);

        // Static gradient (red → yellow → green)
        const gradient = ctx.createLinearGradient(0, 0, barWidth, 0);
        gradient.addColorStop(0, '#ff0000');  // Red
        gradient.addColorStop(0.5, '#ffff00'); // Yellow
        gradient.addColorStop(1, '#00ff00');  // Green
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, barWidth, barHeight);

        // Mask out right side based on lives
        const maskWidth = barWidth * (1 - ratio);
        ctx.fillStyle = '#000';
        ctx.fillRect(barWidth - maskWidth, 0, maskWidth, barHeight);

        // Flash white when hit
        if (lastLives !== null && lives < lastLives) {
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillRect(0, 0, barWidth, barHeight);
            setTimeout(() => updateHUD(), 100); // revert quickly
        }
        lastLives = lives;

        // Pixel-scale
        const scaled = document.createElement('canvas');
        const sctx = scaled.getContext('2d');
        const scale = 3;
        scaled.width = barWidth * scale;
        scaled.height = barHeight * scale;
        sctx.imageSmoothingEnabled = false;
        sctx.drawImage(off, 0, 0, barWidth * scale, barHeight * scale);

        // Render to DOM
        livesBar.innerHTML = '';
        livesBar.style.display = 'inline-block';
        livesBar.style.width = `${barWidth * scale}px`;
        livesBar.style.height = `${barHeight * scale}px`;
        livesBar.style.border = '2px solid #333';
        livesBar.style.background = '#000';
        livesBar.style.imageRendering = 'pixelated';
        livesBar.appendChild(scaled);
    }
}

function showLevelTransition(nextLevel, keepScore = false) {
    // Stop any current animation while we show transition
    cancelAnimationFrame(window.animationId);

    const transitionDiv = document.createElement('div');
    transitionDiv.id = 'levelTransition';
    transitionDiv.innerHTML = `
        <div style="
            text-align: center;
            color: white;
            font-size: 36px;
            font-weight: bold;
            text-shadow: 0 0 10px rgba(255,255,255,0.6);
        ">
            LEVEL ${nextLevel}<br>
            <span style="font-size: 22px;">${levelConfig[nextLevel].name}</span>
        </div>
    `;
    transitionDiv.textContent = `Level ${nextLevel} Starting...`;
    document.body.appendChild(transitionDiv);
    setTimeout(() => {
        transitionDiv.remove();
        startGame(nextLevel, keepScore); //keep score!
    }, 2000);

    // Apply transition style
    Object.assign(transitionDiv.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        opacity: '0',
        zIndex: '9999',
        transition: 'opacity 0.8s ease',
    });

    transitionDiv.animate([
        { opacity: 0, transform: 'scale(0.9)' },
        { opacity: 1, transform: 'scale(1.05)', offset: 0.5 },
        { opacity: 0, transform: 'scale(1)' }
    ], {
        duration: 2000,
        easing: 'ease-in-out'
    });

    // Animate fade-in
    setTimeout(() => {
        transitionDiv.style.opacity = '1';
    }, 50);

    // Animate fade-out and start game
    setTimeout(() => {
        transitionDiv.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(transitionDiv);
            startGame(nextLevel);
        }, 800); // remove after fade-out finishes
    }, 1800); // show for ~1.8 seconds before fading out
}


function showWinScreen() {
    game.active = false;
    cancelAnimationFrame(animationId);

    // Remove any existing win screen
    const existing = document.getElementById('winContainer');
    if (existing) existing.remove();

    // Create win overlay
    const winContainer = document.createElement('div');
    winContainer.id = 'winContainer';
    Object.assign(winContainer.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        zIndex: '9999',
        fontFamily: '"Press Start 2P", monospace'
    });

    winContainer.innerHTML = `
        <h1 style="font-size: 32px; margin-bottom: 20px;">You Won the Game!</h1>
        <p style="font-size: 18px; margin-bottom: 40px;">Final Score: ${score}</p>
        <div>
            <button id="playAgainBtn" style="
                padding: 12px 24px;
                margin: 10px;
                background: darkgrey;
                color: black;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                transition: 0.3s;
            ">Play Again</button>
            <button id="mainMenuBtn" style="
                padding: 12px 24px;
                margin: 10px;
                background: #333;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                transition: 0.3s;
            ">Main Menu</button>
        </div>
    `;

    document.body.appendChild(winContainer);

    // Important: bind after it's added to DOM
    const playAgainBtn = document.getElementById('playAgainBtn');
    const mainMenuBtn = document.getElementById('mainMenuBtn');

    playAgainBtn.addEventListener('click', () => {
        winContainer.remove();
        cancelAnimationFrame(animationId);

        // Full reset before starting again
        grids.length = 0;
        invaderProjectiles.length = 0;
        projectiles.length = 0;
        particles.length = 0;
        delete window.mothership;
        score = 0;
        level = 1;

        setTimeout(() => startGame(level), 500);
    });

    mainMenuBtn.addEventListener('click', () => {
        winContainer.remove();
        cancelAnimationFrame(animationId);

        game.active = false;
        game.over = false;

        grids.length = 0;
        invaderProjectiles.length = 0;
        projectiles.length = 0;
        particles.length = 0;
        delete window.mothership;

        c.fillStyle = 'black';
        c.fillRect(0, 0, canvas.width, canvas.height);

        // Restore UI visibility
        startMenu.style.display = 'block';
        document.querySelector('#hud').style.display = 'none';
        restartTopBtn.style.display = 'none';
        backToMenuBtn.style.display = 'none';
        checkMobileControls();
    });
}

function showGameOverMenu() {
    // Prevent multiple overlays
    const existing = document.getElementById('gameOverOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'gameOverOverlay';
    overlay.innerHTML = `
        <h2 style="color:white; font-size:28px; margin-bottom:10px;">GAME OVER</h2>
        <p style="margin-bottom:20px;">Score: ${score}</p>
        <div>
            <button id="restartGame" style="
                padding: 10px 20px;
                margin: 10px;
                background: darkgrey;
                color: black;
                border: none;
                border-radius: 8px;
                font-family: 'Press Start 2P', monospace;
                cursor: pointer;
            ">Play Again</button>
            <button id="backMenu" style="
                padding: 10px 20px;
                margin: 10px;
                background: #222;
                color: white;
                border: none;
                border-radius: 8px;
                font-family: 'Press Start 2P', monospace;
                cursor: pointer;
            ">Main Menu</button>
        </div>
    `;

    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '9999',
        textAlign: 'center',
        fontFamily: '"Press Start 2P", monospace'
    });

    document.body.appendChild(overlay);

    //  Attach button handlers
    const restartBtn = document.getElementById('restartGame');
    const backBtn = document.getElementById('backMenu');

    restartBtn.addEventListener('click', () => {
        overlay.remove();
        cancelAnimationFrame(animationId);

        // Full reset
        grids.length = 0;
        projectiles.length = 0;
        invaderProjectiles.length = 0;
        particles.length = 0;
        delete window.mothership;

        score = 0;
        game.over = false;

        setTimeout(() => startGame(level), 500);
    });

    backBtn.addEventListener('click', () => {
        overlay.remove();
        cancelAnimationFrame(animationId);

        // Reset everything and go back to menu
        game.active = false;
        game.over = false;
        grids.length = 0;
        projectiles.length = 0;
        invaderProjectiles.length = 0;
        particles.length = 0;
        delete window.mothership;

        c.fillStyle = 'black';
        c.fillRect(0, 0, canvas.width, canvas.height);

        startMenu.style.display = 'block';
        document.querySelector('#hud').style.display = 'none';
        restartTopBtn.style.display = 'none';
        backToMenuBtn.style.display = 'none';

        checkMobileControls();
    });
}

addEventListener('keydown', (event) => {
    if (!game.active || game.over) return;
    const { key } = event;

    switch (key) {
        case 'a':
            keys.a.pressed = true;
            break;
        case 'd':
            keys.d.pressed = true;
            break;
        case ' ':
            event.preventDefault();
            keys.space.pressed = true;
            break;

        // 🔮 Special Powers
        case 's':
            activatePower('shield');
            playSound(sfx.shield, 0.8);
            break;
        case 'f':
            activatePower('rapidFire');
            break;
    }
});

addEventListener('keyup', (event) => {
    const { key } = event;

    switch (key) {
        case 'a':
            keys.a.pressed = false;
            break;
        case 'd':
            keys.d.pressed = false;
            break;
        case ' ':
            keys.space.pressed = false;
            break;
    }
});